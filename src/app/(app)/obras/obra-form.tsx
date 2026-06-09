"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Check, AlertCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import type { ObraFormState } from "./actions";

interface Terreno { id: string; nome: string; cidade: string; }
interface ObraInitial {
  id: string; nome: string; terrenoId: string; orcamento: number;
  status: string; inicio: string | null; prazo: string | null;
  responsavel: string | null; progresso: number;
}

interface ObraFormProps {
  onClose: () => void;
  action: (prev: ObraFormState, fd: FormData) => Promise<ObraFormState>;
  terrenos: Terreno[];
  initial?: ObraInitial;
  isEdit?: boolean;
}

const STATUS_OPTIONS = [
  { value: "planejamento", label: "Planejamento" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "parada", label: "Parada" },
  { value: "concluida", label: "Concluída" },
];

const fs: React.CSSProperties = {
  height: 40, padding: "0 12px", border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-md)", background: "var(--bg-surface)",
  color: "var(--fg-primary)", fontFamily: "var(--font-sans)", fontSize: 14.5, width: "100%", outline: "none",
};
const lbl = (children: React.ReactNode) => (
  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-secondary)", fontFamily: "var(--font-sans)" }}>{children}</span>
);
const fv = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = "var(--border-focus)"; e.target.style.boxShadow = "var(--shadow-focus)"; };
const fb = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = "var(--border-default)"; e.target.style.boxShadow = "none"; };

function SubmitBtn({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} style={{ height: 40, padding: "0 20px", background: "var(--navy-700)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600, cursor: pending ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", gap: 7, opacity: pending ? 0.7 : 1 }}>
      {pending ? <span className="cnt-spin" style={{ width: 15, height: 15, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block" }} /> : <Check size={15} />}
      {pending ? "Salvando…" : label}
    </button>
  );
}

export function ObraForm({ onClose, action, terrenos, initial, isEdit = false }: ObraFormProps) {
  const [state, formAction] = useActionState(
    async (prev: ObraFormState, fd: FormData) => {
      const r = await action(prev, fd);
      if (!r) onClose();
      return r;
    },
    null
  );

  const terrenoOpts = terrenos.map((t) => ({ value: t.id, label: `${t.nome} — ${t.cidade}` }));

  return (
    <Modal
      title={isEdit ? "Editar obra" : "Nova obra"}
      subtitle={isEdit ? "Altere os dados da obra." : "Cadastre e vincule a um terreno."}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} style={{ height: 40, padding: "0 16px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "transparent", color: "var(--fg-secondary)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 14 }}>
            Cancelar
          </button>
          <SubmitBtn label={isEdit ? "Salvar" : "Cadastrar obra"} />
        </>
      }
    >
      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {lbl("Nome da obra *")}
          <input name="nome" required defaultValue={initial?.nome} placeholder="Ex.: Residência Aurora" style={fs} onFocus={fv} onBlur={fb} />
        </div>

        <Select label="Terreno *" name="terrenoId" options={terrenoOpts} defaultValue={initial?.terrenoId} placeholder="Selecione o terreno" fullWidth required />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {lbl("Orçamento previsto (R$) *")}
            <input name="orcamento" type="number" step="0.01" min="0.01" required defaultValue={initial?.orcamento} placeholder="380000,00" style={fs} onFocus={fv} onBlur={fb} />
          </div>
          <Select label="Situação" name="status" options={STATUS_OPTIONS} defaultValue={initial?.status ?? "planejamento"} fullWidth />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {lbl("Início")}
            <input name="inicio" type="date" defaultValue={initial?.inicio?.split("T")[0] ?? ""} style={fs} onFocus={fv} onBlur={fb} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {lbl("Prazo final")}
            <input name="prazo" type="date" defaultValue={initial?.prazo?.split("T")[0] ?? ""} style={fs} onFocus={fv} onBlur={fb} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {lbl("Responsável")}
            <input name="responsavel" defaultValue={initial?.responsavel ?? ""} placeholder="Ex.: Eng. Marina Castro" style={fs} onFocus={fv} onBlur={fb} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {lbl("Progresso físico (%)")}
            <input name="progresso" type="number" min="0" max="100" defaultValue={initial?.progresso ?? 0} style={fs} onFocus={fv} onBlur={fb} />
          </div>
        </div>

        {state?.error && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--danger-500)", background: "var(--danger-50)", border: "1px solid rgba(181,54,60,0.25)", borderRadius: "var(--radius-md)", padding: "9px 12px" }}>
            <AlertCircle size={15} />{state.error}
          </div>
        )}
      </form>
    </Modal>
  );
}
