"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkSuperAdmin() {
  const session = await getSession();
  if (!session) throw new Error("Não autenticado");
  const u = await prisma.usuario.findUnique({ where: { id: session.userId }, select: { superAdmin: true } });
  if (!u?.superAdmin) throw new Error("Acesso negado");
  return session;
}

export async function toggleBloqueio(userId: string, bloqueado: boolean): Promise<void> {
  const session = await checkSuperAdmin();
  if (userId === session.userId) throw new Error("Você não pode bloquear a si mesmo.");
  await prisma.usuario.update({ where: { id: userId }, data: { bloqueado } });
  revalidatePath("/superadmin/usuarios");
}
