import { prisma } from "@/lib/prisma";
import { fmtBRL } from "@/lib/format";

function fmtK(v: number) {
  if (v >= 1000) return "R$ " + (v / 1000).toFixed(1).replace(".", ",") + "k";
  return fmtBRL(v);
}
function mesLabel(comp: string) {
  const d = new Date(comp + "-15");
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}
function fmtComp(comp: string) {
  const [y, m] = comp.split("-");
  const meses = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${meses[parseInt(m) - 1]}/${y}`;
}

const card: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
  padding: "20px 24px",
};
const Th = ({ children }: { children: React.ReactNode }) => (
  <th style={{ padding: "10px 16px", fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.08)", textAlign: "left" as const }}>{children}</th>
);
const Td = ({ children, right }: { children: React.ReactNode; right?: boolean }) => (
  <td style={{ padding: "12px 16px", fontSize: 13.5, color: "#CBD5E1", borderBottom: "1px solid rgba(255,255,255,0.05)", verticalAlign: "middle", textAlign: right ? "right" : "left" as const }}>{children}</td>
);

export default async function VisaoGeralPage() {
  const agora = new Date();
  const competenciaAtual = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;

  const last12 = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(agora.getFullYear(), agora.getMonth() - (11 - i), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [empresas, historicoRaw, faturasMes, proximasFaturas] = await Promise.all([
    prisma.empresa.findMany({
      include: {
        assinatura: { include: { plano: true } },
        _count: { select: { usuarios: true } },
      },
    }),
    prisma.fatura.groupBy({
      by: ["competencia"],
      where: { status: "paga", competencia: { in: last12 } },
      _sum: { valor: true },
    }),
    prisma.fatura.findMany({ where: { competencia: competenciaAtual } }),
    prisma.fatura.findMany({
      where: { status: { in: ["pendente", "atrasada"] } },
      orderBy: { vencimento: "asc" },
      take: 6,
    }),
  ]);

  const ativas = empresas.filter(e => e.assinatura?.status === "ativo");
  const trial  = empresas.filter(e => e.assinatura?.status === "trial");
  const inad   = empresas.filter(e => e.assinatura?.status === "inadimplente");
  const cancel = empresas.filter(e => e.assinatura?.status === "cancelado");

  const mrr    = ativas.reduce((s, e) => s + Number(e.assinatura?.plano?.preco ?? 0), 0);
  const arr    = mrr * 12;
  const ticket = ativas.length > 0 ? mrr / ativas.length : 0;
  const churn  = empresas.length > 0 ? (cancel.length / empresas.length) * 100 : 0;

  const recebidoMes = faturasMes.filter(f => f.status === "paga").reduce((s, f) => s + Number(f.valor), 0);
  const aReceber    = faturasMes.filter(f => f.status === "pendente").reduce((s, f) => s + Number(f.valor), 0);
  const emAtraso    = faturasMes.filter(f => f.status === "atrasada").reduce((s, f) => s + Number(f.valor), 0);

  const historicoMap = Object.fromEntries(historicoRaw.map(h => [h.competencia, Number(h._sum.valor ?? 0)]));
  const historico = last12.map(mes => ({ mes, mrr: historicoMap[mes] ?? 0, label: mesLabel(mes) }));
  if (historico.every(h => h.mrr === 0) && mrr > 0) historico[historico.length - 1].mrr = mrr;
  const maxMrr = Math.max(...historico.map(h => h.mrr), 1);

  const empresasById = Object.fromEntries(empresas.map(e => [e.id, e.nome]));

  const STATUS_LABEL: Record<string, string> = { ativo: "Ativo", trial: "Trial", inadimplente: "Inadimplente", cancelado: "Cancelado" };
  const STATUS_COLOR: Record<string, string> = { ativo: "#22C55E", trial: "#3B82F6", inadimplente: "#EF4444", cancelado: "#64748B" };

  const kpis = [
    { label: "MRR",            value: fmtK(mrr),           sub: "receita recorrente mensal" },
    { label: "ARR",            value: fmtK(arr),           sub: "projeção anual" },
    { label: "Clientes ativos",value: String(ativas.length), sub: `${empresas.length} no total · ${trial.length} em teste` },
    { label: "Ticket médio",   value: fmtBRL(ticket),      sub: "por cliente ativo" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div>
        <h1 style={{ margin: "0 0 4px", fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 500, color: "#F1F5F9" }}>Visão Geral</h1>
        <p style={{ margin: 0, fontSize: 14, color: "#64748B" }}>Métricas do SaaS em tempo real</p>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {kpis.map(k => (
          <div key={k.label} style={card}>
            <p style={{ margin: "0 0 4px", fontSize: 11.5, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.07em" }}>{k.label}</p>
            <p style={{ margin: "0 0 4px", fontFamily: "var(--font-display)", fontSize: 30, color: "#F1F5F9", fontVariantNumeric: "tabular-nums" }}>{k.value}</p>
            <p style={{ margin: 0, fontSize: 12.5, color: "#475569" }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Gráfico MRR + Composição */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, alignItems: "start" }}>
        {/* Gráfico MRR */}
        <div style={{ ...card }}>
          <p style={{ margin: "0 0 20px", fontSize: 15, fontWeight: 600, color: "#F1F5F9" }}>Evolução do MRR — últimos 12 meses</p>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 160 }}>
            {historico.map((h, i) => {
              const isLast = i === historico.length - 1;
              const barH = Math.max(Math.round((h.mrr / maxMrr) * 136), h.mrr > 0 ? 4 : 0);
              return (
                <div key={h.mes} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, justifyContent: "flex-end", height: "100%" }}>
                  {h.mrr > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: "#F1F5F9", fontVariantNumeric: "tabular-nums" }}>{fmtK(h.mrr)}</span>}
                  <div style={{ width: "100%", height: barH, background: isLast ? "#D4A24C" : "#1e3a5f", borderRadius: "4px 4px 0 0" }} />
                  <span style={{ fontSize: 9.5, color: "#475569", textAlign: "center" as const }}>{h.label}</span>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", gap: 20 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#64748B" }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: "#1e3a5f", display: "inline-block" }} /> meses anteriores
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#64748B" }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: "#D4A24C", display: "inline-block" }} /> mês atual
            </span>
            {mrr > 0 && <span style={{ marginLeft: "auto", fontSize: 12.5, fontWeight: 700, color: "#22C55E" }}>MRR atual: {fmtK(mrr)}</span>}
          </div>
        </div>

        {/* Composição da base */}
        <div style={{ ...card }}>
          <p style={{ margin: "0 0 20px", fontSize: 15, fontWeight: 600, color: "#F1F5F9" }}>Composição da base</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {([
              ["ativo",         ativas.length],
              ["trial",         trial.length],
              ["inadimplente",  inad.length],
              ["cancelado",     cancel.length],
            ] as const).map(([key, count]) => {
              const pct = empresas.length > 0 ? Math.round((count / empresas.length) * 100) : 0;
              return (
                <div key={key}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 13 }}>
                    <span style={{ color: "#94A3B8" }}>{STATUS_LABEL[key]}</span>
                    <span style={{ fontWeight: 600, color: "#F1F5F9" }}>{count} · {pct}%</span>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 999, height: 6, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: STATUS_COLOR[key], transition: "width 0.4s" }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span style={{ color: "#64748B" }}>Churn</span>
            <span style={{ fontWeight: 700, color: churn > 10 ? "#EF4444" : "#F1F5F9" }}>{churn.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Resumo caixa + Próximas cobranças */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
        {/* Resumo de caixa */}
        <div style={card}>
          <p style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600, color: "#F1F5F9" }}>Resumo de caixa — {fmtComp(competenciaAtual)}</p>
          {[
            { l: "Recebido", v: recebidoMes, color: "#22C55E" },
            { l: "A receber (pendente)", v: aReceber, color: "#F1F5F9" },
            { l: "Em atraso", v: emAtraso, color: "#EF4444" },
          ].map((r, i) => (
            <div key={r.l} style={{ display: "flex", justifyContent: "space-between", padding: "13px 0", borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.07)" : "none", fontSize: 14 }}>
              <span style={{ color: "#94A3B8" }}>{r.l}</span>
              <span style={{ fontWeight: 700, color: r.color, fontVariantNumeric: "tabular-nums" }}>{fmtBRL(r.v)}</span>
            </div>
          ))}
          {faturasMes.length === 0 && (
            <p style={{ margin: "8px 0 0", fontSize: 12.5, color: "#475569" }}>Nenhuma fatura gerada para o mês atual. Use a seção Cobranças para gerar.</p>
          )}
        </div>

        {/* Próximas cobranças */}
        <div style={card}>
          <p style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600, color: "#F1F5F9" }}>Cobranças pendentes/atrasadas</p>
          {proximasFaturas.length === 0 ? (
            <p style={{ fontSize: 13.5, color: "#475569" }}>Tudo em dia ✓</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {proximasFaturas.map((f, i) => {
                const atras = f.status === "atrasada";
                const venc = new Date(f.vencimento);
                return (
                  <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: i < proximasFaturas.length - 1 ? "1px solid rgba(255,255,255,0.07)" : "none" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: "0 0 2px", fontSize: 13.5, fontWeight: 600, color: "#F1F5F9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                        {empresasById[f.empresaId] ?? "—"}
                      </p>
                      <p style={{ margin: 0, fontSize: 12, color: atras ? "#EF4444" : "#64748B" }}>
                        {atras ? "vencida em " : "vence "}{venc.toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: 13.5, fontVariantNumeric: "tabular-nums", color: "#F1F5F9" }}>{fmtBRL(Number(f.valor))}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: atras ? "rgba(239,68,68,0.15)" : "rgba(234,179,8,0.15)", color: atras ? "#EF4444" : "#EAB308" }}>
                      {atras ? "Atrasada" : "Pendente"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
