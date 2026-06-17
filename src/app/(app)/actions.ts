"use server";

import { clearSession, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}

export async function salvarTelefoneGestor(telefone: string): Promise<{ ok: boolean }> {
  const session = await getSession();
  if (!session) return { ok: false };
  const limpo = telefone.replace(/\D/g, "");
  await prisma.empresa.update({
    where: { id: session.empresaId },
    data: { telefoneGestor: limpo || null },
  });
  return { ok: true };
}
