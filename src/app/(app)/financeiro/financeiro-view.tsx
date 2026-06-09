"use client";

import { useState } from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { fmtBRL, fmtDate } from "@/lib/format";

interface Obra { id: string; nome: string; orcamento: number; status: string; }
interface NotaItem { obraId: string; valor: number; emitidaEm: string | null; categoria: string; }
interface PagItem { obraId: string | null; valor: number; pagoEm: string | null; }
interface ParcelaItem { valor: number; pagoEm: string | null; }

function getYM(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(ym: string) {
  const [y, m] = ym.split("-");
  const names = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${names[parseInt(m) - 1]}/${y.slice(2)}`;
}

export function FinanceiroView({ obras, notas, pagamentos, parcelas }: {
  obras: Obra[]; notas: NotaItem[]; pagamentos: PagItem[]; parcelas: ParcelaItem[];
}) {
  const [obraFiltro, setObraFiltro] = useState<string>("todas");

  const totalOrcamento = obras.reduce((s, o) => s + o.orcamento, 0);
  const totalGastoNotas = notas.reduce((s, n) => s + n.valor, 0);
  const totalGastoPag = pagamentos.reduce((s, p) => s + p.valor, 0);
  const totalGasto = totalGastoNotas + totalGastoPag;
  const totalReceita = parcelas.reduce((s, p) => s + p.valor, 0);
  const saldoGeral = totalReceita - totalGasto;

  // Per-obra breakdown
  const obraMap: Record<string, { orcamento: number; gastoNotas: number; gastoPag: number; nome: string }> = {};
  obras.forEach((o) => { obraMap[o.id] = { orcamento: o.orcamento, gastoNotas: 0, gastoPag: 0, nome: o.nome }; });
  notas.forEach((n) => { if (obraMap[n.obraId]) obraMap[n.obraId].gastoNotas += n.valor; });
  pagamentos.forEach((p) => { if (p.obraId && obraMap[p.obraId]) obraMap[p.obraId].gastoPag += p.valor; });

  // Monthly cashflow (last 12 months)
  const now = new Date();
  const months: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const receitas: Record<string, number> = {};
  const despesas: Record<string, number> = {};
  months.forEach((m) => { receitas[m] = 0; despesas[m] = 0; });

  parcelas.forEach((p) => {
    const ym = getYM(p.pagoEm);
    if (ym && receitas[ym] !== undefined) receitas[ym] += p.valor;
  });

  const filteredNotas = obraFiltro === "todas" ? notas : notas.filter((n) => n.obraId === obraFiltro);
  const filteredPags = obraFiltro === "todas" ? pagamentos : pagamentos.filter((p) => p.obraId === obraFiltro);

  filteredNotas.forEach((n) => {
    const ym = getYM(n.emitidaEm);
    if (ym && despesas[ym] !== undefined) despesas[ym] += n.valor;
  });
  filteredPags.forEach((p) => {
    const ym = getYM(p.pagoEm);
    if (ym && despesas[ym] !== undefined) despesas[ym] += p.valor;
  });

  const maxVal = Math.max(...months.map((m) => Math.max(receitas[m], despesas[m])), 1);

  return (
    <div>
      {/* Header */}
      <div style={{ padding: "22px 32px", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-surface)" }}>
        <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 500, color: "var(--fg-primary)", letterSpacing: "-0.015em" }}>Financeiro</h1>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--fg-tertiary)" }}>Visão consolidada de receitas, despesas e orçamentos</p>
      </div>

      <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: 28 }}>
        {/* KPIs */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {[
            { label: "Orçamento total", value: fmtBRL(totalOrcamento), Icon: DollarSign, color: "var(--navy-700)" },
            { label: "Total gasto (NFs + Pgtos)", value: fmtBRL(totalGasto), Icon: TrendingDown, color: "var(--danger-500)" },
            { label: "Receita de vendas", value: fmtBRL(totalReceita), Icon: TrendingUp, color: "var(--success-700)" },
            { label: "Saldo (receita − gasto)", value: fmtBRL(Math.abs(saldoGeral)), Icon: DollarSign, color: saldoGeral >= 0 ? "var(--success-700)" : "var(--danger-500)" },
          ].map((k) => (
            <div key={k.label} style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "16px 20px", flex: 1, minWidth: 160 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <k.Icon size={16} style={{ color: k.color }} />
                <p style={{ margin: 0, fontSize: 12, color: "var(--fg-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>{k.label}</p>
              </div>
              <p style={{ margin: 0, fontSize: 24, fontFamily: "var(--font-display)", color: k.color }}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Monthly bar chart */}
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "22px 28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 500, color: "var(--fg-primary)" }}>Fluxo de caixa — últimos 12 meses</h2>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setObraFiltro("todas")} style={{ height: 30, padding: "0 12px", borderRadius: "var(--radius-full)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)", border: `1px solid ${obraFiltro === "todas" ? "var(--navy-600)" : "var(--border-default)"}`, background: obraFiltro === "todas" ? "var(--navy-700)" : "var(--bg-surface)", color: obraFiltro === "todas" ? "#fff" : "var(--fg-secondary)" }}>Todas</button>
              {obras.map((o) => (
                <button key={o.id} onClick={() => setObraFiltro(o.id)} style={{ height: 30, padding: "0 12px", borderRadius: "var(--radius-full)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)", border: `1px solid ${obraFiltro === o.id ? "var(--navy-600)" : "var(--border-default)"}`, background: obraFiltro === o.id ? "var(--navy-700)" : "var(--bg-surface)", color: obraFiltro === o.id ? "#fff" : "var(--fg-secondary)" }}>{o.nome}</button>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
            {[{ color: "var(--success-500)", label: "Receitas" }, { color: "var(--danger-400)", label: "Despesas" }].map((l) => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--fg-tertiary)" }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: l.color, display: "inline-block" }} />{l.label}
              </div>
            ))}
          </div>

          {/* Bar chart */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 180, overflowX: "auto" }}>
            {months.map((ym) => {
              const r = receitas[ym];
              const d = despesas[ym];
              const rH = Math.round((r / maxVal) * 160);
              const dH = Math.round((d / maxVal) * 160);
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

        {/* Per-obra table */}
        <div>
          <h2 style={{ margin: "0 0 14px", fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 500, color: "var(--fg-primary)" }}>Por obra</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {Object.entries(obraMap).map(([id, { nome, orcamento, gastoNotas, gastoPag }]) => {
              const gasto = gastoNotas + gastoPag;
              const saldo = orcamento - gasto;
              const pct = orcamento > 0 ? Math.min(Math.round((gasto / orcamento) * 100), 100) : 0;
              const estouro = saldo < 0;

              return (
                <div key={id} style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: "16px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                    <Link href={`/obras/${id}`} style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 500, color: "var(--navy-700)", textDecoration: "none" }}>{nome}</Link>
                    <div style={{ display: "flex", gap: 16, fontSize: 13, color: "var(--fg-tertiary)" }}>
                      <span>Orçamento: {fmtBRL(orcamento)}</span>
                      <span>Gasto: {fmtBRL(gasto)}</span>
                      <span style={{ color: estouro ? "var(--danger-500)" : "var(--success-700)", fontWeight: 600 }}>{estouro ? "Estouro" : "Saldo"}: {fmtBRL(Math.abs(saldo))}</span>
                    </div>
                  </div>
                  <div style={{ height: 8, borderRadius: "var(--radius-full)", background: "var(--ink-100)", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: estouro ? "var(--danger-500)" : pct > 80 ? "var(--gold-500)" : "var(--navy-700)", borderRadius: "var(--radius-full)", transition: "width 600ms" }} />
                  </div>
                  <p style={{ margin: "5px 0 0", fontSize: 12, color: "var(--fg-muted)" }}>{pct}% do orçamento executado · NFs: {fmtBRL(gastoNotas)} · Pgtos: {fmtBRL(gastoPag)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
