import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { getPlanoEmpresa } from "@/lib/plano";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const [empresa, usuario, plano] = await Promise.all([
    prisma.empresa.findUnique({ where: { id: session.empresaId }, select: { nome: true, telefoneGestor: true, logoEmpresa: true } }),
    prisma.usuario.findUnique({ where: { id: session.userId }, select: { superAdmin: true } }),
    getPlanoEmpresa(session.empresaId),
  ]);

  const empresaNome = empresa?.nome ?? "Minha empresa";
  const superAdmin = usuario?.superAdmin ?? false;
  const telefoneGestor = empresa?.telefoneGestor ?? null;
  const logoEmpresa = empresa?.logoEmpresa ?? null;

  if (plano.trialExpirado && !superAdmin) redirect("/upgrade");

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        background: "var(--bg-canvas)",
      }}
    >
      <div className="hidden lg:flex" style={{ height: "100%" }}>
        <Sidebar empresaNome={empresaNome} plano={plano} logoEmpresa={logoEmpresa} />
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        {/* Barra de controles — fica acima do conteúdo de cada página */}
        <div style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: 4,
          padding: "0 20px",
          height: 52,
          flexShrink: 0,
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg-surface)",
        }}>
          <ThemeToggle />
          <UserMenu nome={session.nome} email={session.email} superAdmin={superAdmin} telefoneGestor={telefoneGestor} logoEmpresa={logoEmpresa} planoNome={plano.planoNome} isTrial={plano.isTrial} />
        </div>

        <main style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
          {children}
        </main>
        <div className="flex lg:hidden">
          <MobileNav />
        </div>
      </div>
    </div>
  );
}
