import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [empresas, planos, assinaturas] = await Promise.all([
    prisma.empresa.findMany({
      include: {
        assinatura: { include: { plano: true } },
        _count: { select: { usuarios: true, obras: true, terrenos: true } },
      },
      orderBy: { criadoEm: "desc" },
    }),
    prisma.plano.findMany({ orderBy: { preco: "asc" } }),
    prisma.assinatura.groupBy({ by: ["status"], _count: { id: true } }),
  ]);

  const totalEmpresas = empresas.length;
  const ativas = empresas.filter((e: typeof empresas[0]) => e.assinatura?.status === "ativo").length;
  const trial = empresas.filter((e: typeof empresas[0]) => e.assinatura?.status === "trial").length;
  const mrr = empresas
    .filter((e: typeof empresas[0]) => e.assinatura?.status === "ativa")
    .reduce((s: number, e: typeof empresas[0]) => s + Number(e.assinatura?.plano?.preco ?? 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div>
        <h1 style={{ margin: "0 0 4px", fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 500, color: "#F1F5F9" }}>Painel Administrativo</h1>
        <p style={{ margin: 0, fontSize: 14, color: "#64748B" }}>Visão geral das empresas e assinaturas</p>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
        {[
          { l: "Empresas", v: totalEmpresas },
          { l: "Assinaturas ativas", v: ativas },
          { l: "Em trial", v: trial },
          { l: "MRR", v: `R$ ${mrr.toFixed(0)}` },
          { l: "Planos", v: planos.length },
        ].map((k) => (
          <div key={k.l} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "16px 20px" }}>
            <p style={{ margin: "0 0 6px", fontSize: 12, color: "#64748B", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{k.l}</p>
            <p style={{ margin: 0, fontSize: 28, fontFamily: "var(--font-display)", color: "#F1F5F9" }}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Planos */}
      <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <h2 style={{ margin: 0, fontSize: 17, fontFamily: "var(--font-display)", fontWeight: 500, color: "#F1F5F9" }}>Planos de assinatura</h2>
        </div>
        <div style={{ display: "flex", gap: 16, padding: "20px", flexWrap: "wrap" }}>
          {planos.map((p: typeof planos[0]) => (
            <div key={p.id} style={{ flex: 1, minWidth: 160, background: p.destaque ? "rgba(212,162,76,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${p.destaque ? "rgba(212,162,76,0.4)" : "rgba(255,255,255,0.08)"}`, borderRadius: 10, padding: "16px" }}>
              <p style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 600, color: "#F1F5F9" }}>{p.nome}</p>
              <p style={{ margin: "0 0 8px", fontFamily: "var(--font-display)", fontSize: 24, color: p.destaque ? "#D4A24C" : "#94A3B8" }}>R$ {Number(p.preco).toFixed(0)}<span style={{ fontSize: 13, fontWeight: 400 }}>/mês</span></p>
              {p.destaque && <p style={{ margin: 0, fontSize: 11, background: "rgba(212,162,76,0.2)", color: "#D4A24C", padding: "3px 8px", borderRadius: 20, display: "inline-block", fontWeight: 600 }}>DESTAQUE</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Empresa table */}
      <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <h2 style={{ margin: 0, fontSize: 17, fontFamily: "var(--font-display)", fontWeight: 500, color: "#F1F5F9" }}>Empresas cadastradas</h2>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                {["Empresa", "Plano", "Status", "Usuários", "Obras", "Terrenos", "Cadastro"].map((h) => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {empresas.map((e: typeof empresas[0]) => {
                const status = e.assinatura?.status ?? "sem_assinatura";
                const statusColors: Record<string, string> = {
                  ativo: "#22C55E", trial: "#EAB308", inadimplente: "#EF4444", cancelado: "#64748B",
                };
                return (
                  <tr key={e.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "12px 16px", color: "#F1F5F9", fontWeight: 500 }}>{e.nome}</td>
                    <td style={{ padding: "12px 16px", color: "#94A3B8", fontSize: 13 }}>{e.assinatura?.plano?.nome ?? "—"}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: statusColors[status] ?? "#64748B", background: "rgba(255,255,255,0.05)", padding: "3px 8px", borderRadius: 20 }}>{status}</span>
                    </td>
                    <td style={{ padding: "12px 16px", color: "#94A3B8", textAlign: "center" }}>{e._count.usuarios}</td>
                    <td style={{ padding: "12px 16px", color: "#94A3B8", textAlign: "center" }}>{e._count.obras}</td>
                    <td style={{ padding: "12px 16px", color: "#94A3B8", textAlign: "center" }}>{e._count.terrenos}</td>
                    <td style={{ padding: "12px 16px", color: "#64748B", fontSize: 12 }}>{e.criadoEm ? new Date(e.criadoEm).toLocaleDateString("pt-BR") : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
