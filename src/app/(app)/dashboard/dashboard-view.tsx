"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronRight, Clock } from "lucide-react";
import { fmtBRL, fmtBRLshort, fmtDate } from "@/lib/format";

interface KPIs {
  obrasAtivas: number; obrasTotal: number; funcAtivos: number;
  orcamento: number; gastoTotal: number; receita: number; parcelasAtrasadas: number;
  parcelasAtrasadasValor: number;
}
interface MoM {
  receitaMes: number; receitaMesAnterior: number;
  gastoMes: number; gastoMesAnterior: number;
  mesNome: string;
}
interface NotaPendente { id: string; fornecedor: string | null; valor: number; emitidaEm: string | null; obra: { id: string; nome: string }; }
interface ParcelaVencendo { id: string; valor: number; vencimento: string | null; venda: { id: string; nomeComprador: string }; }
interface ObraEstouro { id: string; nome: string; orcamento: number; gasto: number; }
interface ObraFin { id: string; nome: string; status: string; orcamento: number; progresso: number; gasto: number; }
interface FuncRaw { id: string; nome: string; cargo: string | null; salario: number; }

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

const CAT_LABELS: Record<string, string> = {
  material: "Material", mao_obra: "Mão de obra",
  servicos: "Serviços", equipamentos: "Equipamentos", outros: "Outros",
};
const CAT_COLORS: Record<string, string> = {
  material: "#1e3a5f", mao_obra: "#b45309", servicos: "#6d28d9",
  equipamentos: "#047857", outros: "#6b7280",
};

function Donut({ pct, size = 120 }: { pct: number; size?: number }) {
  const r = (size - 20) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (Math.min(pct, 100) / 100) * circ;
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ink-100)" strokeWidth={14} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--navy-600,#1e3a5f)" strokeWidth={14}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x={size / 2} y={size / 2 - 4} textAnchor="middle" fontFamily="var(--font-display)" fontSize={18} fontWeight={400} fill="var(--fg-primary)">{Math.round(pct)}%</text>
      <text x={size / 2} y={size / 2 + 16} textAnchor="middle" fontFamily="var(--font-sans)" fontSize={10} fill="var(--fg-tertiary)">do orçado</text>
    </svg>
  );
}

export function DashboardView({ nomeUsuario, kpis, mom, notasPendentes, parcelasVencendo, obrasComEstouro, obrasFinanceiro, funcAtivosRaw, gastosPorCategoria }: {
  nomeUsuario: string;
  kpis: KPIs;
  mom: MoM;
  notasPendentes: NotaPendente[];
  parcelasVencendo: ParcelaVencendo[];
  obrasComEstouro: ObraEstouro[];
  obrasFinanceiro: ObraFin[];
  funcAtivosRaw: FuncRaw[];
  gastosPorCategoria: Record<string, number>;
}) {
  const obrasAtivas = obrasFinanceiro.filter((o) => o.status !== "concluida").slice(0, 4);
  const saldo = kpis.orcamento - kpis.gastoTotal;
  const pctGasto = kpis.orcamento > 0 ? Math.round((kpis.gastoTotal / kpis.orcamento) * 100) : 0;

  const hora = new Date().getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";

  // Alertas
  type Alerta = { tone: "danger" | "warning" | "info"; text: string; href: string };
  const alertas: Alerta[] = [];
  if (kpis.parcelasAtrasadas > 0)
    alertas.push({ tone: "danger", text: `${kpis.parcelasAtrasadas} parcela${kpis.parcelasAtrasadas > 1 ? "s" : ""} em atraso`, href: "/vendas" });
  for (const o of obrasComEstouro)
    alertas.push({ tone: "danger", text: `"${o.nome}" estourou o orçamento em ${fmtBRL(o.gasto - o.orcamento)}`, href: `/obras/${o.id}` });
  if (notasPendentes.length > 0)
    alertas.push({ tone: "info", text: `${notasPendentes.length} nota${notasPendentes.length > 1 ? "s" : ""} fiscal aguardando revisão`, href: "/notas" });
  if (parcelasVencendo.length > 0)
    alertas.push({ tone: "warning", text: `${parcelasVencendo.length} parcela${parcelasVencendo.length > 1 ? "s" : ""} vencendo em 7 dias`, href: "/vendas" });

  const toneColor = { danger: "var(--danger-500)", warning: "var(--warning-700)", info: "var(--navy-600)" };

  // Folha mensal
  const folhaMensal = funcAtivosRaw.reduce((s, f) => s + f.salario, 0);

  // Category breakdown
  const catTotal = Object.values(gastosPorCategoria).reduce((s, v) => s + v, 0);
  const cats = Object.entries(CAT_LABELS).map(([k, label]) => ({ k, label, val: gastosPorCategoria[k] ?? 0 })).filter((c) => c.val > 0);

  const cardStyle: React.CSSProperties = {
    background: "var(--bg-surface)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-lg)",
    overflow: "hidden",
    boxShadow: "var(--shadow-xs)",
  };
  const cardHead: React.CSSProperties = {
    padding: "16px 20px",
    borderBottom: "1px solid var(--border-subtle)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  };
  const cardTitle: React.CSSProperties = {
    margin: 0,
    fontFamily: "var(--font-display)",
    fontSize: 17,
    fontWeight: 500,
    color: "var(--fg-primary)",
  };

  return (
    <div>
      {/* Header */}
      <div style={{ padding: "24px 32px", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-surface)" }}>
        <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 500, color: "var(--fg-primary)", letterSpacing: "-0.015em" }}>
          {saudacao}, {nomeUsuario.split(" ")[0]}.
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--fg-tertiary)" }}>Aqui está a situação atual das suas obras e finanças.</p>
      </div>

      <div style={{ padding: "24px 32px", display: "flex", flexDirection: "column", gap: 24 }}>
        {/* KPI strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14 }}>
          {[
            { label: "Obras em andamento", value: String(kpis.obrasAtivas), sub: `${kpis.obrasTotal} obras no total`, color: undefined },
            { label: "Investido nas obras", value: fmtBRLshort(kpis.gastoTotal), sub: `de ${fmtBRLshort(kpis.orcamento)} orçados`, color: undefined },
            { label: "Saldo de orçamento", value: fmtBRLshort(Math.abs(saldo)), sub: saldo >= 0 ? "previsto − realizado" : "em estouro", color: saldo < 0 ? "var(--danger-500)" : undefined },
            { label: "Receita de vendas", value: fmtBRLshort(kpis.receita), sub: "parcelas pagas acumulado", color: "var(--success-700)" },
            { label: "Funcionários ativos", value: String(kpis.funcAtivos), sub: notasPendentes.length ? `${notasPendentes.length} nota(s) em revisão` : "Tudo conciliado", color: undefined },
            { label: "Em inadimplência", value: fmtBRLshort(kpis.parcelasAtrasadasValor), sub: `${kpis.parcelasAtrasadas} parcela${kpis.parcelasAtrasadas !== 1 ? "s" : ""} em atraso`, color: kpis.parcelasAtrasadas > 0 ? "var(--danger-500)" : "var(--fg-muted)" },
          ].map((k) => (
            <div key={k.label} style={cardStyle}>
              <div style={{ padding: "16px 20px" }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--fg-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{k.label}</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 400, color: k.color ?? "var(--fg-primary)", letterSpacing: "-0.02em" }}>{k.value}</div>
                <div style={{ fontSize: 12.5, color: "var(--fg-tertiary)", marginTop: 3 }}>{k.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* MoM comparativo */}
        {(() => {
          const pctReceita = mom.receitaMesAnterior > 0 ? ((mom.receitaMes - mom.receitaMesAnterior) / mom.receitaMesAnterior) * 100 : null;
          const pctGastoMom = mom.gastoMesAnterior > 0 ? ((mom.gastoMes - mom.gastoMesAnterior) / mom.gastoMesAnterior) * 100 : null;
          const resultadoMes = mom.receitaMes - mom.gastoMes;
          function Delta({ pct, invert = false }: { pct: number | null; invert?: boolean }) {
            if (pct === null) return <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>sem histórico</span>;
            const positive = invert ? pct < 0 : pct > 0;
            const color = positive ? "var(--success-700)" : pct === 0 ? "var(--fg-muted)" : "var(--danger-500)";
            return <span style={{ fontSize: 12.5, color, fontWeight: 600 }}>{pct > 0 ? "▲" : pct < 0 ? "▼" : "="} {Math.abs(pct).toFixed(1)}% vs mês anterior</span>;
          }
          return (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
              {[
                { label: `Receita — ${mom.mesNome}`, value: fmtBRLshort(mom.receitaMes), delta: <Delta pct={pctReceita} />, color: "var(--success-700)" },
                { label: `Gastos — ${mom.mesNome}`, value: fmtBRLshort(mom.gastoMes), delta: <Delta pct={pctGastoMom} invert />, color: mom.gastoMes > mom.receitaMes ? "var(--danger-500)" : "var(--fg-primary)" },
                { label: `Resultado — ${mom.mesNome}`, value: fmtBRLshort(Math.abs(resultadoMes)), delta: <span style={{ fontSize: 12.5, color: resultadoMes >= 0 ? "var(--success-700)" : "var(--danger-500)", fontWeight: 600 }}>{resultadoMes >= 0 ? "Superávit" : "Déficit"}</span>, color: resultadoMes >= 0 ? "var(--success-700)" : "var(--danger-500)" },
              ].map((k) => (
                <div key={k.label} style={{ ...cardStyle, borderTop: `3px solid ${k.color}` }}>
                  <div style={{ padding: "14px 20px" }}>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--fg-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>{k.label}</div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 400, color: k.color, letterSpacing: "-0.02em", marginBottom: 4 }}>{k.value}</div>
                    {k.delta}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}

        {/* Two-column main */}
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20, alignItems: "start" }}>
          {/* Left column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Obras em andamento */}
            <div style={cardStyle}>
              <div style={cardHead}>
                <h3 style={cardTitle}>Obras em andamento</h3>
                <Link href="/obras" style={{ fontSize: 13, color: "var(--navy-700)", textDecoration: "none", fontWeight: 600 }}>Ver todas →</Link>
              </div>
              {obrasAtivas.length === 0 ? (
                <p style={{ padding: "24px 20px", textAlign: "center", color: "var(--fg-tertiary)", fontSize: 14, margin: 0 }}>Nenhuma obra em andamento.</p>
              ) : (
                <div style={{ padding: "12px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
                  {obrasAtivas.map((o) => {
                    const estouro = o.gasto > o.orcamento;
                    const pct = o.orcamento > 0 ? Math.min(Math.round((o.gasto / o.orcamento) * 100), 100) : 0;
                    return (
                      <Link key={o.id} href={`/obras/${o.id}`} style={{ textDecoration: "none" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 6 }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--fg-primary)" }}>{o.nome}</div>
                            <div style={{ fontSize: 12.5, color: "var(--fg-tertiary)" }}>{o.progresso}% executado</div>
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 600, color: estouro ? "var(--danger-500)" : "var(--fg-secondary)", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                            {fmtBRLshort(o.gasto)} <span style={{ color: "var(--fg-muted)", fontWeight: 400 }}>/ {fmtBRLshort(o.orcamento)}</span>
                          </span>
                        </div>
                        <div style={{ height: 7, borderRadius: "var(--radius-full)", background: "var(--ink-100)", overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: estouro ? "var(--danger-500)" : pct > 80 ? "#d97706" : "#1e3a5f", borderRadius: "var(--radius-full)", transition: "width 600ms" }} />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Donut — Investimento por categoria */}
            <div style={cardStyle}>
              <div style={cardHead}><h3 style={cardTitle}>Investimento por categoria</h3></div>
              <div style={{ padding: "20px 24px", display: "flex", gap: 28, alignItems: "center", flexWrap: "wrap" }}>
                <Donut pct={pctGasto} />
                <div style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: 10 }}>
                  {cats.length === 0 ? (
                    <p style={{ fontSize: 13, color: "var(--fg-tertiary)", margin: 0 }}>Nenhuma nota confirmada ainda.</p>
                  ) : (
                    cats.map((c) => {
                      const pct = catTotal > 0 ? Math.round((c.val / catTotal) * 100) : 0;
                      return (
                        <div key={c.k}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                            <span style={{ fontWeight: 600, color: "var(--fg-primary)" }}>{c.label}</span>
                            <span style={{ color: "var(--fg-tertiary)", fontVariantNumeric: "tabular-nums" }}>{fmtBRLshort(c.val)} · {pct}%</span>
                          </div>
                          <div style={{ height: 6, borderRadius: "var(--radius-full)", background: "var(--ink-100)", overflow: "hidden" }}>
                            <div style={{ width: `${pct}%`, height: "100%", background: CAT_COLORS[c.k] ?? "#6b7280", borderRadius: "var(--radius-full)" }} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Pontos de atenção */}
            <div style={cardStyle}>
              <div style={cardHead}><h3 style={cardTitle}>Pontos de atenção</h3></div>
              <div style={{ padding: "14px 20px" }}>
                {alertas.length === 0 ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--success-700)", fontSize: 14 }}>
                    <CheckCircle2 size={18} />Nenhum alerta. Tudo dentro do previsto.
                  </div>
                ) : (
                  alertas.map((a, i) => (
                    <Link key={i} href={a.href} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", textDecoration: "none", borderBottom: i < alertas.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                      <AlertTriangle size={16} style={{ color: toneColor[a.tone], flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 13.5, color: "var(--fg-secondary)" }}>{a.text}</span>
                      <ChevronRight size={15} style={{ color: "var(--fg-muted)", flexShrink: 0 }} />
                    </Link>
                  ))
                )}
              </div>
            </div>

            {/* Folha do mês */}
            <div style={cardStyle}>
              <div style={cardHead}>
                <h3 style={cardTitle}>Folha do mês</h3>
                <Link href="/funcionarios" style={{ fontSize: 13, color: "var(--navy-700)", textDecoration: "none", fontWeight: 600 }}>Equipe →</Link>
              </div>
              <div style={{ padding: "18px 20px" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 400, color: "var(--fg-primary)", letterSpacing: "-0.02em" }}>{fmtBRL(folhaMensal)}</div>
                <div style={{ fontSize: 13, color: "var(--fg-tertiary)", marginBottom: 16 }}>{kpis.funcAtivos} funcionários ativos · estimativa mensal</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {funcAtivosRaw.length === 0 ? (
                    <p style={{ fontSize: 13, color: "var(--fg-tertiary)", margin: 0 }}>Nenhum funcionário ativo.</p>
                  ) : (
                    funcAtivosRaw.map((f) => (
                      <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: "50%", background: avatarBg(f.nome), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                          {avatarInitials(f.nome)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--fg-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.nome}</div>
                          <div style={{ fontSize: 12, color: "var(--fg-tertiary)" }}>{f.cargo ?? "—"}</div>
                        </div>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--fg-secondary)", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{fmtBRLshort(f.salario)}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Parcelas vencendo */}
            <div style={cardStyle}>
              <div style={cardHead}>
                <h3 style={cardTitle}>Parcelas vencendo em 7 dias</h3>
                <Link href="/vendas" style={{ fontSize: 13, color: "var(--navy-700)", textDecoration: "none", fontWeight: 600 }}>Ver vendas →</Link>
              </div>
              {parcelasVencendo.length === 0 ? (
                <p style={{ padding: "24px 20px", textAlign: "center", color: "var(--fg-tertiary)", fontSize: 14, margin: 0 }}>Nenhuma parcela vencendo em breve.</p>
              ) : (
                parcelasVencendo.map((p) => (
                  <div key={p.id} style={{ padding: "12px 20px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "var(--fg-primary)" }}>{p.venda.nomeComprador}</p>
                      <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--fg-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                        <Clock size={11} /> Vence {fmtDate(p.vencimento)}
                      </p>
                    </div>
                    <p style={{ margin: 0, fontSize: 15, fontFamily: "var(--font-display)", color: "var(--fg-primary)" }}>{fmtBRL(p.valor)}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
