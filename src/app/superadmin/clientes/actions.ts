"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkSuperAdmin() {
  const session = await getSession();
  if (!session) throw new Error("Não autenticado");
  const u = await prisma.usuario.findUnique({ where: { id: session.userId }, select: { superAdmin: true } });
  if (!u?.superAdmin) throw new Error("Acesso negado");
}

export async function createTenant(fd: FormData): Promise<{ error?: string }> {
  try {
    await checkSuperAdmin();
    const nome     = (fd.get("nome") as string)?.trim();
    const propNome = (fd.get("propNome") as string)?.trim();
    const email    = (fd.get("email") as string)?.trim().toLowerCase();
    const senha    = fd.get("senha") as string;
    const planoId  = fd.get("planoId") as string;
    const status   = (fd.get("status") as string) || "trial";

    if (!nome || !propNome || !email || !senha || !planoId) return { error: "Preencha todos os campos." };

    const existente = await prisma.usuario.findUnique({ where: { email } });
    if (existente) return { error: "E-mail já cadastrado." };

    await prisma.empresa.create({
      data: {
        nome,
        assinatura: {
          create: {
            planoId,
            status,
            proximaCobranca: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        },
        usuarios: {
          create: {
            nome: propNome,
            email,
            passwordHash: await hashPassword(senha),
          },
        },
      },
    });

    revalidatePath("/superadmin/clientes");
    revalidatePath("/superadmin/visao-geral");
    return {};
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Erro ao criar cliente." };
  }
}

export async function updatePlanoEmpresa(empresaId: string, planoId: string): Promise<void> {
  await checkSuperAdmin();
  await prisma.assinatura.update({ where: { empresaId }, data: { planoId } });
  revalidatePath("/superadmin/clientes");
  revalidatePath("/superadmin/visao-geral");
}

export async function updateStatusEmpresa(empresaId: string, status: string): Promise<void> {
  await checkSuperAdmin();
  await prisma.assinatura.update({ where: { empresaId }, data: { status } });
  revalidatePath("/superadmin/clientes");
  revalidatePath("/superadmin/visao-geral");
}

export async function deleteEmpresa(empresaId: string): Promise<void> {
  await checkSuperAdmin();
  await prisma.empresa.delete({ where: { id: empresaId } });
  revalidatePath("/superadmin/clientes");
  revalidatePath("/superadmin/visao-geral");
}
