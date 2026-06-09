import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const usuario = await prisma.usuario.findUnique({
    where: { id: user.id },
    include: { empresa: { select: { nome: true } } },
  });

  const empresaNome = usuario?.empresa.nome ?? "Minha empresa";

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        background: "var(--bg-canvas)",
      }}
    >
      {/* Sidebar — desktop */}
      <div className="hidden lg:flex" style={{ height: "100%" }}>
        <Sidebar empresaNome={empresaNome} />
      </div>

      {/* Conteúdo principal */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        {/* Área de conteúdo com scroll */}
        <main
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
          }}
        >
          {children}
        </main>

        {/* Mobile bottom nav */}
        <div className="flex lg:hidden">
          <MobileNav />
        </div>
      </div>
    </div>
  );
}
