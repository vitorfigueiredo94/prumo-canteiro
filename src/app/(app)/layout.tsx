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
    prisma.empresa.findUnique({ where: { id: session.empresaId }, select: { nome: true } }),
    prisma.usuario.findUnique({ where: { id: session.userId }, select: { superAdmin: true } }),
    getPlanoEmpresa(session.empresaId),
  ]);

  const empresaNome = empresa?.nome ?? "Minha empresa";
  const superAdmin = usuario?.superAdmin ?? false;

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
        <Sidebar empresaNome={empresaNome} plano={plano} />
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0,
          position: "relative",
        }}
      >
        {/* Controles fixos no canto superior direito da área de conteúdo */}
        <div style={{ position: "absolute", top: 14, right: 24, zIndex: 50, display: "flex", alignItems: "center", gap: 4 }}>
          <ThemeToggle />
          <UserMenu nome={session.nome} email={session.email} superAdmin={superAdmin} />
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
