"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, HardHat, Package, Wrench, Truck, MoreHorizontal } from "lucide-react";
import { fmtBRL, fmtBRLshort, fmtDate } from "@/lib/format";

interface Obra { id: string; nome: string; orcamento: number; status: string; }
interface NotaItem { obraId: string; valor: number; emitidaEm: string | null; categoria: string; fornecedor: string | null; }
interface PagItem { obraId: string | null; valor: number; pagoEm: string | null; descricao: string | null; funcNome: string | null; }
interface ParcelaItem { valor: number; pagoEm: string | null; }

const CAT_META: Record<string, { label: string; Icon: React.ElementType; color: string }> = {
  material:     { label: "Material",     Icon: Package,        color: "#1e3a5f" },
  mao_obra:     { label: "Mão de obra",  Icon: HardHat,        color: "#b45309" },
  servicos:     { label: "Serviços",     Icon: Wrench,         color: "#6d28d9" },
  equipamentos: { label: "Equipamentos", Icon: Truck,          color: "#047857" },
  outros:       { label: "Outros",       Icon: MoreHorizontal, color: "#6b7280" },
};

function getYM(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(ym: string) {
  const [y, m] = ym.split("-");
  const names = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${names[parseInt(m) - 1]}/${y.slice(2)}`;
}

function Donut({ pct, size = 120 }: { pct: number; size?: number }) {
  const r = (size - 20) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (Math.min(pct, 100) / 100) * circ;
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--ink-100)" strokeWidth={14} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e3a5f" strokeWidth={14}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x={size/2} y={size/2 - 4} textAnchor="middle" fontFamily="var(--font-display)" fontSize={18} fontWeight={400} fill="var(--fg-primary)">{Math.round(pct)}%</text>
      <text x={size/2} y={size/2 + 16} textAnchor="middle" fontFamily="var(--font-sans)" fontSize={10} fill="var(--fg-tertiary)">do orçado</text>
    </svg>
  );
}

export function FinanceiroView({ obras, notas, pagamentos, parcelas, totalEmRevisao }: {
  obras: Obra[]; notas: NotaItem[]; pagamentos: PagItem[]; parcelas: ParcelaItem[]; totalEmRevisao: number;
}) {
  const [tab, setTab] = useState<"obra" | "fluxo">("obra");
  const [obraFiltro, setObraFiltro] = useState<string>("todas");

  const totalOrcamento = obras.reduce((s, o) => s + o.orcamento, 0);
  const totalGastoNotas = notas.reduce((s, n) => s + n.valor, 0);
  const totalGastoPag = pagamentos.reduce((s, p) => s + p.valor, 0);
  const totalRealizado = totalGastoNotas + totalGastoPag;
  const saldoOrcamento = totalOrcamento - totalRealizado;
  const pctGasto = totalOrcamento > 0 ? Math.round((totalRealizado / totalOrcamento) * 100) : 0;

  // Per-obra
  const obraMap: Record<string, { nome: string; orcamento: number; gasto: number }> = {};
  obras.forEach((o) => { obraMap[o.id] = { nome: o.nome, orcamento: o.orcamento, gasto: 0 }; });
  notas.forEach((n) => { if (obraMap[n.obraId]) obraMap[n.obraId].gasto += n.valor; });
  pagamentos.forEach((p) => { if (p.obraId && obraMap[p.obraId]) obraMap[p.obraId].gasto += p.valor; });

  // Category breakdown
  const catMap: Record<string, number> = {};
  notas.forEach((n) => { catMap[n.categoria] = (catMap[n.categoria] ?? 0) + n.valor; });
  const catTotal = Object.values(catMap).reduce((s, v) => s + v, 0);
  const cats = Object.entries(CAT_META)
    .map(([k, meta]) => ({ k, ...meta, val: catMap[k] ?? 0 }))
    .filter((c) => c.val > 0);

  // Últimos lançamentos
  type Lancamento = { tipo: "nota" | "pag"; data: string | null; valor: number; obraId: string | null; label: string; cat: string };
  const lancamentos: Lancamento[] = [
    ...notas.map((n) => ({ tipo: "nota" as const, data: n.emitidaEm, valor: n.valor, obraId: n.obraId, label: n.fornecedor ?? "NF", cat: n.categoria })),
    ...pagamentos.filter((p) => p.valor > 0).map((p) => ({ tipo: "pag" as const, data: p.pagoEm, valor: p.valor, obraId: p.obraId, label: p.funcNome ?? p.descricao ?? "Pagamento", cat: "mao_obra" })),
  ].sort((a, b) => (b.data ?? "").localeCompare(a.data ?? "")).slice(0, 8);

  // Monthly cashflow
  const now = new Date();
  const months: string[] = [];
  for (let i = 11; i >= 0; i--) { const d = new Date(now); d.setMonth(d.getMonth() - i); months.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`); }
  const receitas: Record<string,number> = {}; const despesas: Record<string,number> = {};
  months.forEach((m) => { receitas[m] = 0; despesas[m] = 0; });
  parcelas.forEach((p) => { const ym = getYM(p.pagoEm); if (ym && receitas[ym] !== undefined) receitas[ym] += p.valor; });
  const filteredNotas = obraFiltro === "todas" ? notas : notas.filter((n) => n.obraId === obraFiltro);
  const filteredPags  = obraFiltro === "todas" ? pagamentos : pagamentos.filter((p) => p.obraId === obraFiltro);
  filteredNotas.forEach((n) => { const ym = getYM(n.emitidaEm); if (ym && despesas[ym] !== undefined) despesas[ym] += n.valor; });
  filteredPags.forEach((p) => { const ym = getYM(p.pagoEm); if (ym && despesas[ym] !== undefined) despesas[ym] += p.valor; });
  const maxVal = Math.max(...months.map((m) => Math.max(receitas[m], despesas[m])), 1);

  const cardStyle: React.CSSProperties = { background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-xs)" };
  const cardHead: React.CSSProperties = { padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" };
  const cardTitle: React.CSSProperties = { margin: 0, fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 500, color: "var(--fg-primary)" };

  return (
    <div>
      {/* Header */}
      <div style={{ padding: "22px 32px", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-surface)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <div>
            <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 500, color: "var(--fg-primary)", letterSpacing: "-0.015em" }}>Financeiro</h1>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--fg-tertiary)" }}>Visão consolidada de receitas, despesas e orçamentos</p>
          </div>
          <button
            onClick={() => {
              const hoje = new Date();
              const ini  = `${hoje.getFullYear()}-01-01`;
              const fim  = hoje.toISOString().slice(0, 10);
              window.open(`/api/relatorio/financeiro?de=${ini}&ate=${fim}`, "_blank");
            }}
            style={{ height: 36, padding: "0 14px", background: "var(--navy-700)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0, marginTop: 4 }}
          >
            Relatório PDF
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginTop: 18, marginBottom: -23, borderBottom: "1px solid var(--border-subtle)" }}>
          {([["obra", "Por obra"], ["fluxo", "Fluxo de caixa"]] as const).map(([k, l]) => {
            const on = tab === k;
            return <button key={k} onClick={() => setTab(k)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 16px", background: "transparent", border: "none", borderBottom: `2px solid ${on ? "var(--navy-700)" : "transparent"}`, color: on ? "var(--fg-primary)" : "var(--fg-tertiary)", fontSize: 14.5, fontWeight: on ? 700 : 500, cursor: "pointer", fontFamily: "var(--font-sans)", marginBottom: -1 }}>{l}</button>;
          })}
        </div>
      </div>

      <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: 24 }}>
        {/* ── Tab: Por obra ── */}
        {tab === "obra" && (
          <>
            {/* 4 KPI stat cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
              {[
                { label: "Orçamento total", value: fmtBRLshort(totalOrcamento), sub: "todas as obras", tone: "" },
                { label: "Total realizado", value: fmtBRLshort(totalRealizado), sub: `${pctGasto}% do previsto`, tone: "" },
                { label: "Em revisão", value: fmtBRLshort(totalEmRevisao), sub: "notas não confirmadas", tone: totalEmRevisao > 0 ? "warning" : "" },
                { label: "Saldo de orçamento", value: fmtBRLshort(Math.abs(saldoOrcamento)), sub: saldoOrcamento >= 0 ? "previsto − realizado" : "em estouro", tone: saldoOrcamento < 0 ? "danger" : "success" },
              ].map(({ label, value, sub, tone }) => {
                const c = tone === "danger" ? "var(--danger-500)" : tone === "success" ? "var(--success-700)" : tone === "warning" ? "var(--warning-700)" : "var(--fg-primary)";
                return (
                  <div key={label} style={cardStyle}>
                    <div style={{ padding: "16px 20px" }}>
                      <div style={{ fontSize: 11.5, color: "var(--fg-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>{label}</div>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 400, color: c, letterSpacing: "-0.02em" }}>{value}</div>
                      <div style={{ fontSize: 12.5, color: "var(--fg-tertiary)", marginTop: 3 }}>{sub}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Two-column: left (donut + por obra) | right (últimos lançamentos) */}
            <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 20, alignItems: "start" }}>
              {/* Left */}
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Donut */}
                <div style={cardStyle}>
                  <div style={cardHead}><h3 style={cardTitle}>Investimento por categoria</h3></div>
                  <div style={{ padding: "20px 24px", display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
                    <Donut pct={pctGasto} />
                    <div style={{ flex: 1, minWidth: 180, display: "flex", flexDirection: "column", gap: 10 }}>
                      {cats.length === 0 ? (
                        <p style={{ fontSize: 13, color: "var(--fg-tertiary)", margin: 0 }}>Nenhuma nota confirmada.</p>
                      ) : cats.map((c) => {
                        const pct = catTotal > 0 ? Math.round((c.val / catTotal) * 100) : 0;
                        const Icon = c.Icon;
                        return (
                          <div key={c.k}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, marginBottom: 4 }}>
                              <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, color: "var(--fg-primary)" }}><Icon size={13} style={{ color: c.color }} />{c.label}</span>
                              <span style={{ color: "var(--fg-tertiary)", fontVariantNumeric: "tabular-nums" }}>{fmtBRLshort(c.val)} · {pct}%</span>
                            </div>
                            <div style={{ height: 5, borderRadius: "var(--radius-full)", background: "var(--ink-100)", overflow: "hidden" }}>
                              <div style={{ width: `${pct}%`, height: "100%", background: c.color, borderRadius: "var(--radius-full)" }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Orçamento por obra */}
                <div style={cardStyle}>
                  <div style={cardHead}><h3 style={cardTitle}>Orçamento por obra</h3></div>
                  <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 18 }}>
                    {Object.entries(obraMap).map(([id, { nome, orcamento, gasto }]) => {
                      const saldo = orcamento - gasto;
                      const estouro = saldo < 0;
                      const pct = orcamento > 0 ? Math.min(Math.round((gasto / orcamento) * 100), 100) : 0;
                      return (
                        <Link key={id} href={`/obras/${id}`} style={{ textDecoration: "none" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 7 }}>
                            <span style={{ fontSize: 14.5, fontWeight: 600, color: "var(--fg-primary)", display: "flex", alignItems: "center", gap: 7 }}><Building2 size={14} style={{ color: "var(--fg-muted)" }} />{nome}</span>
                            <span style={{ fontSize: 13, color: estouro ? "var(--danger-500)" : "var(--fg-tertiary)", fontVariantNumeric: "tabular-nums" }}>{fmtBRLshort(gasto)} <span style={{ color: "var(--fg-muted)", fontWeight: 400 }}>/ {fmtBRLshort(orcamento)}</span></span>
                          </div>
                          <div style={{ height: 9, borderRadius: "var(--radius-full)", background: "var(--ink-100)", overflow: "hidden" }}>
                            <div style={{ width: `${pct}%`, height: "100%", background: estouro ? "var(--danger-500)" : pct > 80 ? "#d97706" : "#1e3a5f", borderRadius: "var(--radius-full)", transition: "width 600ms" }} />
                          </div>
                        </Link>
                      );
                    })}
                    {Object.keys(obraMap).length === 0 && <p style={{ fontSize: 13, color: "var(--fg-tertiary)", margin: 0 }}>Nenhuma obra cadastrada.</p>}
                  </div>
                </div>
              </div>

              {/* Right: últimos lançamentos */}
              <div style={cardStyle}>
                <div style={cardHead}><h3 style={cardTitle}>Últimos lançamentos</h3></div>
                <div style={{ padding: "4px 0" }}>
                  {lancamentos.length === 0 ? (
                    <p style={{ padding: "24px 20px", textAlign: "center", color: "var(--fg-tertiary)", fontSize: 14, margin: 0 }}>Nenhum lançamento encontrado.</p>
                  ) : lancamentos.map((l, i) => {
                    const meta = CAT_META[l.cat] ?? CAT_META.outros;
                    const Icon = l.tipo === "pag" ? HardHat : meta.Icon;
                    const obra = l.obraId && obraMap[l.obraId];
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 13, padding: "11px 20px", borderBottom: i < lancamentos.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                        <span style={{ width: 36, height: 36, borderRadius: "var(--radius-md)", background: "var(--ink-100)", display: "flex", alignItems: "center", justifyContent: "center", color: meta.color, flexShrink: 0 }}>
                          <Icon size={16} />
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.label}</div>
                          <div style={{ fontSize: 12.5, color: "var(--fg-tertiary)" }}>{obra ? obra.nome : "—"} · {fmtDate(l.data)}</div>
                        </div>
                        <span style={{ fontWeight: 600, color: "var(--fg-primary)", fontVariantNumeric: "tabular-nums", fontSize: 14, flexShrink: 0 }}>−{fmtBRLshort(l.valor)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Tab: Fluxo de caixa ── */}
        {tab === "fluxo" && (
          <div style={cardStyle}>
            <div style={cardHead}>
              <h3 style={cardTitle}>Fluxo de caixa — últimos 12 meses</h3>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setObraFiltro("todas")} style={{ height: 30, padding: "0 12px", borderRadius: "var(--radius-full)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)", border: `1px solid ${obraFiltro === "todas" ? "var(--navy-600)" : "var(--border-default)"}`, background: obraFiltro === "todas" ? "var(--navy-700)" : "var(--bg-surface)", color: obraFiltro === "todas" ? "#fff" : "var(--fg-secondary)" }}>Todas</button>
                {obras.map((o) => (
                  <button key={o.id} onClick={() => setObraFiltro(o.id)} style={{ height: 30, padding: "0 12px", borderRadius: "var(--radius-full)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)", border: `1px solid ${obraFiltro === o.id ? "var(--navy-600)" : "var(--border-default)"}`, background: obraFiltro === o.id ? "var(--navy-700)" : "var(--bg-surface)", color: obraFiltro === o.id ? "#fff" : "var(--fg-secondary)" }}>{o.nome}</button>
                ))}
              </div>
            </div>
            <div style={{ padding: "22px 28px" }}>
              <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
                {[{ color: "var(--success-500)", label: "Receitas (vendas)" }, { color: "var(--danger-400)", label: "Despesas (NFs + Pgtos)" }].map((l) => (
                  <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--fg-tertiary)" }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: l.color, display: "inline-block" }} />{l.label}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 180, overflowX: "auto" }}>
                {months.map((ym) => {
                  const r = receitas[ym]; const d = despesas[ym];
                  const rH = Math.round((r / maxVal) * 160); const dH = Math.round((d / maxVal) * 160);
                  return (
                    <div key={ym} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0, minWidth: 48 }}>
                      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 160 }}>
                        <div title={`Receita: ${fmtBRL(r)}`} style={{ width: 18, height: rH || 2, background: "var(--success-500)", borderRadius: "3px 3px 0 0", transition: "height 600ms" }} />
                        <div title={`Despesa: ${fmtBRL(d)}`} style={{ width: 18, height: dH || 2, background: "var(--danger-400)", borderRadius: "3px 3px 0 0", transition: "height 600ms" }} />
                      </div>
                      <span style={{ fontSize: 11, color: "var(--fg-muted)", whiteSpace: "nowrap" }}>{monthLabel(ym)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
