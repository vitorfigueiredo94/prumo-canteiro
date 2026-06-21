import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession, clearSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlanoEmpresa } from "@/lib/plano";
import { assinarAction } from "./actions";

async function sairAction() {
  "use server";
  await clearSession();
  redirect("/login");
}

export const metadata = { title: "Upgrade — PrumoCanteiro" };

export default async function UpgradePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [empresa, planos, plano] = await Promise.all([
    prisma.empresa.findUnique({
      where: { id: session.empresaId },
      select: { nome: true },
    }),
    prisma.plano.findMany({
      where: { destaque: true },
      orderBy: { preco: "asc" },
    }),
    getPlanoEmpresa(session.empresaId),
  ]);

  const expirado = plano.trialExpirado;
  const suporteTel = process.env.WHATSAPP_SUPORTE ?? "5511999999999";
  const whatsappLink = `https://wa.me/${suporteTel}?text=${encodeURIComponent("Olá! Quero assinar o PrumoCanteiro.")}`;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-canvas, #f8fafc)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", fontFamily: "var(--font-sans, system-ui, sans-serif)" }}>

      {/* Logo / título */}
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.5px" }}>
          PrumoCanteiro
        </div>
        <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>Gestão de Obras</div>
      </div>

      {/* Card principal */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 4px 24px rgba(0,0,0,0.06)", maxWidth: 520, width: "100%", padding: "40px 36px", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>{expirado ? "⏰" : "🚀"}</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", margin: "0 0 10px" }}>
          {expirado ? "Seu período de teste encerrou" : "Escolha seu plano"}
        </h1>
        <p style={{ fontSize: 15, color: "#64748b", lineHeight: 1.6, margin: "0 0 28px" }}>
          {empresa?.nome ? `Olá, ${empresa.nome}! ` : ""}
          {expirado
            ? "Seu teste gratuito de 14 dias chegou ao fim. Para continuar com suas obras, terrenos e dados, assine um de nossos planos."
            : "Assine para garantir o acesso completo às suas obras, terrenos e relatórios sem interrupções."}
        </p>

        {/* Planos */}
        {planos.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
            {planos.map((p) => {
              const assinar = assinarAction.bind(null, p.id);
              return (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", border: "1px solid #e2e8f0", borderRadius: 10, background: "#f8fafc" }}>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#0f172a" }}>{p.nome}</div>
                    {p.limiteObras !== null && (
                      <div style={{ fontSize: 13, color: "#64748b" }}>
                        {p.limiteObras === 0 ? "Sem obras" : `Até ${p.limiteObras} obra${p.limiteObras > 1 ? "s" : ""}`}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ fontSize: 17, fontWeight: 700, color: "#0f172a" }}>
                      R$ {Number(p.preco).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                      <span style={{ fontSize: 12, fontWeight: 400, color: "#94a3b8" }}>/mês</span>
                    </div>
                    <form action={assinar}>
                      <button
                        type="submit"
                        style={{ padding: "8px 18px", background: "#1e3a5f", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
                      >
                        Assinar
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {/* CTA WhatsApp */}
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10, height: 48, padding: "0 28px", background: "#25d366", color: "#fff", borderRadius: 10, fontSize: 15, fontWeight: 700, textDecoration: "none", width: "100%", boxSizing: "border-box" }}
        >
          💬 Falar com a equipe pelo WhatsApp
        </a>

        <p style={{ fontSize: 12.5, color: "#94a3b8", marginTop: 16 }}>
          Seus dados ficam guardados por 30 dias após o fim do teste.
        </p>
      </div>

      {/* Voltar / Sair */}
      <div style={{ marginTop: 20, display: "flex", gap: 18, alignItems: "center" }}>
        {!expirado && (
          <Link href="/dashboard" style={{ fontSize: 13, color: "#64748b", textDecoration: "underline" }}>
            ← Voltar ao sistema
          </Link>
        )}
        <form action={sairAction}>
          <button type="submit" style={{ fontSize: 13, color: "#94a3b8", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
            Sair da conta
          </button>
        </form>
      </div>
    </div>
  );
}
