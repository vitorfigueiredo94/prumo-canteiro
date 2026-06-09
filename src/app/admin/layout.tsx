import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Admin — PrumoCanteiro" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const usuario = await prisma.usuario.findUnique({
    where: { id: user.id },
    select: { superAdmin: true },
  });

  if (!usuario || !usuario.superAdmin) {
    redirect("/dashboard");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0F172A", color: "#E2E8F0", fontFamily: "var(--font-sans)" }}>
      {/* Admin topbar */}
      <header style={{ padding: "14px 32px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22C55E" }} />
          <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 500, color: "#F1F5F9" }}>PrumoCanteiro Admin</span>
        </div>
        <a href="/dashboard" style={{ fontSize: 13, color: "#94A3B8", textDecoration: "none" }}>← Voltar ao app</a>
      </header>
      <main style={{ padding: "32px" }}>{children}</main>
    </div>
  );
}
