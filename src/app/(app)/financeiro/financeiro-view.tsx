"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, HardHat, Package, Wrench, Truck, MoreHorizontal, AlertCircle, TrendingUp } from "lucide-react";
import { fmtBRL, fmtBRLshort, fmtDate } from "@/lib/format";

interface Obra { id: string; nome: string; orcamento: number; status: string; }
interface NotaItem { obraId: string; valor: number; emitidaEm: string | null; categoria: string; fornecedor: string | null; }
interface PagItem { obraId: string | null; valor: number; pagoEm: string | null; descricao: string | null; funcNome: string | null; }
interface ParcelaItem { valor: number; pagoEm: string | null; }
interface ParcelaVencidaItem { id: string; valor: number; vencimento: string | null; numero: number; nomeComprador: string; }
interface ParcelaFuturaItem { valor: number; vencimento: string | null; }

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
function diasAtraso(vencimento: string | null): number {
  if (!vencimento) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(vencimento).getTime()) / 86_400_000));
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

export function FinanceiroView({
  obras, notas, pagamentos, parcelas, totalEmRevisao, parcelasVencidas, parcelasFuturas, de, ate,
}: {
  obras: Obra[];
  notas: NotaItem[];
  pagamentos: PagItem[];
  parcelas: ParcelaItem[];
  totalEmRevisao: number;
  parcelasVencidas: ParcelaVencidaItem[];
  parcelasFuturas: ParcelaFuturaItem[];
  de?: string | null;
  ate?: string | null;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"obra" | "fluxo" | "inadimplencia" | "dre">("obra");
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

  // Monthly cashflow (past 12 months)
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

  // Projeção futura: próximos 6 meses
  const futureMonths: string[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now); d.setMonth(d.getMonth() + i);
    futureMonths.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);
  }
  const entradasFuturas: Record<string, number> = {};
  futureMonths.forEach((m) => { entradasFuturas[m] = 0; });
  parcelasFuturas.forEach((p) => {
    const ym = getYM(p.vencimento);
    if (ym && entradasFuturas[ym] !== undefined) entradasFuturas[ym] += p.valor;
  });
  // Despesa estimada: média dos últimos 3 meses
  const last3 = months.slice(-3);
  const avgDespesa = last3.reduce((s, m) => s + despesas[m], 0) / 3;
  const maxFutureVal = Math.max(...futureMonths.map((m) => Math.max(entradasFuturas[m], avgDespesa)), 1);

  // DRE monthly (empresa-wide, unfiltered by obra)
  const dreDespMes: Record<string, number> = {};
  const dreRecMes: Record<string, number> = {};
  months.forEach((m) => { dreDespMes[m] = 0; dreRecMes[m] = 0; });
  parcelas.forEach((p) => { const ym = getYM(p.pagoEm); if (ym && dreRecMes[ym] !== undefined) dreRecMes[ym] += p.valor; });
  notas.forEach((n) => { const ym = getYM(n.emitidaEm); if (ym && dreDespMes[ym] !== undefined) dreDespMes[ym] += n.valor; });
  pagamentos.forEach((p) => { const ym = getYM(p.pagoEm); if (ym && dreDespMes[ym] !== undefined) dreDespMes[ym] += p.valor; });
  const margemMensal: Record<string, number> = {};
  months.forEach((m) => { margemMensal[m] = dreRecMes[m] - dreDespMes[m]; });
  const maxAbsMargen = Math.max(...months.map((m) => Math.abs(margemMensal[m])), 1);

  // Inadimplência
  const totalPagas = parcelas.reduce((s, p) => s + p.valor, 0);
  const totalVencido = parcelasVencidas.reduce((s, p) => s + p.valor, 0);
  const taxaInadimplencia = (totalVencido + totalPagas) > 0
    ? (totalVencido / (totalVencido + totalPagas)) * 100
    : 0;

  const buckets: Record<string, { count: number; valor: number; label: string; color: string }> = {
    "1-15":  { count: 0, valor: 0, label: "1–15 dias",  color: "#d97706" },
    "16-30": { count: 0, valor: 0, label: "16–30 dias", color: "#ea580c" },
    "31-60": { count: 0, valor: 0, label: "31–60 dias", color: "#dc2626" },
    "+60":   { count: 0, valor: 0, label: "+60 dias",   color: "#7f1d1d" },
  };
  for (const p of parcelasVencidas) {
    const d = diasAtraso(p.vencimento);
    const key = d <= 15 ? "1-15" : d <= 30 ? "16-30" : d <= 60 ? "31-60" : "+60";
    buckets[key].count++;
    buckets[key].valor += p.valor;
  }

  // Top devedores: aggregate by nomeComprador
  const devedorMap: Record<string, { valor: number; parcelas: number }> = {};
  for (const p of parcelasVencidas) {
    if (!devedorMap[p.nomeComprador]) devedorMap[p.nomeComprador] = { valor: 0, parcelas: 0 };
    devedorMap[p.nomeComprador].valor += p.valor;
    devedorMap[p.nomeComprador].parcelas++;
  }
  const topDevedores = Object.entries(devedorMap)
    .sort((a, b) => b[1].valor - a[1].valor)
    .slice(0, 10);

  const cardStyle: React.CSSProperties = { background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-xs)" };
  const cardHead: React.CSSProperties = { padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" };
  const cardTitle: React.CSSProperties = { margin: 0, fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 500, color: "var(--fg-primary)" };

  const tabList: [string, string][] = [
    ["obra", "Por obra"],
    ["fluxo", "Fluxo de caixa"],
    ["inadimplencia", "Inadimplência"],
    ["dre", "DRE"],
  ];

  return (
    <div>
      {/* Header */}
      <div className="px-4 md:px-8 py-5" style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-surface)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <div>
            <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 500, color: "var(--fg-primary)", letterSpacing: "-0.015em" }}>Financeiro</h1>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--fg-tertiary)" }}>Visão consolidada de receitas, despesas e orçamentos</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {(() => {
              const hoje = new Date();
              const anoAtual = hoje.getFullYear();
              const periodos = [
                { l: "Este mês",    de: `${anoAtual}-${String(hoje.getMonth()+1).padStart(2,"0")}-01`, ate: hoje.toISOString().slice(0,10) },
                { l: "Este ano",    de: `${anoAtual}-01-01`, ate: hoje.toISOString().slice(0,10) },
                { l: "Últimos 12m", de: new Date(hoje.getFullYear(), hoje.getMonth()-11, 1).toISOString().slice(0,10), ate: hoje.toISOString().slice(0,10) },
                { l: "Total",       de: null, ate: null },
              ];
              const ativo = !de && !ate ? "Total" : periodos.find((p) => p.de === de && p.ate === ate)?.l ?? "Personalizado";
              return periodos.map(({ l, de: d, ate: a }) => (
                <button key={l} onClick={() => router.push(d && a ? `/financeiro?de=${d}&ate=${a}` : "/financeiro")} style={{ height: 30, padding: "0 12px", borderRadius: "var(--radius-full)", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)", border: `1px solid ${ativo === l ? "var(--navy-600)" : "var(--border-default)"}`, background: ativo === l ? "var(--navy-700)" : "var(--bg-surface)", color: ativo === l ? "#fff" : "var(--fg-secondary)" }}>
                  {l}
                </button>
              ));
            })()}
            <button
              onClick={() => {
                const d = de ?? new Date().getFullYear() + "-01-01";
                const a = ate ?? new Date().toISOString().slice(0, 10);
                window.open(`/api/relatorio/financeiro?de=${d}&ate=${a}`, "_blank");
              }}
              style={{ height: 30, padding: "0 12px", background: "var(--navy-700)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontFamily: "var(--font-sans)", fontSize: 12.5, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}
            >
              Relatório PDF
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginTop: 18, marginBottom: -23, borderBottom: "1px solid var(--border-subtle)" }}>
          {(tabList as [typeof tab, string][]).map(([k, l]) => {
            const on = tab === k;
            const hasBadge = k === "inadimplencia" && parcelasVencidas.length > 0;
            return (
              <button key={k} onClick={() => setTab(k)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 16px", background: "transparent", border: "none", borderBottom: `2px solid ${on ? "var(--navy-700)" : "transparent"}`, color: on ? "var(--fg-primary)" : "var(--fg-tertiary)", fontSize: 14.5, fontWeight: on ? 700 : 500, cursor: "pointer", fontFamily: "var(--font-sans)", marginBottom: -1 }}>
                {l}
                {hasBadge && (
                  <span style={{ minWidth: 18, height: 18, padding: "0 5px", borderRadius: 9, background: "#dc2626", color: "#fff", fontSize: 10.5, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                    {parcelasVencidas.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 md:px-8 py-7" style={{ display: "flex", flexDirection: "column", gap: 24 }}>

        {/* ── Tab: Por obra ── */}
        {tab === "obra" && (
          <>
            <div className="grid grid-cols-2 md:[grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]" style={{ gap: 14 }}>
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

            <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-5 items-start">
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
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
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Histórico 12 meses */}
            <div style={cardStyle}>
              <div style={cardHead}>
                <h3 style={cardTitle}>Fluxo de caixa — últimos 12 meses</h3>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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

            {/* Projeção 6 meses */}
            <div style={cardStyle}>
              <div style={cardHead}>
                <h3 style={{ ...cardTitle, display: "flex", alignItems: "center", gap: 8 }}>
                  <TrendingUp size={18} style={{ color: "var(--success-600)" }} />
                  Projeção — próximos 6 meses
                </h3>
                <span style={{ fontSize: 12.5, color: "var(--fg-tertiary)" }}>baseado em parcelas em aberto</span>
              </div>
              <div style={{ padding: "22px 28px" }}>
                <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
                  {[
                    { color: "#16a34a", label: "Entradas previstas (parcelas)" },
                    { color: "#9ca3af", label: `Despesa estimada (média ${fmtBRLshort(avgDespesa)}/mês)` },
                  ].map((l) => (
                    <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--fg-tertiary)" }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: l.color, display: "inline-block" }} />{l.label}
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 180, marginBottom: 24 }}>
                  {futureMonths.map((ym) => {
                    const r = entradasFuturas[ym];
                    const d = avgDespesa;
                    const rH = Math.round((r / maxFutureVal) * 160);
                    const dH = Math.round((d / maxFutureVal) * 160);
                    const positivo = r >= d;
                    return (
                      <div key={ym} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0, minWidth: 64 }}>
                        <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 160 }}>
                          <div title={`Entradas: ${fmtBRL(r)}`} style={{ width: 22, height: rH || 2, background: positivo ? "#16a34a" : "#dc2626", borderRadius: "3px 3px 0 0", transition: "height 600ms" }} />
                          <div title={`Despesa est.: ${fmtBRL(d)}`} style={{ width: 22, height: dH || 2, background: "#9ca3af", borderRadius: "3px 3px 0 0", transition: "height 600ms" }} />
                        </div>
                        <span style={{ fontSize: 11, color: "var(--fg-muted)", whiteSpace: "nowrap" }}>{monthLabel(ym)}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Tabela resumo */}
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--border-subtle)" }}>
                      {["Mês", "Entradas previstas", "Despesa est.", "Resultado"].map((h) => (
                        <th key={h} style={{ textAlign: "left", padding: "8px 0", fontWeight: 600, color: "var(--fg-tertiary)", fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {futureMonths.map((ym) => {
                      const entrada = entradasFuturas[ym];
                      const desp = avgDespesa;
                      const resultado = entrada - desp;
                      return (
                        <tr key={ym} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                          <td style={{ padding: "10px 0", fontWeight: 600, color: "var(--fg-primary)" }}>{monthLabel(ym)}</td>
                          <td style={{ padding: "10px 0", fontVariantNumeric: "tabular-nums", color: "#16a34a", fontWeight: 600 }}>{fmtBRLshort(entrada)}</td>
                          <td style={{ padding: "10px 0", fontVariantNumeric: "tabular-nums", color: "var(--fg-tertiary)" }}>{fmtBRLshort(desp)}</td>
                          <td style={{ padding: "10px 0", fontVariantNumeric: "tabular-nums", fontWeight: 700, color: resultado >= 0 ? "var(--success-700)" : "var(--danger-500)" }}>
                            {resultado >= 0 ? "+" : ""}{fmtBRLshort(resultado)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {parcelasFuturas.length === 0 && (
                  <p style={{ textAlign: "center", color: "var(--fg-tertiary)", fontSize: 13, marginTop: 16 }}>
                    Nenhuma parcela em aberto cadastrada para projeção.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Inadimplência ── */}
        {tab === "inadimplencia" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* KPI cards por faixa */}
            <div className="grid grid-cols-2 md:[grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]" style={{ gap: 14 }}>
              {/* Total */}
              <div style={{ ...cardStyle, borderLeft: `4px solid ${taxaInadimplencia > 10 ? "#dc2626" : "#d97706"}` }}>
                <div style={{ padding: "16px 20px" }}>
                  <div style={{ fontSize: 11.5, color: "var(--fg-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>Total em atraso</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 400, color: "#dc2626", letterSpacing: "-0.02em" }}>{fmtBRLshort(totalVencido)}</div>
                  <div style={{ fontSize: 12.5, color: "var(--fg-tertiary)", marginTop: 3 }}>{parcelasVencidas.length} parcela{parcelasVencidas.length !== 1 ? "s" : ""} · taxa {taxaInadimplencia.toFixed(1)}%</div>
                </div>
              </div>
              {/* Faixas */}
              {Object.entries(buckets).map(([key, b]) => (
                <div key={key} style={{ ...cardStyle, borderLeft: `4px solid ${b.color}` }}>
                  <div style={{ padding: "16px 20px" }}>
                    <div style={{ fontSize: 11.5, color: "var(--fg-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>{b.label}</div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 400, color: b.count > 0 ? b.color : "var(--fg-muted)", letterSpacing: "-0.02em" }}>{fmtBRLshort(b.valor)}</div>
                    <div style={{ fontSize: 12.5, color: "var(--fg-tertiary)", marginTop: 3 }}>{b.count} parcela{b.count !== 1 ? "s" : ""}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Barra visual de composição */}
            {totalVencido > 0 && (
              <div style={cardStyle}>
                <div style={cardHead}><h3 style={cardTitle}>Composição da inadimplência</h3></div>
                <div style={{ padding: "20px 24px" }}>
                  <div style={{ display: "flex", height: 20, borderRadius: "var(--radius-full)", overflow: "hidden", marginBottom: 12 }}>
                    {Object.entries(buckets).filter(([, b]) => b.valor > 0).map(([key, b]) => (
                      <div key={key} title={`${b.label}: ${fmtBRL(b.valor)}`} style={{ width: `${(b.valor / totalVencido) * 100}%`, background: b.color, transition: "width 600ms" }} />
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    {Object.entries(buckets).filter(([, b]) => b.valor > 0).map(([key, b]) => (
                      <div key={key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--fg-tertiary)" }}>
                        <span style={{ width: 10, height: 10, borderRadius: 2, background: b.color, display: "inline-block", flexShrink: 0 }} />
                        {b.label} — {((b.valor / totalVencido) * 100).toFixed(0)}%
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Ranking de devedores */}
            <div style={cardStyle}>
              <div style={cardHead}>
                <h3 style={{ ...cardTitle, display: "flex", alignItems: "center", gap: 8 }}>
                  <AlertCircle size={17} style={{ color: "#dc2626" }} />
                  Ranking de devedores
                </h3>
                <span style={{ fontSize: 12.5, color: "var(--fg-tertiary)" }}>ordenado por valor em aberto</span>
              </div>
              {topDevedores.length === 0 ? (
                <p style={{ padding: "28px 20px", textAlign: "center", color: "var(--success-700)", fontSize: 14, margin: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  Nenhuma parcela em atraso. Carteira saudável!
                </p>
              ) : (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "0 24px", padding: "8px 20px", borderBottom: "1px solid var(--border-subtle)", fontSize: 11.5, fontWeight: 600, color: "var(--fg-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    <span>Comprador</span>
                    <span style={{ textAlign: "right" }}>Parcelas</span>
                    <span style={{ textAlign: "right" }}>Valor total</span>
                  </div>
                  {topDevedores.map(([nome, data], i) => (
                    <div key={nome} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "0 24px", padding: "13px 20px", borderBottom: i < topDevedores.length - 1 ? "1px solid var(--border-subtle)" : "none", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ width: 26, height: 26, borderRadius: "50%", background: i === 0 ? "#7f1d1d" : i < 3 ? "#dc2626" : "#d97706", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-primary)" }}>{nome}</span>
                      </div>
                      <span style={{ fontSize: 13, color: "var(--fg-tertiary)", fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{data.parcelas}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#dc2626", fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{fmtBRL(data.valor)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tabela detalhada */}
            {parcelasVencidas.length > 0 && (
              <div style={cardStyle}>
                <div style={cardHead}><h3 style={cardTitle}>Parcelas em atraso — detalhe</h3></div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid var(--border-subtle)" }}>
                        {["Comprador", "Parcela nº", "Vencimento", "Dias em atraso", "Valor", "Corrigido"].map((h) => (
                          <th key={h} style={{ textAlign: "left", padding: "10px 20px", fontWeight: 600, color: "var(--fg-tertiary)", fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parcelasVencidas.map((p) => {
                        const dias = diasAtraso(p.vencimento);
                        const badgeColor = dias <= 15 ? "#d97706" : dias <= 30 ? "#ea580c" : dias <= 60 ? "#dc2626" : "#7f1d1d";
                        return (
                          <tr key={p.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                            <td style={{ padding: "10px 20px", fontWeight: 600, color: "var(--fg-primary)" }}>{p.nomeComprador}</td>
                            <td style={{ padding: "10px 20px", color: "var(--fg-secondary)" }}>#{p.numero}</td>
                            <td style={{ padding: "10px 20px", color: "var(--fg-tertiary)", whiteSpace: "nowrap" }}>{fmtDate(p.vencimento)}</td>
                            <td style={{ padding: "10px 20px" }}>
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: "var(--radius-full)", background: `${badgeColor}20`, color: badgeColor, fontSize: 12, fontWeight: 700 }}>
                                {dias}d
                              </span>
                            </td>
                            <td style={{ padding: "10px 20px", fontWeight: 700, color: "#dc2626", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{fmtBRL(p.valor)}</td>
                            <td style={{ padding: "10px 20px", fontWeight: 700, color: "#7f1d1d", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", fontStyle: "italic" }} title="2% multa + 1% juros ao mês">
                              {fmtBRL(p.valor * (1.02 + 0.01 * (dias / 30)))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: DRE ── */}
        {tab === "dre" && (() => {
          const dreRes = totalPagas - totalRealizado;
          const dreMar = totalPagas > 0 ? (dreRes / totalPagas) * 100 : 0;
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {/* KPI cards */}
              <div className="grid grid-cols-2 md:[grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]" style={{ gap: 14 }}>
                {[
                  { label: "Receita recebida", value: fmtBRLshort(totalPagas), sub: "parcelas pagas (total)", color: "var(--success-700)" },
                  { label: "Custos totais", value: fmtBRLshort(totalRealizado), sub: "NFs + folha de pagamento", color: "var(--danger-500)" },
                  { label: dreRes >= 0 ? "Resultado positivo" : "Resultado negativo", value: fmtBRLshort(Math.abs(dreRes)), sub: dreRes >= 0 ? "lucro operacional" : "prejuízo operacional", color: dreRes >= 0 ? "var(--success-700)" : "var(--danger-500)" },
                  { label: "Margem bruta", value: totalPagas > 0 ? `${dreMar.toFixed(1)}%` : "—", sub: dreMar >= 20 ? "saudável (≥20%)" : dreMar > 0 ? "abaixo do ideal" : "sem receita", color: dreMar >= 20 ? "var(--success-700)" : dreMar > 0 ? "#d97706" : "var(--fg-muted)" },
                ].map(({ label, value, sub, color }) => (
                  <div key={label} style={cardStyle}>
                    <div style={{ padding: "16px 20px" }}>
                      <div style={{ fontSize: 11.5, color: "var(--fg-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>{label}</div>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 400, color, letterSpacing: "-0.02em" }}>{value}</div>
                      <div style={{ fontSize: 12.5, color: "var(--fg-tertiary)", marginTop: 3 }}>{sub}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* DRE waterfall */}
              <div style={cardStyle}>
                <div style={cardHead}><h3 style={cardTitle}>Demonstrativo de Resultados — acumulado</h3></div>
                <div style={{ padding: "8px 0" }}>
                  {[
                    { label: "Receita Bruta Recebida",   value: totalPagas,        indent: 0, bold: true,  sep: false },
                    { label: "Material e insumos (NFs)", value: -totalGastoNotas,   indent: 1, bold: false, sep: false },
                    { label: "Mão de obra (folha)",      value: -totalGastoPag,    indent: 1, bold: false, sep: false },
                    { label: "Total de custos",          value: -totalRealizado,    indent: 0, bold: true,  sep: true  },
                    { label: "Resultado Operacional",    value: dreRes,             indent: 0, bold: true,  sep: true  },
                    { label: "Inadimplência em aberto",  value: -totalVencido,      indent: 1, bold: false, sep: false },
                  ].map(({ label, value, indent, bold, sep }) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 24px", paddingLeft: `${24 + indent * 20}px`, borderBottom: "1px solid var(--border-subtle)", background: sep ? "var(--ink-50)" : "transparent" }}>
                      <span style={{ fontSize: 14, fontWeight: bold ? 700 : 400, color: "var(--fg-primary)" }}>{label}</span>
                      <span style={{ fontSize: 14, fontWeight: bold ? 700 : 500, fontVariantNumeric: "tabular-nums", color: value === 0 ? "var(--fg-muted)" : value > 0 ? (bold ? "var(--success-700)" : "var(--fg-secondary)") : (bold ? "var(--danger-500)" : "var(--fg-tertiary)") }}>
                        {value < 0 ? `(${fmtBRLshort(Math.abs(value))})` : fmtBRLshort(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Break-even */}
              {(() => {
                const avgCusto3m = months.slice(-3).reduce((s, m) => s + dreDespMes[m], 0) / 3;
                const recMedParcela = parcelas.length > 0 ? totalPagas / parcelas.length : 0;
                const beN = recMedParcela > 0 ? Math.ceil(avgCusto3m / recMedParcela) : 0;
                const parcelasMes = parcelas.filter((p) => {
                  const ym = getYM(p.pagoEm);
                  return ym === months[months.length - 1];
                }).length;
                const margSeg = parcelasMes - beN;
                return (
                  <div style={cardStyle}>
                    <div style={cardHead}>
                      <h3 style={cardTitle}>Ponto de equilíbrio (break-even)</h3>
                      <span style={{ fontSize: 12.5, color: "var(--fg-tertiary)" }}>baseado nos últimos 3 meses</span>
                    </div>
                    <div style={{ padding: "20px 24px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 20 }}>
                      {[
                        { label: "Custo fixo médio/mês", value: fmtBRLshort(avgCusto3m), sub: "NFs + folha, últimos 3m", color: "var(--danger-500)" },
                        { label: "Receita média/parcela", value: recMedParcela > 0 ? fmtBRLshort(recMedParcela) : "—", sub: `${parcelas.length} parcelas recebidas`, color: "var(--fg-primary)" },
                        { label: "Break-even mensal", value: beN > 0 ? `${beN} parcelas` : "—", sub: "para cobrir os custos", color: beN > 0 && parcelasMes >= beN ? "var(--success-700)" : "var(--danger-500)" },
                        { label: "Margem de segurança", value: margSeg >= 0 ? `+${margSeg} parcelas` : `${margSeg} parcelas`, sub: "parcelas acima do break-even no mês atual", color: margSeg >= 0 ? "var(--success-700)" : "var(--danger-500)" },
                      ].map(({ label, value, sub, color }) => (
                        <div key={label}>
                          <div style={{ fontSize: 11, color: "var(--fg-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>{label}</div>
                          <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 400, color, letterSpacing: "-0.01em" }}>{value}</div>
                          <div style={{ fontSize: 12, color: "var(--fg-tertiary)", marginTop: 3 }}>{sub}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Monthly margin trend */}
              <div style={cardStyle}>
                <div style={cardHead}><h3 style={cardTitle}>Resultado mensal — últimos 12 meses</h3></div>
                <div style={{ padding: "22px 28px" }}>
                  <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
                    {[{ color: "var(--success-500)", label: "Resultado positivo" }, { color: "var(--danger-400)", label: "Resultado negativo" }].map((l) => (
                      <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--fg-tertiary)" }}>
                        <span style={{ width: 10, height: 10, borderRadius: 2, background: l.color, display: "inline-block" }} />{l.label}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 180, overflowX: "auto" }}>
                    {months.map((ym) => {
                      const mg = margemMensal[ym];
                      const pos = mg >= 0;
                      const h = Math.round((Math.abs(mg) / maxAbsMargen) * 160);
                      return (
                        <div key={ym} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0, minWidth: 48 }}>
                          <div style={{ display: "flex", alignItems: "flex-end", height: 160 }}>
                            <div title={`${pos ? "+" : ""}${fmtBRL(mg)}`} style={{ width: 28, height: h || 2, background: pos ? "var(--success-500)" : "var(--danger-400)", borderRadius: "3px 3px 0 0", transition: "height 600ms" }} />
                          </div>
                          <span style={{ fontSize: 11, color: "var(--fg-muted)", whiteSpace: "nowrap" }}>{monthLabel(ym)}</span>
                        </div>
                      );
                    })}
                  </div>
                  {months.every((ym) => margemMensal[ym] === 0) && (
                    <p style={{ textAlign: "center", color: "var(--fg-tertiary)", fontSize: 13, marginTop: 16 }}>Sem dados de receita ou despesa nos últimos 12 meses.</p>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
