import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SaNav } from "./_components/sa-nav";

export const metadata: Metadata = { title: "Super Admin — PrumoCanteiro" };

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const usuario = await prisma.usuario.findUnique({
    where: { id: session.userId },
    select: { superAdmin: true },
  });

  if (!usuario?.superAdmin) notFound();

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#0d1b2e" }}>
      <SaNav />
      <main style={{ flex: 1, overflowY: "auto", overflowX: "hidden", background: "#0d1b2e" }}>
        <div style={{ padding: "36px 40px", maxWidth: 1280, margin: "0 auto" }}>
          {children}
        </div>
      </main>
    </div>
  );
}
