"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Check, AlertCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import type { FuncFormState } from "./actions";

interface FuncInitial {
  id: string; nome: string; cpf: string | null; cargo: string | null;
  telefone: string | null; email: string | null; salario: number | null;
  admissao: string | null; status: string;
}

interface FuncFormProps {
  onClose: () => void;
  action: (prev: FuncFormState, fd: FormData) => Promise<FuncFormState>;
  initial?: FuncInitial;
  isEdit?: boolean;
}

const STATUS_OPTIONS = [
  { value: "ativo", label: "Ativo" },
  { value: "inativo", label: "Inativo" },
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
      {pending ? <span style={{ width: 15, height: 15, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "cnt-spin 0.8s linear infinite" }} /> : <Check size={15} />}
      {pending ? "Salvando…" : label}
    </button>
  );
}

export function FuncionarioForm({ onClose, action, initial, isEdit = false }: FuncFormProps) {
  const [state, formAction] = useActionState(
    async (prev: FuncFormState, fd: FormData) => {
      const r = await action(prev, fd);
      if (!r) onClose();
      return r;
    },
    null
  );

  return (
    <Modal
      title={isEdit ? "Editar funcionário" : "Novo funcionário"}
      subtitle={isEdit ? "Atualize os dados do funcionário." : "Adicione um funcionário à equipe."}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} style={{ height: 40, padding: "0 16px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "transparent", color: "var(--fg-secondary)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 14 }}>
            Cancelar
          </button>
          <SubmitBtn label={isEdit ? "Salvar" : "Cadastrar"} />
        </>
      }
    >
      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {lbl("Nome completo *")}
            <input name="nome" required defaultValue={initial?.nome} placeholder="Ex.: João da Silva" style={fs} onFocus={fv} onBlur={fb} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {lbl("CPF")}
            <input name="cpf" defaultValue={initial?.cpf ?? ""} placeholder="000.000.000-00" style={fs} onFocus={fv} onBlur={fb} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {lbl("Cargo")}
            <input name="cargo" defaultValue={initial?.cargo ?? ""} placeholder="Ex.: Pedreiro" style={fs} onFocus={fv} onBlur={fb} />
          </div>
          <Select label="Situação" name="status" options={STATUS_OPTIONS} defaultValue={initial?.status ?? "ativo"} fullWidth />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {lbl("Telefone")}
            <input name="telefone" defaultValue={initial?.telefone ?? ""} placeholder="(11) 99999-9999" style={fs} onFocus={fv} onBlur={fb} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {lbl("E-mail")}
            <input name="email" type="email" defaultValue={initial?.email ?? ""} placeholder="nome@email.com" style={fs} onFocus={fv} onBlur={fb} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {lbl("Salário base (R$)")}
            <input name="salario" type="number" step="0.01" min="0" defaultValue={initial?.salario ?? ""} placeholder="3.500,00" style={fs} onFocus={fv} onBlur={fb} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {lbl("Data de admissão")}
            <input name="admissao" type="date" defaultValue={initial?.admissao?.split("T")[0] ?? ""} style={fs} onFocus={fv} onBlur={fb} />
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
