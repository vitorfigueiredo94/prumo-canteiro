"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FuncionarioForm } from "./funcionario-form";
import { criarFuncionario } from "./actions";
import { STATUS_FUNCIONARIO } from "@/lib/status";
import { fmtBRL, fmtBRLshort } from "@/lib/format";

interface ObraLite { id: string; nome: string; }
interface Funcionario {
  id: string; nome: string; cargo: string | null; telefone: string | null; email: string | null;
  salario: number | null; status: string;
  alocacoes: { obra: ObraLite; inicio: string | null }[];
  pagamentos: { valor: number }[];
}

// avatar helpers
const AV_COLORS = ["#1e3a5f", "#b45309", "#6d28d9", "#047857", "#b91c1c", "#0369a1"];
function avatarBg(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return AV_COLORS[h % AV_COLORS.length];
}
function avatarInitials(name: string) {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase();
}

const Th = ({ children, right }: { children?: React.ReactNode; right?: boolean }) => (
  <th style={{ padding: "10px 14px", fontSize: 11.5, fontWeight: 700, color: "var(--fg-tertiary)", textTransform: "uppercase" as const, letterSpacing: "0.06em", background: "var(--ink-50)", borderBottom: "1px solid var(--border-subtle)", whiteSpace: "nowrap" as const, textAlign: right ? "right" : "left" as const }}>
    {children}
  </th>
);
const Td = ({ children, right }: { children?: React.ReactNode; right?: boolean }) => (
  <td style={{ padding: "13px 14px", fontSize: 14, color: "var(--fg-primary)", borderBottom: "1px solid var(--border-subtle)", verticalAlign: "middle", textAlign: right ? "right" : "left" as const }}>
    {children}
  </td>
);

export function FuncionariosView({ funcionarios }: { funcionarios: Funcionario[] }) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "ativo" | "inativo">("todos");
  const [showNew, setShowNew] = useState(false);
  const closeNew = useCallback(() => setShowNew(false), []);

  const filtered = funcionarios
    .filter((f) => filtro === "todos" || f.status === filtro)
    .filter((f) => !busca.trim() || f.nome.toLowerCase().includes(busca.toLowerCase()) || (f.cargo ?? "").toLowerCase().includes(busca.toLowerCase()));

  const ativos = funcionarios.filter((f) => f.status === "ativo");
  const folhaMensal = ativos.reduce((s, f) => s + (f.salario ?? 0), 0);
  const totalAlocacoes = funcionarios.reduce((s, f) => s + f.alocacoes.length, 0);

  return (
    <>
      {/* Header */}
      <div style={{ padding: "22px 32px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-surface)" }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 500, color: "var(--fg-primary)", letterSpacing: "-0.015em", lineHeight: 1.1 }}>Funcionários</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--fg-tertiary)" }}>{ativos.length} ativo{ativos.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => setShowNew(true)} style={{ height: 40, padding: "0 16px", background: "var(--navy-700)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 }}>
          <Plus size={16} /> Novo funcionário
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: "24px 32px" }}>
        {/* KPI cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Funcionários ativos", value: String(ativos.length), sub: `${funcionarios.length} no cadastro` },
            { label: "Folha mensal estimada", value: fmtBRLshort(folhaMensal), sub: "salários ativos" },
            { label: "Alocações", value: String(totalAlocacoes), sub: "vínculos com obras" },
          ].map(({ label, value, sub }) => (
            <div key={label} style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "16px 20px", boxShadow: "var(--shadow-xs)" }}>
              <div style={{ fontSize: 11.5, color: "var(--fg-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>{label}</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 400, color: "var(--fg-primary)", letterSpacing: "-0.02em", marginTop: 4 }}>{value}</div>
              <div style={{ fontSize: 12.5, color: "var(--fg-tertiary)", marginTop: 2 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Filtros + busca */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 8 }}>
            {(["todos", "ativo", "inativo"] as const).map((k) => {
              const on = filtro === k;
              const l = k === "todos" ? "Todos" : k === "ativo" ? "Ativos" : "Inativos";
              return (
                <button key={k} onClick={() => setFiltro(k)} style={{ padding: "7px 14px", borderRadius: "var(--radius-full)", fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)", border: `1px solid ${on ? "var(--navy-600)" : "var(--border-default)"}`, background: on ? "var(--navy-700)" : "var(--bg-surface)", color: on ? "#fff" : "var(--fg-secondary)" }}>
                  {l}
                </button>
              );
            })}
          </div>
          <div style={{ position: "relative" }}>
            <Search size={15} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--fg-muted)", pointerEvents: "none" }} />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou função…" style={{ height: 38, padding: "0 12px 0 34px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-surface)", color: "var(--fg-primary)", fontFamily: "var(--font-sans)", fontSize: 14, width: 280, outline: "none" }} onFocus={(e) => { e.target.style.borderColor = "var(--border-focus)"; e.target.style.boxShadow = "var(--shadow-focus)"; }} onBlur={(e) => { e.target.style.borderColor = "var(--border-default)"; e.target.style.boxShadow = "none"; }} />
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 24px" }}>
            <p style={{ color: "var(--fg-tertiary)", fontSize: 15 }}>Nenhum funcionário encontrado.</p>
          </div>
        ) : (
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-xs)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <Th>Funcionário</Th>
                    <Th>Remuneração</Th>
                    <Th>Obras</Th>
                    <Th right>Custo mensal</Th>
                    <Th>Status</Th>
                    <Th right></Th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((f) => {
                    const st = STATUS_FUNCIONARIO[f.status as keyof typeof STATUS_FUNCIONARIO] ?? STATUS_FUNCIONARIO.ativo;
                    return (
                      <tr key={f.id}>
                        <Td>
                          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                            <div style={{ width: 38, height: 38, borderRadius: "50%", background: avatarBg(f.nome), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                              {avatarInitials(f.nome)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 14.5 }}>{f.nome}</div>
                              <div style={{ fontSize: 12.5, color: "var(--fg-tertiary)" }}>{f.cargo ?? "—"}</div>
                            </div>
                          </div>
                        </Td>
                        <Td>
                          {f.salario ? (
                            <div>
                              <div style={{ fontWeight: 600 }}>{fmtBRL(f.salario)}</div>
                              <div style={{ fontSize: 12.5, color: "var(--fg-tertiary)" }}>salário/mês</div>
                            </div>
                          ) : (
                            <span style={{ color: "var(--fg-muted)", fontSize: 13 }}>—</span>
                          )}
                        </Td>
                        <Td>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {f.alocacoes.length === 0 ? (
                              <span style={{ color: "var(--fg-muted)", fontSize: 13 }}>—</span>
                            ) : (
                              f.alocacoes.map((a) => (
                                <Link key={a.obra.id} href={`/obras/${a.obra.id}`} onClick={(e) => e.stopPropagation()} style={{ padding: "3px 10px", borderRadius: "var(--radius-full)", fontSize: 12.5, fontWeight: 600, background: "var(--navy-50)", color: "var(--navy-700)", textDecoration: "none", border: "1px solid var(--border-subtle)" }}>
                                  {a.obra.nome}
                                </Link>
                              ))
                            )}
                          </div>
                        </Td>
                        <Td right>
                          <strong style={{ fontVariantNumeric: "tabular-nums" }}>{f.salario ? fmtBRL(f.salario) : "—"}</strong>
                        </Td>
                        <Td>
                          <Badge label={st.label} color={st.color} bg={st.bg} dot />
                        </Td>
                        <Td right>
                          <div style={{ display: "inline-flex", gap: 8 }}>
                            <Link href={`/funcionarios/${f.id}`} style={{ height: 32, padding: "0 12px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "transparent", color: "var(--fg-secondary)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 5, textDecoration: "none" }}>
                              <FileText size={13} /> Relatório
                            </Link>
                            <Link href={`/funcionarios/${f.id}`} style={{ height: 32, padding: "0 12px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "transparent", color: "var(--fg-secondary)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 5, textDecoration: "none" }}>
                              Pagar
                            </Link>
                          </div>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showNew && <FuncionarioForm action={criarFuncionario} onClose={closeNew} />}
    </>
  );
}
