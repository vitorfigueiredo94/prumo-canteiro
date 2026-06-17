"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkSuperAdmin() {
  const session = await getSession();
  if (!session) throw new Error("Não autenticado");
  const u = await prisma.usuario.findUnique({ where: { id: session.userId }, select: { superAdmin: true } });
  if (!u?.superAdmin) throw new Error("Acesso negado");
}

export async function createPlano(fd: FormData): Promise<{ error?: string }> {
  try {
    await checkSuperAdmin();
    const recursosList = (fd.get("recursos") as string ?? "")
      .split("\n").map(r => r.trim()).filter(Boolean);
    await prisma.plano.create({
      data: {
        nome: (fd.get("nome") as string).trim(),
        preco: Number(fd.get("preco")),
        limiteObras: fd.get("limiteObras") ? Number(fd.get("limiteObras")) : null,
        limiteUsuarios: fd.get("limiteUsuarios") ? Number(fd.get("limiteUsuarios")) : null,
        destaque: fd.get("destaque") === "on",
        recursos: JSON.stringify(recursosList),
      },
    });
    revalidatePath("/superadmin/planos");
    revalidatePath("/superadmin/visao-geral");
    return {};
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Erro ao criar plano." };
  }
}

export async function updatePlano(id: string, fd: FormData): Promise<{ error?: string }> {
  try {
    await checkSuperAdmin();
    const recursosList = (fd.get("recursos") as string ?? "")
      .split("\n").map(r => r.trim()).filter(Boolean);
    await prisma.plano.update({
      where: { id },
      data: {
        nome: (fd.get("nome") as string).trim(),
        preco: Number(fd.get("preco")),
        limiteObras: fd.get("limiteObras") ? Number(fd.get("limiteObras")) : null,
        limiteUsuarios: fd.get("limiteUsuarios") ? Number(fd.get("limiteUsuarios")) : null,
        destaque: fd.get("destaque") === "on",
        recursos: JSON.stringify(recursosList),
      },
    });
    revalidatePath("/superadmin/planos");
    revalidatePath("/superadmin/visao-geral");
    return {};
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Erro ao atualizar plano." };
  }
}

export async function deletePlano(id: string): Promise<{ error?: string }> {
  try {
    await checkSuperAdmin();
    const assinantes = await prisma.assinatura.count({ where: { planoId: id } });
    if (assinantes > 0) return { error: `Este plano tem ${assinantes} assinante(s). Migre-os primeiro.` };
    await prisma.plano.delete({ where: { id } });
    revalidatePath("/superadmin/planos");
    return {};
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Erro ao excluir plano." };
  }
}
