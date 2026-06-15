"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Check, AlertCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import type { VendaFormState } from "./actions";

interface TerrenoLite { id: string; nome: string; cidade: string; }
interface VendaFormProps {
  onClose: () => void;
  action: (prev: VendaFormState, fd: FormData) => Promise<VendaFormState>;
  terrenos: TerrenoLite[];
}

const fs: React.CSSProperties = {
  height: 40, padding: "0 12px", border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-md)", background: "var(--bg-surface)",
  color: "var(--fg-primary)", fontFamily: "var(--font-sans)", fontSize: 14.5, width: "100%", outline: "none",
};
const lbl = (text: string) => (
  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-secondary)", fontFamily: "var(--font-sans)" }}>{text}</span>
);
const fv = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = "var(--border-focus)"; e.target.style.boxShadow = "var(--shadow-focus)"; };
const fb = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = "var(--border-default)"; e.target.style.boxShadow = "none"; };

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} style={{ height: 40, padding: "0 20px", background: "var(--navy-700)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600, cursor: pending ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", gap: 7, opacity: pending ? 0.7 : 1 }}>
      {pending ? <span style={{ width: 15, height: 15, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block" }} /> : <Check size={15} />}
      {pending ? "Registrando…" : "Registrar venda"}
    </button>
  );
}

export function VendaForm({ onClose, action, terrenos }: VendaFormProps) {
  const [state, formAction] = useActionState(
    async (prev: VendaFormState, fd: FormData) => {
      const r = await action(prev, fd);
      if (!r) onClose();
      return r;
    },
    null
  );

  const terrenoOpts = terrenos.map((t) => ({ value: t.id, label: `${t.nome} — ${t.cidade}` }));

  return (
    <Modal
      title="Registrar venda"
      subtitle="Vincule o terreno ao comprador e gere o parcelamento."
      onClose={onClose}
    >
      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Select label="Terreno *" name="terrenoId" options={terrenoOpts} placeholder="Selecione o terreno" fullWidth required />

        <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 14 }}>
          <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 600, color: "var(--fg-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Comprador</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>{lbl("Nome *")}<input name="nomeComprador" required placeholder="Nome completo" style={fs} onFocus={fv} onBlur={fb} /></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>{lbl("CPF / CNPJ")}<input name="cpfCnpjComprador" placeholder="000.000.000-00" style={fs} onFocus={fv} onBlur={fb} /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>{lbl("Telefone")}<input name="telefoneComprador" placeholder="(11) 99999-9999" style={fs} onFocus={fv} onBlur={fb} /></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>{lbl("E-mail")}<input name="emailComprador" type="email" placeholder="comprador@email.com" style={fs} onFocus={fv} onBlur={fb} /></div>
            </div>
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 14 }}>
          <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 600, color: "var(--fg-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Financeiro</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>{lbl("Valor total (R$) *")}<input name="valorTotal" type="number" step="0.01" min="1" required placeholder="250.000,00" style={fs} onFocus={fv} onBlur={fb} /></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>{lbl("Entrada (R$)")}<input name="entrada" type="number" step="0.01" min="0" defaultValue="0" style={fs} onFocus={fv} onBlur={fb} /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>{lbl("Parcelas")}<input name="numeroParcelas" type="number" min="1" max="360" defaultValue="12" style={fs} onFocus={fv} onBlur={fb} /></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>{lbl("Dia vencimento")}<input name="diaVencimento" type="number" min="1" max="28" defaultValue="5" style={fs} onFocus={fv} onBlur={fb} /></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>{lbl("Data contrato")}<input name="dataContrato" type="date" style={fs} onFocus={fv} onBlur={fb} /></div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {lbl("Observações")}
          <input name="observacoes" placeholder="Anotações sobre a negociação…" style={fs} onFocus={fv} onBlur={fb} />
        </div>

        {state?.error && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--danger-500)", background: "var(--danger-50)", border: "1px solid rgba(181,54,60,0.25)", borderRadius: "var(--radius-md)", padding: "9px 12px" }}>
            <AlertCircle size={15} />{state.error}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 16, borderTop: "1px solid var(--border-subtle)", marginTop: 4 }}>
          <button type="button" onClick={onClose} style={{ height: 40, padding: "0 16px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "transparent", color: "var(--fg-secondary)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 14 }}>
            Cancelar
          </button>
          <SubmitBtn />
        </div>
      </form>
    </Modal>
  );
}
