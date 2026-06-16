"use client";

import { useState, useCallback } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { ArrowLeft, Edit2, Phone, Mail, Calendar, Briefcase, DollarSign, Check, AlertCircle, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { FuncionarioForm } from "../funcionario-form";
import { editarFuncionario, alocarFuncionario, registrarPagamento } from "../actions";
import { STATUS_FUNCIONARIO } from "@/lib/status";
import { fmtBRL, fmtDate } from "@/lib/format";
import type { FuncFormState } from "../actions";

interface ObraLite { id: string; nome: string; }

interface Alocacao {
  id: string; cargo: string | null; inicio: string | null; fim: string | null;
  obra: { id: string; nome: string; status: string };
}

interface Pagamento {
  id: string; valor: number; descricao: string | null; pagoEm: string | null;
  obra: ObraLite | null;
}

interface Funcionario {
  id: string; nome: string; cpf: string | null; cargo: string | null;
  telefone: string | null; email: string | null; salario: number | null;
  admissao: string | null; status: string;
  alocacoes: Alocacao[];
  pagamentos: Pagamento[];
}

const TABS = [
  { k: "alocacoes", l: "Alocações" },
  { k: "pagamentos", l: "Pagamentos" },
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

function AlocacaoModal({ funcionarioId, obras, onClose }: { funcionarioId: string; obras: ObraLite[]; onClose: () => void }) {
  const action = useCallback((prev: FuncFormState, fd: FormData) => alocarFuncionario(funcionarioId, prev, fd), [funcionarioId]);
  const [state, formAction] = useActionState(async (prev: FuncFormState, fd: FormData) => {
    const r = await action(prev, fd);
    if (!r) onClose();
    return r;
  }, null);

  const obraOpts = obras.map((o) => ({ value: o.id, label: o.nome }));

  return (
    <Modal title="Alocar em obra" subtitle="Vincule este funcionário a uma obra." onClose={onClose}
      footer={<><button type="button" onClick={onClose} style={{ height: 40, padding: "0 16px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "transparent", color: "var(--fg-secondary)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 14 }}>Cancelar</button><SubmitBtn label="Alocar" /></>}
    >
      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Select label="Obra *" name="obraId" options={obraOpts} placeholder="Selecione a obra" fullWidth required />
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {lbl("Função na obra")}
          <input name="cargo" placeholder="Ex.: Mestre de obras" style={fs} onFocus={fv} onBlur={fb} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>{lbl("Início")}<input name="inicio" type="date" style={fs} onFocus={fv} onBlur={fb} /></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>{lbl("Fim previsto")}<input name="fim" type="date" style={fs} onFocus={fv} onBlur={fb} /></div>
        </div>
        {state?.error && <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--danger-500)", background: "var(--danger-50)", border: "1px solid rgba(181,54,60,0.25)", borderRadius: "var(--radius-md)", padding: "9px 12px" }}><AlertCircle size={15} />{state.error}</div>}
      </form>
    </Modal>
  );
}

function PagamentoModal({ funcionarioId, obras, onClose }: { funcionarioId: string; obras: ObraLite[]; onClose: () => void }) {
  const action = useCallback((prev: FuncFormState, fd: FormData) => registrarPagamento(funcionarioId, prev, fd), [funcionarioId]);
  const [state, formAction] = useActionState(async (prev: FuncFormState, fd: FormData) => {
    const r = await action(prev, fd);
    if (!r) onClose();
    return r;
  }, null);

  const obraOpts = obras.map((o) => ({ value: o.id, label: o.nome }));

  return (
    <Modal title="Registrar pagamento" subtitle="Registre um pagamento a este funcionário." onClose={onClose}
      footer={<><button type="button" onClick={onClose} style={{ height: 40, padding: "0 16px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "transparent", color: "var(--fg-secondary)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 14 }}>Cancelar</button><SubmitBtn label="Registrar" /></>}
    >
      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {lbl("Valor (R$) *")}
          <input name="valor" type="number" step="0.01" min="0.01" required placeholder="1.200,00" style={fs} onFocus={fv} onBlur={fb} />
        </div>
        <Select label="Obra vinculada" name="obraId" options={obraOpts} placeholder="Nenhuma (geral)" fullWidth />
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {lbl("Descrição")}
          <input name="descricao" placeholder="Ex.: Adiantamento salarial" style={fs} onFocus={fv} onBlur={fb} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {lbl("Data do pagamento")}
          <input name="pagoEm" type="date" style={fs} onFocus={fv} onBlur={fb} />
        </div>
        {state?.error && <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--danger-500)", background: "var(--danger-50)", border: "1px solid rgba(181,54,60,0.25)", borderRadius: "var(--radius-md)", padding: "9px 12px" }}><AlertCircle size={15} />{state.error}</div>}
      </form>
    </Modal>
  );
}

const AV_COLORS = ["#1e3a5f","#b45309","#6d28d9","#047857","#b91c1c","#0369a1"];
function avatarBg(name: string) { let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff; return AV_COLORS[h % AV_COLORS.length]; }
function avatarInitials(name: string) { const p = name.trim().split(/\s+/); return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase(); }

export function FuncionarioDetail({ funcionario: f, obras }: { funcionario: Funcionario; obras: ObraLite[] }) {
  const [tab, setTab] = useState("alocacoes");
  const [showEdit, setShowEdit] = useState(false);
  const [showAloc, setShowAloc] = useState(false);
  const [showPag, setShowPag] = useState(false);

  const st = STATUS_FUNCIONARIO[f.status as keyof typeof STATUS_FUNCIONARIO] ?? STATUS_FUNCIONARIO.ativo;
  const totalPago = f.pagamentos.reduce((s, p) => s + p.valor, 0);

  const editAction = useCallback((prev: FuncFormState, fd: FormData) => editarFuncionario(f.id, prev, fd), [f.id]);

  const DET = ({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value: string }) => (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <Icon size={15} style={{ color: "var(--fg-muted)", marginTop: 2, flexShrink: 0 }} />
      <div>
        <p style={{ margin: 0, fontSize: 12, color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
        <p style={{ margin: 0, fontSize: 14.5, color: "var(--fg-primary)" }}>{value}</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Topbar */}
      <div style={{ padding: "20px 32px", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-surface)" }}>
        <Link href="/funcionarios" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13.5, color: "var(--fg-tertiary)", textDecoration: "none", marginBottom: 12 }}>
          <ArrowLeft size={14} /> Funcionários
        </Link>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <span style={{ width: 48, height: 48, borderRadius: "50%", background: avatarBg(f.nome), display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 500, flexShrink: 0 }}>{avatarInitials(f.nome)}</span>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 500, color: "var(--fg-primary)", letterSpacing: "-0.015em" }}>{f.nome}</h1>
                <Badge label={st.label} color={st.color} bg={st.bg} dot />
              </div>
              {f.cargo && <p style={{ margin: 0, fontSize: 14, color: "var(--fg-tertiary)" }}>{f.cargo}</p>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowAloc(true)} style={{ height: 38, padding: "0 14px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-surface)", color: "var(--fg-secondary)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 13.5, display: "inline-flex", alignItems: "center", gap: 6 }}><Plus size={14} /> Alocar</button>
            <button onClick={() => setShowPag(true)} style={{ height: 38, padding: "0 14px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-surface)", color: "var(--fg-secondary)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 13.5, display: "inline-flex", alignItems: "center", gap: 6 }}><DollarSign size={14} /> Pagamento</button>
            <button onClick={() => setShowEdit(true)} style={{ height: 38, padding: "0 14px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-surface)", color: "var(--fg-secondary)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 13.5, display: "inline-flex", alignItems: "center", gap: 6 }}><Edit2 size={14} /> Editar</button>
          </div>
        </div>
      </div>

      {/* Info cards */}
      <div style={{ padding: "24px 32px 0" }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
          {[
            { label: "Salário base", value: f.salario ? fmtBRL(f.salario) : "—" },
            { label: "Total pago", value: fmtBRL(totalPago) },
            { label: "Alocações", value: String(f.alocacoes.length) },
          ].map((k) => (
            <div key={k.label} style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "14px 20px", minWidth: 140 }}>
              <p style={{ margin: "0 0 4px", fontSize: 12, color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{k.label}</p>
              <p style={{ margin: 0, fontSize: 22, fontFamily: "var(--font-display)", color: "var(--fg-primary)" }}>{k.value}</p>
            </div>
          ))}
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "14px 20px", flex: 1, minWidth: 220, display: "flex", flexDirection: "column", gap: 8 }}>
            {f.telefone && <DET icon={Phone} label="Telefone" value={f.telefone} />}
            {f.email && <DET icon={Mail} label="E-mail" value={f.email} />}
            {f.admissao && <DET icon={Calendar} label="Admissão" value={fmtDate(f.admissao)} />}
            {f.cpf && <DET icon={Briefcase} label="CPF" value={f.cpf} />}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: "0 32px", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-surface)", display: "flex", gap: 0 }}>
        {TABS.map(({ k, l }) => {
          const on = tab === k;
          return <button key={k} onClick={() => setTab(k)} style={{ height: 46, padding: "0 18px", border: "none", borderBottom: `2px solid ${on ? "var(--navy-700)" : "transparent"}`, background: "transparent", color: on ? "var(--navy-700)" : "var(--fg-tertiary)", fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: on ? 600 : 400, cursor: "pointer" }}>{l}</button>;
        })}
      </div>

      <div style={{ padding: "24px 32px" }}>
        {tab === "alocacoes" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {f.alocacoes.length === 0 ? (
              <p style={{ textAlign: "center", padding: "40px 0", color: "var(--fg-tertiary)", fontSize: 15 }}>Nenhuma alocação registrada.</p>
            ) : f.alocacoes.map((a) => (
              <div key={a.id} style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <Link href={`/obras/${a.obra.id}`} style={{ fontWeight: 500, fontSize: 15, color: "var(--navy-700)", textDecoration: "none" }}>{a.obra.nome}</Link>
                  {a.cargo && <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--fg-tertiary)" }}>{a.cargo}</p>}
                </div>
                <p style={{ margin: 0, fontSize: 13, color: "var(--fg-muted)" }}>{fmtDate(a.inicio)} → {a.fim ? fmtDate(a.fim) : "em andamento"}</p>
              </div>
            ))}
          </div>
        )}

        {tab === "pagamentos" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {f.pagamentos.length === 0 ? (
              <p style={{ textAlign: "center", padding: "40px 0", color: "var(--fg-tertiary)", fontSize: 15 }}>Nenhum pagamento registrado.</p>
            ) : f.pagamentos.map((p) => (
              <div key={p.id} style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ margin: 0, fontSize: 14.5, fontWeight: 500, color: "var(--fg-primary)" }}>{p.descricao ?? "Pagamento"}</p>
                  {p.obra && <Link href={`/obras/${p.obra.id}`} style={{ fontSize: 13, color: "var(--navy-700)", textDecoration: "none" }}>{p.obra.nome}</Link>}
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ margin: "0 0 2px", fontSize: 18, fontFamily: "var(--font-display)", color: "var(--fg-primary)" }}>{fmtBRL(p.valor)}</p>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--fg-muted)" }}>{fmtDate(p.pagoEm)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showEdit && <FuncionarioForm action={editAction} onClose={() => setShowEdit(false)} isEdit initial={{ id: f.id, nome: f.nome, cpf: f.cpf, cargo: f.cargo, telefone: f.telefone, email: f.email, salario: f.salario, admissao: f.admissao, status: f.status }} />}
      {showAloc && <AlocacaoModal funcionarioId={f.id} obras={obras} onClose={() => setShowAloc(false)} />}
      {showPag && <PagamentoModal funcionarioId={f.id} obras={obras} onClose={() => setShowPag(false)} />}
    </>
  );
}
