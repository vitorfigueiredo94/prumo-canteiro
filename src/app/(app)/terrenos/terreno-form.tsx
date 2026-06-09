"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Check, AlertCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import type { TerrenoFormState } from "./actions";

interface Terreno {
  id: string;
  nome: string;
  numero: string | null;
  endereco: string | null;
  cidade: string;
  area: number;
  status: string;
  aquisicao: Date | null;
  valorCompra: number | null;
}

interface TerrenoFormProps {
  onClose: () => void;
  action: (prev: TerrenoFormState, fd: FormData) => Promise<TerrenoFormState>;
  initial?: Terreno;
  isEdit?: boolean;
}

const STATUS_OPTIONS = [
  { value: "disponivel", label: "Disponível" },
  { value: "em_obra", label: "Em obra" },
  { value: "vendido", label: "Vendido" },
];

const fieldStyle = {
  height: 40,
  padding: "0 12px",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-md)",
  background: "var(--bg-surface)",
  color: "var(--fg-primary)",
  fontFamily: "var(--font-sans)",
  fontSize: 14.5,
  width: "100%",
  outline: "none",
} as const;

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-secondary)", fontFamily: "var(--font-sans)" }}>
      {children}
    </span>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      style={{
        height: 40,
        padding: "0 20px",
        background: "var(--navy-700)",
        color: "#fff",
        border: "none",
        borderRadius: "var(--radius-md)",
        fontFamily: "var(--font-sans)",
        fontSize: 14,
        fontWeight: 600,
        cursor: pending ? "not-allowed" : "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        opacity: pending ? 0.7 : 1,
      }}
    >
      {pending ? (
        <span className="cnt-spin" style={{ width: 15, height: 15, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block" }} />
      ) : (
        <Check size={15} />
      )}
      {pending ? "Salvando…" : label}
    </button>
  );
}

export function TerrenoForm({ onClose, action, initial, isEdit = false }: TerrenoFormProps) {
  const [state, formAction] = useActionState(
    async (prev: TerrenoFormState, fd: FormData) => {
      const result = await action(prev, fd);
      if (!result) onClose();
      return result;
    },
    null
  );

  const focus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "var(--border-focus)";
    e.target.style.boxShadow = "var(--shadow-focus)";
  };
  const blur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "var(--border-default)";
    e.target.style.boxShadow = "none";
  };

  return (
    <Modal
      title={isEdit ? "Editar terreno" : "Novo terreno"}
      subtitle={isEdit ? "Altere os dados do terreno." : "Cadastre um terreno no banco de terras."}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            style={{
              height: 40,
              padding: "0 16px",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              background: "transparent",
              color: "var(--fg-secondary)",
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
              fontSize: 14,
            }}
          >
            Cancelar
          </button>
          <SubmitButton label={isEdit ? "Salvar alterações" : "Cadastrar terreno"} />
        </>
      }
    >
      <form id="terreno-form" action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <FieldLabel>Nome do terreno *</FieldLabel>
          <input name="nome" required defaultValue={initial?.nome} placeholder="Ex.: Lote 01 — Residencial Pinheiros" style={fieldStyle} onFocus={focus} onBlur={blur} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <FieldLabel>Número / Lote</FieldLabel>
            <input name="numero" defaultValue={initial?.numero ?? ""} placeholder="LT-01" style={fieldStyle} onFocus={focus} onBlur={blur} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <FieldLabel>Cidade *</FieldLabel>
            <input name="cidade" required defaultValue={initial?.cidade} placeholder="São Paulo" style={fieldStyle} onFocus={focus} onBlur={blur} />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <FieldLabel>Endereço</FieldLabel>
          <input name="endereco" defaultValue={initial?.endereco ?? ""} placeholder="Rua das Acácias, 100" style={fieldStyle} onFocus={focus} onBlur={blur} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <FieldLabel>Área (m²) *</FieldLabel>
            <input name="area" type="number" step="0.01" min="0.01" required defaultValue={initial?.area} placeholder="360,00" style={fieldStyle} onFocus={focus} onBlur={blur} />
          </div>
          <Select
            label="Status"
            name="status"
            options={STATUS_OPTIONS}
            defaultValue={initial?.status ?? "disponivel"}
            fullWidth
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <FieldLabel>Data de aquisição</FieldLabel>
            <input
              name="aquisicao"
              type="date"
              defaultValue={initial?.aquisicao ? new Date(initial.aquisicao).toISOString().split("T")[0] : ""}
              style={fieldStyle}
              onFocus={focus}
              onBlur={blur}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <FieldLabel>Valor de compra (R$)</FieldLabel>
            <input
              name="valorCompra"
              type="number"
              step="0.01"
              min="0"
              defaultValue={initial?.valorCompra ?? ""}
              placeholder="280000,00"
              style={fieldStyle}
              onFocus={focus}
              onBlur={blur}
            />
          </div>
        </div>

        {state?.error && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--danger-500)", background: "var(--danger-50)", border: "1px solid rgba(181,54,60,0.25)", borderRadius: "var(--radius-md)", padding: "9px 12px" }}>
            <AlertCircle size={15} />
            {state.error}
          </div>
        )}
      </form>
    </Modal>
  );
}
