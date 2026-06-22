"use client";

import { useState, useCallback, useTransition } from "react";
import Link from "next/link";
import { Plus, MapPin, Search, List, KanbanSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ObraForm } from "./obra-form";
import { criarObra, mudarStatusObra } from "./actions";
import { STATUS_OBRA } from "@/lib/status";
import { fmtBRLshort } from "@/lib/format";

const KANBAN_COLS = ["planejamento", "em_andamento", "parada", "concluida"] as const;

interface NotaLite { id: string; status: string; valor: number; }
interface PagLite { id: string; valor: number; }
interface Terreno { id: string; nome: string; cidade: string; }

interface Obra {
  id: string; nome: string; status: string; orcamento: number; progresso: number;
  inicio: string | null; prazo: string | null; responsavel: string | null;
  terreno: Terreno | null;
  notas: NotaLite[];
  pagamentos: PagLite[];
  alocacoes: { id: string }[];
}

const FILTROS = [
  { k: "todas", l: "Todas" },
  { k: "em_andamento", l: "Em andamento" },
  { k: "planejamento", l: "Planejamento" },
  { k: "parada", l: "Paradas" },
  { k: "concluida", l: "Concluídas" },
];

function computeFinanceiro(notas: NotaLite[], pags: PagLite[], orcamento: number) {
  const gastoNotas = notas.filter((n) => n.status === "confirmada").reduce((s, n) => s + n.valor, 0);
  const gastoFunc = pags.reduce((s, p) => s + p.valor, 0);
  const realizado = gastoNotas + gastoFunc;
  const saldo = orcamento - realizado;
  const estouro = saldo < 0;
  const pct = orcamento > 0 ? Math.min(Math.round((realizado / orcamento) * 100), 100) : 0;
  return { realizado, saldo, estouro, pct };
}

export function ObrasView({ obras, terrenos }: { obras: Obra[]; terrenos: Terreno[] }) {
  const [filtro, setFiltro] = useState("todas");
  const [busca, setBusca] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [vista, setVista] = useState<"lista" | "quadro">("lista");
  const [statusOverride, setStatusOverride] = useState<Record<string, string>>({});
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const stOf = useCallback((o: Obra) => statusOverride[o.id] ?? o.status, [statusOverride]);

  const buscaOk = (o: Obra) =>
    !busca.trim() || o.nome.toLowerCase().includes(busca.toLowerCase()) || (o.terreno?.nome ?? "").toLowerCase().includes(busca.toLowerCase());

  const filtered = obras
    .filter((o) => filtro === "todas" || stOf(o) === filtro)
    .filter(buscaOk);

  function moverObra(id: string, status: string) {
    setStatusOverride((p) => ({ ...p, [id]: status }));
    startTransition(() => { mudarStatusObra(id, status); });
  }

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
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Toggle Lista / Quadro */}
          <div style={{ display: "flex", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
            {([["lista", List, "Lista"], ["quadro", KanbanSquare, "Quadro"]] as const).map(([k, Icon, lbl]) => {
              const on = vista === k;
              return (
                <button key={k} onClick={() => setVista(k)} title={lbl} style={{ height: 38, padding: "0 12px", border: "none", background: on ? "var(--navy-700)" : "var(--bg-surface)", color: on ? "#fff" : "var(--fg-secondary)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 13.5, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Icon size={15} /> {lbl}
                </button>
              );
            })}
          </div>
          <div style={{ position: "relative" }}>
            <Search size={15} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--fg-muted)", pointerEvents: "none" }} />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar obra…" style={{ height: 38, padding: "0 12px 0 34px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-surface)", color: "var(--fg-primary)", fontFamily: "var(--font-sans)", fontSize: 14, width: 260, outline: "none" }} onFocus={(e) => { e.target.style.borderColor = "var(--border-focus)"; e.target.style.boxShadow = "var(--shadow-focus)"; }} onBlur={(e) => { e.target.style.borderColor = "var(--border-default)"; e.target.style.boxShadow = "none"; }} />
          </div>
        </div>
      </div>

      {/* Cards */}
      <div style={{ padding: "24px 32px" }}>
        {vista === "quadro" ? (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${KANBAN_COLS.length}, 1fr)`, gap: 16, alignItems: "start" }}>
            {KANBAN_COLS.map((colKey) => {
              const st = STATUS_OBRA[colKey as keyof typeof STATUS_OBRA] ?? STATUS_OBRA.planejamento;
              const cards = obras.filter((o) => stOf(o) === colKey).filter(buscaOk);
              return (
                <div
                  key={colKey}
                  onDragOver={(e) => { e.preventDefault(); setDragOverCol(colKey); }}
                  onDragLeave={() => setDragOverCol((c) => (c === colKey ? null : c))}
                  onDrop={() => { if (dragId) moverObra(dragId, colKey); setDragId(null); setDragOverCol(null); }}
                  style={{ background: dragOverCol === colKey ? "var(--ink-100)" : "var(--ink-50)", border: `1px solid ${dragOverCol === colKey ? st.color : "var(--border-subtle)"}`, borderRadius: "var(--radius-lg)", padding: 12, minHeight: 220, transition: "background 120ms" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10, padding: "0 4px" }}>
                    <span style={{ width: 9, height: 9, borderRadius: "50%", background: st.color }} />
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--fg-secondary)" }}>{st.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-muted)", background: "var(--bg-surface)", borderRadius: 20, padding: "1px 8px" }}>{cards.length}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {cards.map((o) => {
                      const { realizado, pct, estouro } = computeFinanceiro(o.notas, o.pagamentos, o.orcamento);
                      return (
                        <div
                          key={o.id}
                          draggable
                          onDragStart={() => setDragId(o.id)}
                          onDragEnd={() => { setDragId(null); setDragOverCol(null); }}
                          style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: "12px 14px", cursor: "grab", boxShadow: "var(--shadow-xs)", opacity: dragId === o.id ? 0.5 : 1 }}
                        >
                          <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--fg-primary)", marginBottom: 3 }}>{o.nome}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--fg-tertiary)", marginBottom: 10 }}>
                            <MapPin size={12} />{o.terreno ? o.terreno.nome : "Sem terreno"}
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--fg-tertiary)", marginBottom: 4 }}>
                            <span>Execução {o.progresso}%</span>
                            <span style={{ color: estouro ? "var(--danger-500)" : "var(--fg-tertiary)" }}>Orç. {pct}%</span>
                          </div>
                          <div style={{ height: 6, borderRadius: "var(--radius-full)", background: "var(--ink-100)", overflow: "hidden", marginBottom: 10 }}>
                            <div style={{ width: `${Math.min(o.progresso, 100)}%`, height: "100%", background: "#d4a24c", borderRadius: "var(--radius-full)" }} />
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--fg-primary)" }}>{fmtBRLshort(realizado)}</span>
                            <Link href={`/obras/${o.id}`} style={{ fontSize: 12, fontWeight: 600, color: "var(--navy-700)", textDecoration: "none" }}>Abrir →</Link>
                          </div>
                        </div>
                      );
                    })}
                    {cards.length === 0 && <p style={{ fontSize: 12.5, color: "var(--fg-muted)", textAlign: "center", padding: "16px 0" }}>—</p>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 24px" }}>
            <p style={{ color: "var(--fg-tertiary)", fontSize: 15 }}>Nenhuma obra encontrada.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))", gap: 18 }}>
            {filtered.map((o) => {
              const st = STATUS_OBRA[o.status as keyof typeof STATUS_OBRA] ?? STATUS_OBRA.planejamento;
              const { realizado, saldo, estouro, pct } = computeFinanceiro(o.notas, o.pagamentos, o.orcamento);
              const equipe = o.alocacoes.length;

              return (
                <Link key={o.id} href={`/obras/${o.id}`} style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-xs)", overflow: "hidden", display: "flex", flexDirection: "column", textDecoration: "none", transition: "box-shadow 140ms, border-color 140ms" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-md)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--border-default)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-xs)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--border-subtle)"; }}
                >
                  <div style={{ padding: "18px 20px 16px" }}>
                    {/* Name + status */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 4 }}>
                      <h3 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 500, color: "var(--fg-primary)" }}>{o.nome}</h3>
                      <Badge label={st.label} color={st.color} bg={st.bg} dot />
                    </div>

                    {/* Location */}
                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "var(--fg-tertiary)", marginBottom: 16 }}>
                      <MapPin size={13} />{o.terreno ? `${o.terreno.nome} · ${o.terreno.cidade}` : "Sem terreno vinculado"}
                    </div>

                    {/* Execução física — amber */}
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "var(--fg-tertiary)", marginBottom: 6 }}>
                      <span>Execução física</span>
                      <span style={{ fontWeight: 600, color: "var(--fg-secondary)" }}>{o.progresso}%</span>
                    </div>
                    <div style={{ height: 7, borderRadius: "var(--radius-full)", background: "var(--ink-100)", overflow: "hidden", marginBottom: 14 }}>
                      <div style={{ width: `${Math.min(o.progresso, 100)}%`, height: "100%", background: "#d4a24c", borderRadius: "var(--radius-full)", transition: "width 600ms" }} />
                    </div>

                    {/* Orçamento consumido — navy */}
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "var(--fg-tertiary)", marginBottom: 6 }}>
                      <span>Orçamento consumido</span>
                      <span style={{ fontWeight: 600, color: estouro ? "var(--danger-500)" : "var(--fg-secondary)" }}>{pct}%</span>
                    </div>
                    <div style={{ height: 7, borderRadius: "var(--radius-full)", background: "var(--ink-100)", overflow: "hidden" }}>
                      <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: estouro ? "var(--danger-500)" : "#1e3a5f", borderRadius: "var(--radius-full)", transition: "width 600ms" }} />
                    </div>
                  </div>

                  {/* Footer: REALIZADO | SALDO | EQUIPE */}
                  <div style={{ display: "flex", borderTop: "1px solid var(--border-subtle)", background: "var(--ink-50)", marginTop: "auto" }}>
                    <div style={{ flex: 1, padding: "11px 16px" }}>
                      <div style={{ fontSize: 11.5, color: "var(--fg-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Realizado</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--fg-primary)", fontVariantNumeric: "tabular-nums" }}>{fmtBRLshort(realizado)}</div>
                    </div>
                    <div style={{ width: 1, background: "var(--border-subtle)" }} />
                    <div style={{ flex: 1, padding: "11px 16px" }}>
                      <div style={{ fontSize: 11.5, color: "var(--fg-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{estouro ? "Estouro" : "Saldo"}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: estouro ? "var(--danger-500)" : "#16a34a", fontVariantNumeric: "tabular-nums" }}>{fmtBRLshort(Math.abs(saldo))}</div>
                    </div>
                    <div style={{ width: 1, background: "var(--border-subtle)" }} />
                    <div style={{ flex: 1, padding: "11px 16px" }}>
                      <div style={{ fontSize: 11.5, color: "var(--fg-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Equipe</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--fg-primary)" }}>{equipe}</div>
                    </div>
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
