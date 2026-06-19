import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EquipeView } from "./equipe-view";

export const metadata: Metadata = { title: "Equipe" };

export default async function EquipePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const usuarios = await prisma.usuario.findMany({
    where: { empresaId: session.empresaId, superAdmin: false },
    select: { id: true, nome: true, email: true, cargo: true, bloqueado: true, criadoEm: true },
    orderBy: { criadoEm: "asc" },
  });

  return (
    <EquipeView
      usuarios={usuarios.map((u) => ({ ...u, criadoEm: u.criadoEm.toISOString() }))}
      currentUserId={session.userId}
    />
  );
}
