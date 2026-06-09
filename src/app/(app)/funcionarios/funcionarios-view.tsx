"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Phone, Mail, ChevronRight, Search, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FuncionarioForm } from "./funcionario-form";
import { criarFuncionario } from "./actions";
import { STATUS_FUNCIONARIO } from "@/lib/status";
import { fmtBRL } from "@/lib/format";

interface ObraLite { id: string; nome: string; }
interface Funcionario {
  id: string; nome: string; cargo: string | null; telefone: string | null; email: string | null;
  salario: number | null; status: string;
  alocacoes: { obra: ObraLite; inicio: string | null }[];
  pagamentos: { valor: number }[];
}

export function FuncionariosView({ funcionarios }: { funcionarios: Funcionario[] }) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "ativo" | "inativo">("todos");
  const [showNew, setShowNew] = useState(false);
  const closeNew = useCallback(() => setShowNew(false), []);

  const filtered = funcionarios
    .filter((f) => filtro === "todos" || f.status === filtro)
    .filter((f) => !busca.trim() || f.nome.toLowerCase().includes(busca.toLowerCase()) || (f.cargo ?? "").toLowerCase().includes(busca.toLowerCase()));

  const ativos = funcionarios.filter((f) => f.status === "ativo").length;

  return (
    <>
      {/* Header */}
      <div style={{ padding: "22px 32px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-surface)" }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 500, color: "var(--fg-primary)", letterSpacing: "-0.015em", lineHeight: 1.1 }}>Funcionários</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--fg-tertiary)" }}>{funcionarios.length} cadastrado{funcionarios.length !== 1 ? "s" : ""} · {ativos} ativo{ativos !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => setShowNew(true)} style={{ height: 40, padding: "0 16px", background: "var(--navy-700)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 }}>
          <Plus size={16} /> Novo funcionário
        </button>
      </div>

      {/* Filtros + busca */}
      <div style={{ padding: "12px 32px", background: "var(--bg-surface)", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", justifyContent: "space-between" }}>
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
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar funcionário…" style={{ height: 38, padding: "0 12px 0 34px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-surface)", color: "var(--fg-primary)", fontFamily: "var(--font-sans)", fontSize: 14, width: 260, outline: "none" }} onFocus={(e) => { e.target.style.borderColor = "var(--border-focus)"; e.target.style.boxShadow = "var(--shadow-focus)"; }} onBlur={(e) => { e.target.style.borderColor = "var(--border-default)"; e.target.style.boxShadow = "none"; }} />
        </div>
      </div>

      {/* Cards */}
      <div style={{ padding: "24px 32px" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 24px" }}>
            <p style={{ color: "var(--fg-tertiary)", fontSize: 15 }}>Nenhum funcionário encontrado.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {filtered.map((f) => {
              const st = STATUS_FUNCIONARIO[f.status as keyof typeof STATUS_FUNCIONARIO] ?? STATUS_FUNCIONARIO.ativo;
              const totalPago = f.pagamentos.reduce((s, p) => s + p.valor, 0);
              const obraAtual = f.alocacoes[0]?.obra;

              return (
                <Link key={f.id} href={`/funcionarios/${f.id}`} style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-xs)", overflow: "hidden", display: "flex", flexDirection: "column", textDecoration: "none" }}>
                  <div style={{ padding: "18px 20px", flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
                      <div>
                        <h3 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 500, color: "var(--fg-primary)" }}>{f.nome}</h3>
                        {f.cargo && <p style={{ margin: "2px 0 0", fontSize: 13.5, color: "var(--fg-tertiary)" }}>{f.cargo}</p>}
                      </div>
                      <Badge label={st.label} color={st.color} bg={st.bg} dot />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 12, fontSize: 13, color: "var(--fg-tertiary)" }}>
                      {f.telefone && <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Phone size={12} />{f.telefone}</span>}
                      {f.email && <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Mail size={12} />{f.email}</span>}
                      {obraAtual && <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Briefcase size={12} />{obraAtual.nome}</span>}
                    </div>
                  </div>

                  <div style={{ padding: "10px 20px", borderTop: "1px solid var(--border-subtle)", background: "var(--ink-50)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>
                      {f.salario ? <span>Salário: <strong style={{ color: "var(--fg-secondary)" }}>{fmtBRL(f.salario)}</strong></span> : null}
                      {totalPago > 0 ? <span style={{ marginLeft: f.salario ? 12 : 0 }}>Pago: <strong style={{ color: "var(--fg-secondary)" }}>{fmtBRL(totalPago)}</strong></span> : null}
                    </div>
                    <ChevronRight size={15} style={{ color: "var(--fg-muted)" }} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {showNew && <FuncionarioForm action={criarFuncionario} onClose={closeNew} />}
    </>
  );
}
