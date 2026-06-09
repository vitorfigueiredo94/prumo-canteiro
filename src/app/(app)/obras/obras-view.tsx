"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Plus, MapPin, UserRound, Calendar, ChevronRight, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ObraForm } from "./obra-form";
import { criarObra } from "./actions";
import { STATUS_OBRA } from "@/lib/status";
import { fmtBRL, fmtDate } from "@/lib/format";

interface NotaLite { id: string; status: string; valor: number; categoria: string; }
interface PagLite { id: string; valor: number; }
interface Terreno { id: string; nome: string; cidade: string; }

interface Obra {
  id: string; nome: string; status: string; orcamento: number; progresso: number;
  inicio: string | null; prazo: string | null; responsavel: string | null;
  terreno: Terreno; notas: NotaLite[]; pagamentos: PagLite[];
}

const FILTROS = [
  { k: "todas", l: "Todas" },
  { k: "em_andamento", l: "Em andamento" },
  { k: "planejamento", l: "Planejamento" },
  { k: "parada", l: "Paradas" },
  { k: "concluida", l: "Concluídas" },
];

function computeRealizado(notas: NotaLite[], pags: PagLite[]) {
  const gastoNotas = notas.filter((n) => n.status === "confirmada").reduce((s, n) => s + n.valor, 0);
  const gastoFunc = pags.reduce((s, p) => s + p.valor, 0);
  return gastoNotas + gastoFunc;
}

export function ObrasView({ obras, terrenos }: { obras: Obra[]; terrenos: Terreno[] }) {
  const [filtro, setFiltro] = useState("todas");
  const [busca, setBusca] = useState("");
  const [showNew, setShowNew] = useState(false);

  const filtered = obras
    .filter((o) => filtro === "todas" || o.status === filtro)
    .filter((o) => !busca.trim() || o.nome.toLowerCase().includes(busca.toLowerCase()) || o.terreno.nome.toLowerCase().includes(busca.toLowerCase()));

  const closeNew = useCallback(() => setShowNew(false), []);

  return (
    <>
      {/* Header */}
      <div style={{ padding: "22px 32px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-surface)" }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 500, color: "var(--fg-primary)", letterSpacing: "-0.015em", lineHeight: 1.1 }}>Obras</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--fg-tertiary)" }}>
            {obras.length} {obras.length === 1 ? "obra" : "obras"} · {obras.filter((o) => o.status === "em_andamento").length} em andamento
          </p>
        </div>
        <button onClick={() => setShowNew(true)} style={{ height: 40, padding: "0 16px", background: "var(--navy-700)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 }}>
          <Plus size={16} /> Nova obra
        </button>
      </div>

      {/* Filtros + busca */}
      <div style={{ padding: "12px 32px", background: "var(--bg-surface)", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {FILTROS.map((f) => {
            const on = filtro === f.k;
            return (
              <button key={f.k} onClick={() => setFiltro(f.k)} style={{ padding: "7px 14px", borderRadius: "var(--radius-full)", fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)", border: `1px solid ${on ? "var(--navy-600)" : "var(--border-default)"}`, background: on ? "var(--navy-700)" : "var(--bg-surface)", color: on ? "#fff" : "var(--fg-secondary)" }}>
                {f.l}
              </button>
            );
          })}
        </div>
        <div style={{ position: "relative" }}>
          <Search size={15} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--fg-muted)", pointerEvents: "none" }} />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar obra…" style={{ height: 38, padding: "0 12px 0 34px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-surface)", color: "var(--fg-primary)", fontFamily: "var(--font-sans)", fontSize: 14, width: 260, outline: "none" }} onFocus={(e) => { e.target.style.borderColor = "var(--border-focus)"; e.target.style.boxShadow = "var(--shadow-focus)"; }} onBlur={(e) => { e.target.style.borderColor = "var(--border-default)"; e.target.style.boxShadow = "none"; }} />
        </div>
      </div>

      {/* Cards */}
      <div style={{ padding: "24px 32px" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 24px" }}>
            <p style={{ color: "var(--fg-tertiary)", fontSize: 15 }}>Nenhuma obra encontrada.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))", gap: 18 }}>
            {filtered.map((o) => {
              const st = STATUS_OBRA[o.status as keyof typeof STATUS_OBRA] ?? STATUS_OBRA.planejamento;
              const realizado = computeRealizado(o.notas, o.pagamentos);
              const pct = o.orcamento > 0 ? Math.min(Math.round((realizado / o.orcamento) * 100), 100) : 0;
              const estouro = realizado > o.orcamento;

              return (
                <Link key={o.id} href={`/obras/${o.id}`} style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-xs)", overflow: "hidden", display: "flex", flexDirection: "column", textDecoration: "none" }}>
                  <div style={{ padding: "18px 20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
                      <h3 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 500, color: "var(--fg-primary)" }}>{o.nome}</h3>
                      <Badge label={st.label} color={st.color} bg={st.bg} dot />
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "var(--fg-tertiary)", marginBottom: 14 }}>
                      <MapPin size={13} />{o.terreno.nome} · {o.terreno.cidade}
                    </div>

                    {/* Budget bar */}
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--fg-tertiary)", marginBottom: 5 }}>
                        <span>Realizado: {fmtBRL(realizado)}</span>
                        <span style={{ color: estouro ? "var(--danger-500)" : undefined }}>{pct}%</span>
                      </div>
                      <div style={{ height: 8, borderRadius: "var(--radius-full)", background: "var(--ink-100)", overflow: "hidden" }}>
                        <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: estouro ? "var(--danger-500)" : "var(--navy-700)", borderRadius: "var(--radius-full)", transition: "width 600ms" }} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--fg-tertiary)", marginTop: 4 }}>
                        <span>Orçamento: {fmtBRL(o.orcamento)}</span>
                        <span>Física: {o.progresso}%</span>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 14, fontSize: 12.5, color: "var(--fg-tertiary)", flexWrap: "wrap" }}>
                      {o.responsavel && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><UserRound size={12} />{o.responsavel}</span>}
                      {(o.inicio || o.prazo) && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Calendar size={12} />{fmtDate(o.inicio)} → {fmtDate(o.prazo)}</span>}
                    </div>
                  </div>

                  <div style={{ padding: "10px 20px", borderTop: "1px solid var(--border-subtle)", background: "var(--ink-50)", display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto" }}>
                    <span style={{ fontSize: 13, color: "var(--navy-700)", fontWeight: 600 }}>Ver detalhes</span>
                    <ChevronRight size={15} style={{ color: "var(--fg-muted)" }} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {showNew && <ObraForm action={criarObra} terrenos={terrenos} onClose={closeNew} />}
    </>
  );
}
