"use client";

import { useState, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Check, AlertCircle, Upload } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import type { NotaFormState } from "./actions";
import { parseNFeXml } from "./actions";

interface ObraLite { id: string; nome: string; }
interface NotaInitial {
  id: string; obraId: string; categoria: string; valor: number;
  fornecedor: string | null; numero: string | null; descricao: string | null;
  emitidaEm: string | null; status: string;
}

interface NotaFormProps {
  onClose: () => void;
  action: (prev: NotaFormState, fd: FormData) => Promise<NotaFormState>;
  obras: ObraLite[];
  initial?: NotaInitial;
  isEdit?: boolean;
}

const CATEGORIA_OPTIONS = [
  { value: "material", label: "Material" },
  { value: "mao_obra", label: "Mão de obra" },
  { value: "servicos", label: "Serviços" },
  { value: "equipamentos", label: "Equipamentos" },
  { value: "outros", label: "Outros" },
];

const STATUS_OPTIONS = [
  { value: "pendente", label: "Pendente" },
  { value: "em_revisao", label: "Em revisão" },
  { value: "confirmada", label: "Confirmada" },
  { value: "cancelada", label: "Cancelada" },
];

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

function SubmitBtn({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} style={{ height: 40, padding: "0 20px", background: "var(--navy-700)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600, cursor: pending ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", gap: 7, opacity: pending ? 0.7 : 1 }}>
      {pending ? <span style={{ width: 15, height: 15, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block" }} /> : <Check size={15} />}
      {pending ? "Salvando…" : label}
    </button>
  );
}

export function NotaForm({ onClose, action, obras, initial, isEdit = false }: NotaFormProps) {
  const [parsed, setParsed] = useState<Record<string, string> | null>(null);
  const [xmlLoading, setXmlLoading] = useState(false);

  const [state, formAction] = useActionState(
    async (prev: NotaFormState, fd: FormData) => {
      const r = await action(prev, fd);
      if (!r) onClose();
      return r;
    },
    null
  );

  const obraOpts = obras.map((o) => ({ value: o.id, label: o.nome }));

  const handleXml = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setXmlLoading(true);
    const fd = new FormData();
    fd.set("xml", file);
    const result = await parseNFeXml(null, fd) as any;
    if (result?.parsed) setParsed(result.parsed);
    setXmlLoading(false);
  };

  return (
    <Modal
      title={isEdit ? "Editar NF" : "Lançar NF"}
      subtitle={isEdit ? "Atualize os dados da nota fiscal." : "Registre manualmente ou importe via XML."}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} style={{ height: 40, padding: "0 16px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "transparent", color: "var(--fg-secondary)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 14 }}>
            Cancelar
          </button>
          <SubmitBtn label={isEdit ? "Salvar" : "Lançar nota"} />
        </>
      }
    >
      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {!isEdit && (
          <div style={{ background: "var(--navy-50)", border: "1px dashed var(--navy-200)", borderRadius: "var(--radius-md)", padding: "14px 16px" }}>
            <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: "var(--navy-700)" }}>Importar XML NF-e (opcional)</p>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 34, padding: "0 14px", background: "var(--navy-700)", color: "#fff", borderRadius: "var(--radius-md)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              <Upload size={14} /> {xmlLoading ? "Lendo…" : "Selecionar XML"}
              <input type="file" accept=".xml,application/xml,text/xml" style={{ display: "none" }} onChange={handleXml} />
            </label>
            {parsed && <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--navy-700)" }}>Campos preenchidos a partir do XML — revise antes de salvar.</p>}
          </div>
        )}

        <Select label="Obra *" name="obraId" options={obraOpts} defaultValue={parsed?.obraId ?? initial?.obraId} placeholder="Selecione a obra" fullWidth required />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Select label="Categoria *" name="categoria" options={CATEGORIA_OPTIONS} defaultValue={initial?.categoria ?? "material"} fullWidth />
          <Select label="Situação" name="status" options={STATUS_OPTIONS} defaultValue={initial?.status ?? "pendente"} fullWidth />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {lbl("Fornecedor")}
            <input key={parsed?.fornecedor} name="fornecedor" defaultValue={parsed?.fornecedor ?? initial?.fornecedor ?? ""} placeholder="Nome do fornecedor" style={fs} onFocus={fv} onBlur={fb} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {lbl("Número NF-e")}
            <input key={parsed?.numero} name="numero" defaultValue={parsed?.numero ?? initial?.numero ?? ""} placeholder="000000000" style={fs} onFocus={fv} onBlur={fb} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {lbl("Valor (R$) *")}
            <input key={parsed?.valor} name="valor" type="number" step="0.01" min="0.01" required defaultValue={parsed?.valor ?? initial?.valor ?? ""} placeholder="0,00" style={fs} onFocus={fv} onBlur={fb} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {lbl("Data de emissão")}
            <input key={parsed?.emitidaEm} name="emitidaEm" type="date" defaultValue={parsed?.emitidaEm ?? initial?.emitidaEm?.split("T")[0] ?? ""} style={fs} onFocus={fv} onBlur={fb} />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {lbl("Descrição / histórico")}
          <input name="descricao" defaultValue={initial?.descricao ?? ""} placeholder="Ex.: Cimento 50kg (200 sacos)" style={fs} onFocus={fv} onBlur={fb} />
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
