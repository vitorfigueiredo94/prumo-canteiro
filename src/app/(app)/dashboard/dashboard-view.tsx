"use client";

import Link from "next/link";
import { Construction, Users, DollarSign, AlertTriangle, Clock, CheckCircle2, TrendingDown } from "lucide-react";
import { fmtBRL, fmtDate } from "@/lib/format";

interface KPIs {
  obrasAtivas: number; obrasTotal: number; funcAtivos: number;
  orcamento: number; gastoTotal: number; receita: number; parcelasAtrasadas: number;
}
interface NotaPendente { id: string; fornecedor: string | null; valor: number; emitidaEm: string | null; obra: { id: string; nome: string }; }
interface ParcelaVencendo { id: string; valor: number; vencimento: string | null; venda: { id: string; nomeComprador: string }; }
interface ObraEstouro { id: string; nome: string; orcamento: number; gasto: number; }

export function DashboardView({ nomeUsuario, kpis, notasPendentes, parcelasVencendo, obrasComEstouro }: {
  nomeUsuario: string;
  kpis: KPIs;
  notasPendentes: NotaPendente[];
  parcelasVencendo: ParcelaVencendo[];
  obrasComEstouro: ObraEstouro[];
}) {
  const saldo = kpis.receita - kpis.gastoTotal;
  const pctGasto = kpis.orcamento > 0 ? Math.round((kpis.gastoTotal / kpis.orcamento) * 100) : 0;

  const hora = new Date().getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div>
      {/* Header */}
      <div style={{ padding: "24px 32px", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-surface)" }}>
        <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 500, color: "var(--fg-primary)", letterSpacing: "-0.015em" }}>
          {saudacao}, {nomeUsuario.split(" ")[0]}.
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--fg-tertiary)" }}>Aqui está a situação atual das suas obras e finanças.</p>
      </div>

      <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: 28 }}>
        {/* KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
          {[
            { label: "Obras ativas", value: `${kpis.obrasAtivas}/${kpis.obrasTotal}`, sub: "em andamento", Icon: Construction, accent: "var(--navy-700)" },
            { label: "Funcionários ativos", value: String(kpis.funcAtivos), sub: "cadastrados", Icon: Users, accent: "var(--success-700)" },
            { label: "Orçamento total", value: fmtBRL(kpis.orcamento), sub: `${pctGasto}% executado`, Icon: DollarSign, accent: "var(--navy-600)" },
            { label: "Gasto total", value: fmtBRL(kpis.gastoTotal), sub: "NFs + pagamentos", Icon: TrendingDown, accent: "var(--danger-500)" },
            { label: "Receita vendas", value: fmtBRL(kpis.receita), sub: "parcelas recebidas", Icon: CheckCircle2, accent: "var(--success-700)" },
            { label: "Saldo operacional", value: fmtBRL(Math.abs(saldo)), sub: saldo >= 0 ? "positivo" : "negativo", Icon: DollarSign, accent: saldo >= 0 ? "var(--success-700)" : "var(--danger-500)" },
          ].map((k) => (
            <div key={k.label} style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "18px 22px", boxShadow: "var(--shadow-xs)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{k.label}</p>
                <k.Icon size={16} style={{ color: k.accent }} />
              </div>
              <p style={{ margin: "0 0 4px", fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 400, color: k.accent }}>{k.value}</p>
              <p style={{ margin: 0, fontSize: 12, color: "var(--fg-muted)" }}>{k.sub}</p>
            </div>
          ))}
        </div>

        {/* Alerts row */}
        {(obrasComEstouro.length > 0 || kpis.parcelasAtrasadas > 0) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {kpis.parcelasAtrasadas > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", background: "var(--danger-50)", border: "1px solid rgba(181,54,60,0.3)", borderRadius: "var(--radius-md)" }}>
                <AlertTriangle size={18} style={{ color: "var(--danger-500)", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--danger-500)" }}>
                    {kpis.parcelasAtrasadas} parcela{kpis.parcelasAtrasadas > 1 ? "s" : ""} em atraso
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--danger-500)" }}>Verifique o extrato dos compradores</p>
                </div>
                <Link href="/vendas" style={{ fontSize: 13, fontWeight: 600, color: "var(--danger-500)", textDecoration: "none" }}>Ver vendas →</Link>
              </div>
            )}
            {obrasComEstouro.map((o) => (
              <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", background: "var(--warning-50)", border: "1px solid rgba(180,106,22,0.3)", borderRadius: "var(--radius-md)" }}>
                <AlertTriangle size={18} style={{ color: "var(--warning-700)", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--warning-700)" }}>Estouro em "{o.nome}"</p>
                  <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--warning-700)" }}>Gasto {fmtBRL(o.gasto)} · Orçamento {fmtBRL(o.orcamento)}</p>
                </div>
                <Link href={`/obras/${o.id}`} style={{ fontSize: 13, fontWeight: 600, color: "var(--warning-700)", textDecoration: "none" }}>Ver obra →</Link>
              </div>
            ))}
          </div>
        )}

        {/* Two-column panels */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Notas pendentes */}
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 500, color: "var(--fg-primary)" }}>NFs pendentes</h3>
              <Link href="/notas" style={{ fontSize: 13, color: "var(--navy-700)", textDecoration: "none", fontWeight: 600 }}>Ver todas →</Link>
            </div>
            {notasPendentes.length === 0 ? (
              <p style={{ padding: "24px 20px", textAlign: "center", color: "var(--fg-tertiary)", fontSize: 14, margin: 0 }}>Nenhuma NF pendente.</p>
            ) : (
              <div>
                {notasPendentes.map((n) => (
                  <div key={n.id} style={{ padding: "12px 20px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "var(--fg-primary)" }}>{n.fornecedor ?? "Fornecedor"}</p>
                      <p style={{ margin: 0, fontSize: 12, color: "var(--fg-muted)" }}>{n.obra.nome} · {fmtDate(n.emitidaEm)}</p>
                    </div>
                    <p style={{ margin: 0, fontSize: 15, fontFamily: "var(--font-display)", color: "var(--fg-primary)" }}>{fmtBRL(n.valor)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Parcelas vencendo */}
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 500, color: "var(--fg-primary)" }}>Parcelas vencendo em 7 dias</h3>
              <Link href="/vendas" style={{ fontSize: 13, color: "var(--navy-700)", textDecoration: "none", fontWeight: 600 }}>Ver vendas →</Link>
            </div>
            {parcelasVencendo.length === 0 ? (
              <p style={{ padding: "24px 20px", textAlign: "center", color: "var(--fg-tertiary)", fontSize: 14, margin: 0 }}>Nenhuma parcela vencendo em breve.</p>
            ) : (
              <div>
                {parcelasVencendo.map((p) => (
                  <div key={p.id} style={{ padding: "12px 20px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "var(--fg-primary)" }}>{p.venda.nomeComprador}</p>
                      <p style={{ margin: 0, fontSize: 12, color: "var(--fg-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                        <Clock size={11} /> Vence {fmtDate(p.vencimento)}
                      </p>
                    </div>
                    <p style={{ margin: 0, fontSize: 15, fontFamily: "var(--font-display)", color: "var(--fg-primary)" }}>{fmtBRL(p.valor)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
