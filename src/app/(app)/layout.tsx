import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const empresa = await prisma.empresa.findUnique({
    where: { id: session.empresaId },
    select: { nome: true },
  });

  const empresaNome = empresa?.nome ?? "Minha empresa";

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
        <Sidebar empresaNome={empresaNome} />
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
