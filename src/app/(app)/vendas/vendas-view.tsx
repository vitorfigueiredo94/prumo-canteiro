"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Plus, MapPin, ChevronRight, Search } from "lucide-react";
import { VendaForm } from "./venda-form";
import { criarVenda } from "./actions";
import { fmtBRL, fmtBRLshort, fmtDate } from "@/lib/format";

interface ParcelaLite { id: string; status: string; valor: number; vencimento: string | null; }
interface TerrenoLite { id: string; nome: string; cidade: string; }
interface Venda {
  id: string; nomeComprador: string; valorTotal: number; entrada: number;
  numeroParcelas: number; dataContrato: string | null;
  terreno: TerrenoLite;
  parcelas: ParcelaLite[];
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

function computeVenda(v: Venda) {
  const recebido = v.parcelas.filter((p) => p.status === "paga").reduce((s, p) => s + p.valor, 0) + v.entrada;
  const saldo = v.valorTotal - recebido;
  const pct = v.valorTotal > 0 ? Math.round((recebido / v.valorTotal) * 100) : 0;
  const quitada = pct >= 100;
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const atrasada = v.parcelas.some((p) =>
    p.status !== "paga" && p.vencimento != null && new Date(p.vencimento) < hoje
  );
  return { recebido, saldo, pct, quitada, atrasada };
}

const STATUS_FILTER = [
  { k: "todas", l: "Todas" },
  { k: "em_pagamento", l: "Em pagamento" },
  { k: "atrasada", l: "Em atraso" },
  { k: "quitada", l: "Quitadas" },
];

export function VendasView({ vendas, terrenos }: { vendas: Venda[]; terrenos: TerrenoLite[] }) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todas");
  const [showNew, setShowNew] = useState(false);
  const closeNew = useCallback(() => setShowNew(false), []);

  const computed = vendas.map((v) => ({ ...v, fin: computeVenda(v) }));

  const filtered = computed
    .filter((v) => {
      if (filtro === "todas") return true;
      if (filtro === "quitada") return v.fin.quitada;
      if (filtro === "atrasada") return v.fin.atrasada && !v.fin.quitada;
      return !v.fin.quitada && !v.fin.atrasada; // em_pagamento
    })
    .filter((v) =>
      !busca.trim() ||
      v.nomeComprador.toLowerCase().includes(busca.toLowerCase()) ||
      v.terreno.nome.toLowerCase().includes(busca.toLowerCase())
    );

  const totalVendas = vendas.reduce((s, v) => s + v.valorTotal, 0);
  const totalRecebido = computed.reduce((s, v) => s + v.fin.recebido, 0);
  const totalAReceber = totalVendas - totalRecebido;
  const qtdAtrasadas = computed.filter((v) => v.fin.atrasada && !v.fin.quitada).length;

  return (
    <>
      {/* Header */}
      <div style={{ padding: "22px 32px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-surface)" }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 500, color: "var(--fg-primary)", letterSpacing: "-0.015em" }}>Vendas</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--fg-tertiary)" }}>{vendas.length} {vendas.length === 1 ? "contrato" : "contratos"}</p>
        </div>
        <button onClick={() => setShowNew(true)} style={{ height: 40, padding: "0 16px", background: "var(--navy-700)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 }}>
          <Plus size={16} /> Registrar venda
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: "24px 32px" }}>
        {/* KPI cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "16px 20px", boxShadow: "var(--shadow-xs)" }}>
            <div style={{ fontSize: 11.5, color: "var(--fg-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Em vendas</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 400, color: "var(--fg-primary)", letterSpacing: "-0.02em", marginTop: 4 }}>{fmtBRLshort(totalVendas)}</div>
            <div style={{ fontSize: 12.5, color: "var(--fg-tertiary)", marginTop: 2 }}>{vendas.length} contratos</div>
          </div>
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "16px 20px", boxShadow: "var(--shadow-xs)" }}>
            <div style={{ fontSize: 11.5, color: "var(--fg-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Já recebido</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 400, color: "var(--success-700)", letterSpacing: "-0.02em", marginTop: 4 }}>{fmtBRLshort(totalRecebido)}</div>
            <div style={{ fontSize: 12.5, color: "var(--fg-tertiary)", marginTop: 2 }}>{totalVendas > 0 ? Math.round((totalRecebido / totalVendas) * 100) : 0}% do total</div>
          </div>
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "16px 20px", boxShadow: "var(--shadow-xs)" }}>
            <div style={{ fontSize: 11.5, color: "var(--fg-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>A receber</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 400, color: "var(--fg-primary)", letterSpacing: "-0.02em", marginTop: 4 }}>{fmtBRLshort(totalAReceber)}</div>
            <div style={{ fontSize: 12.5, color: "var(--fg-tertiary)", marginTop: 2 }}>saldo dos contratos</div>
          </div>
          <div style={{ background: "var(--bg-surface)", border: `1px solid ${qtdAtrasadas ? "var(--danger-200,#fecaca)" : "var(--border-subtle)"}`, borderRadius: "var(--radius-lg)", padding: "16px 20px", boxShadow: "var(--shadow-xs)" }}>
            <div style={{ fontSize: 11.5, color: "var(--fg-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Em atraso</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 400, color: qtdAtrasadas ? "var(--danger-500)" : "var(--fg-primary)", letterSpacing: "-0.02em", marginTop: 4 }}>{qtdAtrasadas}</div>
            <div style={{ fontSize: 12.5, color: "var(--fg-tertiary)", marginTop: 2 }}>{qtdAtrasadas ? "requer cobrança" : "tudo em dia"}</div>
          </div>
        </div>

        {/* Filtros + busca */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {STATUS_FILTER.map((f) => {
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
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar venda…" style={{ height: 38, padding: "0 12px 0 34px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-surface)", color: "var(--fg-primary)", fontFamily: "var(--font-sans)", fontSize: 14, width: 260, outline: "none" }} onFocus={(e) => { e.target.style.borderColor = "var(--border-focus)"; e.target.style.boxShadow = "var(--shadow-focus)"; }} onBlur={(e) => { e.target.style.borderColor = "var(--border-default)"; e.target.style.boxShadow = "none"; }} />
          </div>
        </div>

        {/* Cards */}
        {filtered.length === 0 ? (
          <p style={{ textAlign: "center", padding: "60px 0", color: "var(--fg-tertiary)", fontSize: 15 }}>Nenhuma venda encontrada.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 18 }}>
            {filtered.map((v) => {
              const { recebido, saldo, pct, quitada, atrasada } = v.fin;
              const barColor = quitada ? "var(--success-500)" : atrasada ? "var(--danger-500)" : "#b45309";
              const pagas = v.parcelas.filter((p) => p.status === "paga").length;

              return (
                <Link key={v.id} href={`/vendas/${v.id}`} style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-xs)", overflow: "hidden", display: "flex", flexDirection: "column", textDecoration: "none", transition: "box-shadow 140ms, border-color 140ms" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-md)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--border-default)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-xs)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--border-subtle)"; }}
                >
                  <div style={{ padding: "18px 20px 16px", flex: 1 }}>
                    {/* Buyer row: avatar + name + terreno */}
                    <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 14 }}>
                      <div style={{ width: 42, height: 42, borderRadius: "50%", background: avatarBg(v.nomeComprador), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                        {avatarInitials(v.nomeComprador)}
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 500, color: "var(--fg-primary)", lineHeight: 1.15 }}>{v.nomeComprador}</h3>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--fg-tertiary)", marginTop: 1 }}>
                          <MapPin size={12} />{v.terreno.nome} · {v.terreno.cidade}
                          {v.dataContrato && <span style={{ marginLeft: 6 }}>{fmtDate(v.dataContrato)}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Progress */}
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "var(--fg-tertiary)", marginBottom: 6 }}>
                      <span>{pct}% pago {v.numeroParcelas ? `· ${pagas}/${v.numeroParcelas} parcelas` : "· à vista"}</span>
                    </div>
                    <div style={{ height: 8, borderRadius: "var(--radius-full)", background: "var(--ink-100)", overflow: "hidden" }}>
                      <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: barColor, borderRadius: "var(--radius-full)", transition: "width 600ms" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--fg-tertiary)", marginTop: 4 }}>
                      <span>Recebido: {fmtBRL(recebido)}</span>
                      <span>Total: {fmtBRL(v.valorTotal)}</span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div style={{ display: "flex", borderTop: "1px solid var(--border-subtle)", background: "var(--ink-50)" }}>
                    <div style={{ flex: 1, padding: "11px 16px" }}>
                      <div style={{ fontSize: 11.5, color: "var(--fg-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Valor total</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--fg-primary)", fontVariantNumeric: "tabular-nums" }}>{fmtBRLshort(v.valorTotal)}</div>
                    </div>
                    <div style={{ width: 1, background: "var(--border-subtle)" }} />
                    <div style={{ flex: 1, padding: "11px 16px" }}>
                      <div style={{ fontSize: 11.5, color: "var(--fg-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Recebido</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--success-700)", fontVariantNumeric: "tabular-nums" }}>{fmtBRLshort(recebido)}</div>
                    </div>
                    <div style={{ width: 1, background: "var(--border-subtle)" }} />
                    <div style={{ flex: 1, padding: "11px 16px" }}>
                      <div style={{ fontSize: 11.5, color: "var(--fg-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Falta</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: saldo <= 0 ? "var(--success-700)" : "var(--fg-primary)", fontVariantNumeric: "tabular-nums" }}>{fmtBRLshort(Math.max(saldo, 0))}</div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {showNew && <VendaForm action={criarVenda} terrenos={terrenos} onClose={closeNew} />}
    </>
  );
}
