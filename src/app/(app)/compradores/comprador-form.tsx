"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { editarDadosComprador } from "./actions";

interface CompradorFormProps {
  vendaId: string;
  initial: {
    nomeComprador: string;
    cpfCnpjComprador: string | null;
    telefoneComprador: string | null;
    emailComprador: string | null;
  };
  onClose: () => void;
  onSaved: (data: { nomeComprador: string; cpfCnpjComprador: string | null; telefoneComprador: string | null; emailComprador: string | null }) => void;
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

export function CompradorForm({ vendaId, initial, onClose, onSaved }: CompradorFormProps) {
  const [nome, setNome] = useState(initial.nomeComprador);
  const [cpf, setCpf] = useState(initial.cpfCnpjComprador ?? "");
  const [tel, setTel] = useState(initial.telefoneComprador ?? "");
  const [email, setEmail] = useState(initial.emailComprador ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) { setErro("Nome é obrigatório"); return; }
    setErro(null);
    startTransition(async () => {
      const r = await editarDadosComprador(vendaId, {
        nomeComprador: nome,
        cpfCnpjComprador: cpf,
        telefoneComprador: tel,
        emailComprador: email,
      });
      if (r.ok) {
        onSaved({
          nomeComprador: nome.trim(),
          cpfCnpjComprador: cpf.trim() || null,
          telefoneComprador: tel.replace(/\D/g, "") || null,
          emailComprador: email.trim() || null,
        });
        onClose();
      } else {
        setErro(r.error ?? "Erro ao salvar");
      }
    });
  }

  return (
    <Modal title="Editar comprador" subtitle="Atualize os dados de contato do comprador." onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {lbl("Nome *")}
          <input style={fs} value={nome} onChange={e => setNome(e.target.value)} onFocus={fv} onBlur={fb} placeholder="Nome completo" required />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {lbl("CPF / CNPJ")}
            <input style={fs} value={cpf} onChange={e => setCpf(e.target.value)} onFocus={fv} onBlur={fb} placeholder="000.000.000-00" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {lbl("Telefone (WhatsApp)")}
            <input style={fs} value={tel} onChange={e => setTel(e.target.value)} onFocus={fv} onBlur={fb} placeholder="(11) 99999-9999" />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {lbl("E-mail")}
          <input style={fs} type="email" value={email} onChange={e => setEmail(e.target.value)} onFocus={fv} onBlur={fb} placeholder="email@exemplo.com" />
        </div>

        {erro && (
          <div style={{ padding: "10px 14px", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "var(--radius-md)", fontSize: 13.5, color: "#dc2626", display: "flex", alignItems: "center", gap: 8 }}>
            <X size={14} /> {erro}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 4 }}>
          <button type="button" onClick={onClose} style={{ height: 40, padding: "0 18px", background: "transparent", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 500, color: "var(--fg-secondary)", cursor: "pointer" }}>
            Cancelar
          </button>
          <button type="submit" disabled={isPending} style={{ height: 40, padding: "0 20px", background: "var(--navy-700)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", gap: 7, opacity: isPending ? 0.7 : 1 }}>
            {isPending ? <span style={{ width: 15, height: 15, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block" }} /> : <Check size={15} />}
            {isPending ? "Salvando…" : "Salvar alterações"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
