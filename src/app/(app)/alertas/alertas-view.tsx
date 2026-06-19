"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Clock, Calendar, Wrench, Bell, CheckCircle } from "lucide-react";

interface ParcelaAlerta {
  id: string;
  nomeComprador: string;
  terreno: string | null;
  numero: number | null;
  valor: number;
  vencimento: string | null;
  diasAtraso?: number;
  diasRestantes?: number;
}

interface ObraRisco {
  id: string;
  nome: string;
  status: string;
  progresso: number;
  prazo: string | null;
  responsavel: string | null;
  diasRestantes: number | null;
}

interface ChamadoAlerta {
  id: string;
  nomeComprador: string;
  componente: string;
  descricao: string;
  criadoEm: string;
}

interface PainelData {
  atrasadas: ParcelaAlerta[];
  vencendoHoje: ParcelaAlerta[];
  vencendoEm3d: ParcelaAlerta[];
  obrasRisco: ObraRisco[];
  chamados: ChamadoAlerta[];
  totais: {
    atrasadas: number; vencendoHoje: number; vencendoEm3d: number;
    obrasRisco: number; chamados: number;
  };
}

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}
function fmtDias(n: number) {
  return `${n} ${n === 1 ? "dia" : "dias"}`;
}

const STATUS_LABEL: Record<string, string> = {
  planejamento: "Planejamento",
  em_andamento: "Em andamento",
};
const STATUS_COLOR: Record<string, string> = {
  planejamento: "#6b7280",
  em_andamento: "#b45309",
};

export function AlertasView() {
  const [data, setData]     = useState<PainelData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/alertas/painel")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ textAlign: "center", padding: "80px 0", color: "var(--fg-tertiary)", fontSize: 15 }}>Carregando alertas…</div>
  );

  if (!data) return (
    <div style={{ textAlign: "center", padding: "80px 0", color: "var(--fg-tertiary)", fontSize: 15 }}>Erro ao carregar alertas.</div>
  );

  const totalAlertas = data.totais.atrasadas + data.totais.vencendoHoje + data.totais.obrasRisco + data.totais.chamados;

  const SectionHeader = ({ icon: Icon, title, count, color }: { icon: React.ElementType; title: string; count: number; color: string }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <div style={{ width: 34, height: 34, borderRadius: 8, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={17} style={{ color }} />
      </div>
      <span style={{ fontWeight: 700, fontSize: 15.5, color: "var(--fg-primary)", flex: 1 }}>{title}</span>
      {count > 0 && (
        <span style={{ minWidth: 24, height: 24, padding: "0 6px", borderRadius: 12, background: color, color: "#fff", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {count}
        </span>
      )}
    </div>
  );

  const EmptyState = ({ msg }: { msg: string }) => (
    <div style={{ padding: "20px 0", display: "flex", alignItems: "center", gap: 8, color: "#16a34a", fontSize: 14 }}>
      <CheckCircle size={16} /> {msg}
    </div>
  );

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "32px 24px" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 500, color: "var(--fg-primary)", letterSpacing: "-0.015em", display: "flex", alignItems: "center", gap: 10 }}>
          <Bell size={26} style={{ color: totalAlertas > 0 ? "#dc2626" : "#16a34a" }} />
          Painel de Alertas
        </h1>
        <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--fg-tertiary)" }}>
          {totalAlertas === 0 ? "Tudo em ordem — nenhum alerta ativo." : `${totalAlertas} alerta${totalAlertas !== 1 ? "s" : ""} requerem atenção.`}
        </p>
      </div>

      {/* Resumo rápido */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: 12, marginBottom: 28 }}>
        {[
          { label: "Parcelas atrasadas",  value: data.totais.atrasadas,    color: "#dc2626" },
          { label: "Vencendo hoje",       value: data.totais.vencendoHoje, color: "#d97706" },
          { label: "Vencendo em 3 dias",  value: data.totais.vencendoEm3d, color: "#b45309" },
          { label: "Obras em risco",      value: data.totais.obrasRisco,   color: "#7c3aed" },
          { label: "Chamados abertos",    value: data.totais.chamados,     color: "#0369a1" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: "var(--bg-surface)", border: `1px solid ${value > 0 ? `${color}40` : "var(--border-subtle)"}`, borderRadius: "var(--radius-lg)", padding: "16px 18px" }}>
            <div style={{ fontSize: 11, color: "var(--fg-muted)", textTransform: "uppercase" as const, letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 28, fontFamily: "var(--font-display)", fontWeight: 400, color: value > 0 ? color : "#16a34a" }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Parcelas atrasadas */}
        <div style={{ background: "var(--bg-surface)", border: data.atrasadas.length > 0 ? "1px solid rgba(220,38,38,0.3)" : "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "20px 22px" }}>
          <SectionHeader icon={AlertTriangle} title="Parcelas atrasadas" count={data.totais.atrasadas} color="#dc2626" />
          {data.atrasadas.length === 0 ? (
            <EmptyState msg="Nenhuma parcela em atraso." />
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Comprador", "Terreno", "Parcela", "Vencimento", "Atraso", "Valor"].map((h, i) => (
                    <th key={i} style={{ padding: "8px 12px", fontSize: 11, fontWeight: 700, color: "var(--fg-muted)", textTransform: "uppercase" as const, letterSpacing: "0.06em", background: "var(--ink-50)", borderBottom: "1px solid var(--border-subtle)", textAlign: i >= 2 ? "right" as const : "left" as const }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.atrasadas.map((p) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td style={{ padding: "10px 12px", fontSize: 14, fontWeight: 600, color: "var(--fg-primary)" }}>{p.nomeComprador}</td>
                    <td style={{ padding: "10px 12px", fontSize: 13, color: "var(--fg-tertiary)" }}>{p.terreno ?? "—"}</td>
                    <td style={{ padding: "10px 12px", fontSize: 13, color: "var(--fg-secondary)", textAlign: "right" }}>#{p.numero ?? "—"}</td>
                    <td style={{ padding: "10px 12px", fontSize: 13, color: "#dc2626", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtDate(p.vencimento)}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right" }}>
                      <span style={{ display: "inline-block", padding: "2px 9px", borderRadius: 99, background: "#fef2f2", color: "#dc2626", fontSize: 12, fontWeight: 700 }}>
                        {fmtDias(p.diasAtraso ?? 0)}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: 14, fontWeight: 700, color: "#dc2626", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {fmtBRL(p.valor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Vencendo hoje */}
        {data.vencendoHoje.length > 0 && (
          <div style={{ background: "var(--bg-surface)", border: "1px solid rgba(217,119,6,0.3)", borderRadius: "var(--radius-lg)", padding: "20px 22px" }}>
            <SectionHeader icon={Clock} title="Vencendo hoje" count={data.totais.vencendoHoje} color="#d97706" />
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {data.vencendoHoje.map((p, i) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < data.vencendoHoje.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-primary)" }}>{p.nomeComprador}</span>
                    {p.terreno && <span style={{ fontSize: 12.5, color: "var(--fg-muted)", marginLeft: 8 }}>{p.terreno}</span>}
                  </div>
                  <span style={{ fontSize: 12.5, color: "var(--fg-secondary)" }}>Parcela #{p.numero ?? "—"}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#d97706", fontVariantNumeric: "tabular-nums" }}>{fmtBRL(p.valor)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vencendo em 3 dias */}
        {data.vencendoEm3d.length > 0 && (
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "20px 22px" }}>
            <SectionHeader icon={Clock} title="Vencendo em até 3 dias" count={data.totais.vencendoEm3d} color="#b45309" />
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {data.vencendoEm3d.map((p, i) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < data.vencendoEm3d.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-primary)" }}>{p.nomeComprador}</span>
                    {p.terreno && <span style={{ fontSize: 12.5, color: "var(--fg-muted)", marginLeft: 8 }}>{p.terreno}</span>}
                  </div>
                  <span style={{ fontSize: 12.5, color: "var(--fg-secondary)" }}>Parcela #{p.numero ?? "—"} · {fmtDate(p.vencimento)}</span>
                  <span style={{ display: "inline-block", padding: "2px 9px", borderRadius: 99, background: "#fef3c7", color: "#b45309", fontSize: 12, fontWeight: 700 }}>
                    em {fmtDias(p.diasRestantes ?? 0)}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--fg-primary)", fontVariantNumeric: "tabular-nums" }}>{fmtBRL(p.valor)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Obras em risco */}
        <div style={{ background: "var(--bg-surface)", border: data.obrasRisco.length > 0 ? "1px solid rgba(124,58,237,0.25)" : "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "20px 22px" }}>
          <SectionHeader icon={Calendar} title="Obras com prazo em risco (próximos 30 dias)" count={data.totais.obrasRisco} color="#7c3aed" />
          {data.obrasRisco.length === 0 ? (
            <EmptyState msg="Nenhuma obra com prazo crítico." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {data.obrasRisco.map((o, i) => {
                const atrasada = (o.diasRestantes ?? 1) <= 0;
                const diasLabel = atrasada
                  ? `${Math.abs(o.diasRestantes ?? 0)} dias atrasada`
                  : `${fmtDias(o.diasRestantes ?? 0)} restantes`;
                const badgeColor = atrasada ? "#dc2626" : "#7c3aed";
                const badgeBg   = atrasada ? "#fef2f2" : "#f5f3ff";
                return (
                  <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderBottom: i < data.obrasRisco.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Link href={`/obras/${o.id}`} style={{ fontSize: 14.5, fontWeight: 600, color: "var(--navy-700)", textDecoration: "none" }}>{o.nome}</Link>
                      <div style={{ display: "flex", gap: 10, marginTop: 3, flexWrap: "wrap" as const }}>
                        <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>Prazo: {fmtDate(o.prazo)}</span>
                        {o.responsavel && <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>· {o.responsavel}</span>}
                        <span style={{ fontSize: 12, color: STATUS_COLOR[o.status] ?? "var(--fg-muted)" }}>{STATUS_LABEL[o.status] ?? o.status}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fg-primary)" }}>{o.progresso}%</div>
                        <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>progresso</div>
                      </div>
                      <div style={{ width: 80 }}>
                        <div style={{ height: 6, background: "var(--ink-100)", borderRadius: 99, overflow: "hidden" }}>
                          <div style={{ width: `${o.progresso}%`, height: "100%", background: "#7c3aed", borderRadius: 99 }} />
                        </div>
                      </div>
                      <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 99, background: badgeBg, color: badgeColor, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" as const }}>
                        {diasLabel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Chamados de assistência abertos */}
        <div style={{ background: "var(--bg-surface)", border: data.chamados.length > 0 ? "1px solid rgba(3,105,161,0.25)" : "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "20px 22px" }}>
          <SectionHeader icon={Wrench} title="Chamados de pós-obra abertos" count={data.totais.chamados} color="#0369a1" />
          {data.chamados.length === 0 ? (
            <EmptyState msg="Nenhum chamado de assistência em aberto." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {data.chamados.map((c, i) => (
                <div key={c.id} style={{ display: "flex", gap: 14, padding: "12px 0", borderBottom: i < data.chamados.length - 1 ? "1px solid var(--border-subtle)" : "none", alignItems: "flex-start" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(3,105,161,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Wrench size={16} style={{ color: "#0369a1" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-primary)" }}>{c.nomeComprador}</div>
                    <div style={{ fontSize: 12.5, color: "var(--fg-secondary)", marginTop: 2 }}>
                      <strong>{c.componente}</strong> — {c.descricao.length > 80 ? c.descricao.slice(0, 80) + "…" : c.descricao}
                    </div>
                  </div>
                  <span style={{ fontSize: 12, color: "var(--fg-muted)", whiteSpace: "nowrap" as const, flexShrink: 0 }}>
                    {fmtDate(c.criadoEm)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
