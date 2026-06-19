"use client";

import { useState, useTransition } from "react";
import { createTenant, updatePlanoEmpresa, updateStatusEmpresa, deleteEmpresa } from "./actions";
import { fmtBRL } from "@/lib/format";

interface Empresa { id: string; nome: string; criadoEm: string; planoId: string | null; planoNome: string; preco: number; status: string; proximaCobranca: string | null; usuarios: number; obras: number; }
interface Plano { id: string; nome: string; preco: number; }

const STATUS_LABEL: Record<string, string> = { ativo: "Ativo", trial: "Trial", trial_expirado: "Trial expirado", inadimplente: "Inadimplente", cancelado: "Cancelado", sem_assinatura: "Sem plano" };
const STATUS_COLOR: Record<string, string> = { ativo: "#22C55E", trial: "#3B82F6", trial_expirado: "#f97316", inadimplente: "#EF4444", cancelado: "#64748B", sem_assinatura: "#64748B" };

const Th = ({ children }: { children: React.ReactNode }) => (
  <th style={{ padding: "10px 16px", fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase" as const, letterSpacing: "0.06em", background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.08)", textAlign: "left" as const, whiteSpace: "nowrap" as const }}>{children}</th>
);
const Td = ({ children, right }: { children: React.ReactNode; right?: boolean }) => (
  <td style={{ padding: "12px 16px", fontSize: 13.5, color: "#CBD5E1", borderBottom: "1px solid rgba(255,255,255,0.05)", verticalAlign: "middle", textAlign: right ? "right" : "left" as const }}>{children}</td>
);
const inp: React.CSSProperties = { height: 38, padding: "0 12px", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, background: "rgba(255,255,255,0.06)", color: "#F1F5F9", fontFamily: "var(--font-sans)", fontSize: 14, width: "100%", outline: "none" };
const selStyle: React.CSSProperties = { ...inp };
const Btn = ({ onClick, children, variant = "primary", small }: { onClick?: () => void; children: React.ReactNode; variant?: "primary" | "secondary" | "danger" | "ghost"; small?: boolean }) => {
  const colors = { primary: { bg: "#1e3a5f", c: "#F1F5F9", border: "#1e3a5f" }, secondary: { bg: "rgba(255,255,255,0.06)", c: "#CBD5E1", border: "rgba(255,255,255,0.12)" }, danger: { bg: "rgba(239,68,68,0.12)", c: "#EF4444", border: "rgba(239,68,68,0.3)" }, ghost: { bg: "transparent", c: "#64748B", border: "transparent" } };
  const s = colors[variant];
  return <button onClick={onClick} style={{ padding: small ? "5px 12px" : "9px 18px", background: s.bg, color: s.c, border: `1px solid ${s.border}`, borderRadius: 8, fontSize: small ? 12.5 : 14, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" as const }}>{children}</button>;
};

export function ClientesView({ empresas, planos }: { empresas: Empresa[]; planos: Plano[] }) {
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const ativas     = empresas.filter(e => e.status === "ativo").length;
  const trial      = empresas.filter(e => e.status === "trial").length;
  const expirados  = empresas.filter(e => e.status === "trial_expirado").length;

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await createTenant(fd);
      if (r.error) { setError(r.error); return; }
      setShowModal(false);
    });
  }

  function handleTrocarPlano(empresaId: string, planoAtualId: string | null) {
    const options = planos.map(p => `${p.nome} — ${fmtBRL(p.preco)}/mês`).join("\n");
    const nomePlanoAtual = planos.find(p => p.id === planoAtualId)?.nome ?? "nenhum";
    const idx = prompt(`Plano atual: ${nomePlanoAtual}\n\nEscolha o número do novo plano:\n${planos.map((p, i) => `${i + 1}. ${p.nome} — ${fmtBRL(p.preco)}/mês`).join("\n")}`);
    if (!idx) return;
    const chosen = planos[parseInt(idx) - 1];
    if (!chosen) return;
    startTransition(() => updatePlanoEmpresa(empresaId, chosen.id));
  }

  function handleStatus(empresaId: string, statusAtual: string) {
    const novoStatus = statusAtual === "ativo" ? "inadimplente"
      : statusAtual === "inadimplente" ? "ativo"
      : "ativo"; // trial, trial_expirado, cancelado → ativo
    const msg = `Alterar status para "${STATUS_LABEL[novoStatus]}"?`;
    if (!confirm(msg)) return;
    startTransition(() => updateStatusEmpresa(empresaId, novoStatus));
  }

  function handleDelete(empresaId: string, nome: string) {
    if (!confirm(`Excluir "${nome}" e todos os seus dados? Ação irreversível.`)) return;
    startTransition(() => deleteEmpresa(empresaId));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 500, color: "#F1F5F9" }}>Clientes</h1>
          <p style={{ margin: 0, fontSize: 14, color: "#64748B" }}>
            {empresas.length} empresas · {ativas} ativas · {trial} em teste
            {expirados > 0 && <span style={{ color: "#f97316", fontWeight: 600 }}> · {expirados} para converter 🔥</span>}
          </p>
        </div>
        <Btn onClick={() => setShowModal(true)}>+ Novo Cliente</Btn>
      </div>

      <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <Th>Empresa</Th><Th>Plano</Th><Th>Status</Th><Th>Usuários</Th><Th>Obras</Th><Th>Mensalidade</Th><Th>Próx. cobrança</Th><Th>Ações</Th>
              </tr>
            </thead>
            <tbody>
              {empresas.map(e => (
                <tr key={e.id}>
                  <Td><span style={{ fontWeight: 600, color: "#F1F5F9" }}>{e.nome}</span><br /><span style={{ fontSize: 11.5, color: "#475569" }}>{new Date(e.criadoEm).toLocaleDateString("pt-BR")}</span></Td>
                  <Td>{e.planoNome}</Td>
                  <Td>
                    <span style={{ fontSize: 12, fontWeight: 700, color: STATUS_COLOR[e.status] ?? "#64748B", background: "rgba(255,255,255,0.05)", padding: "3px 10px", borderRadius: 20 }}>
                      {STATUS_LABEL[e.status] ?? e.status}
                    </span>
                  </Td>
                  <Td right>{e.usuarios}</Td>
                  <Td right>{e.obras}</Td>
                  <Td right>{e.preco > 0 ? fmtBRL(e.preco) : "—"}</Td>
                  <Td>{e.proximaCobranca ? new Date(e.proximaCobranca).toLocaleDateString("pt-BR") : "—"}</Td>
                  <Td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Btn small variant="secondary" onClick={() => handleTrocarPlano(e.id, e.planoId)}>Plano</Btn>
                      <Btn small variant={e.status === "ativo" ? "ghost" : "secondary"} onClick={() => handleStatus(e.id, e.status)}>
                        {e.status === "ativo" ? "Suspender" : "Ativar"}
                      </Btn>
                      <Btn small variant="danger" onClick={() => handleDelete(e.id, e.nome)}>×</Btn>
                    </div>
                  </Td>
                </tr>
              ))}
              {empresas.length === 0 && (
                <tr><td colSpan={8} style={{ padding: "40px 16px", textAlign: "center", color: "#475569", fontSize: 14 }}>Nenhum cliente cadastrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal novo cliente */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowModal(false)}>
          <div style={{ background: "#0f1e30", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "32px", width: 480, maxWidth: "95vw" }} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: "0 0 24px", fontFamily: "var(--font-display)", fontSize: 20, color: "#F1F5F9" }}>Novo Cliente</h2>
            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#94A3B8", marginBottom: 5 }}>Nome da Empresa</label>
                <input name="nome" required style={inp} placeholder="Ex: Construtora Silva Ltda" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#94A3B8", marginBottom: 5 }}>Nome do Proprietário</label>
                  <input name="propNome" required style={inp} placeholder="João Silva" />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#94A3B8", marginBottom: 5 }}>E-mail</label>
                  <input name="email" type="email" required style={inp} placeholder="joao@empresa.com" />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#94A3B8", marginBottom: 5 }}>Senha provisória</label>
                  <input name="senha" type="password" required minLength={6} style={inp} placeholder="min. 6 caracteres" />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#94A3B8", marginBottom: 5 }}>Status inicial</label>
                  <select name="status" style={selStyle}>
                    <option value="trial">Trial (14 dias)</option>
                    <option value="ativo">Ativo</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#94A3B8", marginBottom: 5 }}>Plano</label>
                <select name="planoId" required style={selStyle}>
                  <option value="">Selecione um plano</option>
                  {planos.map(p => <option key={p.id} value={p.id}>{p.nome} — {fmtBRL(p.preco)}/mês</option>)}
                </select>
              </div>
              {error && <p style={{ margin: 0, fontSize: 13, color: "#EF4444", background: "rgba(239,68,68,0.1)", padding: "10px 14px", borderRadius: 8 }}>{error}</p>}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
                <Btn variant="ghost" onClick={() => setShowModal(false)}>Cancelar</Btn>
                <Btn>{pending ? "Criando…" : "Criar Cliente"}</Btn>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
