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

export async function marcarFaturaPaga(faturaId: string): Promise<{ error?: string }> {
  try {
    await checkSuperAdmin();
    const fatura = await prisma.fatura.findUnique({ where: { id: faturaId } });
    if (!fatura) return { error: "Fatura não encontrada." };

    await prisma.fatura.update({ where: { id: faturaId }, data: { status: "paga", pagaEm: new Date() } });

    // Se empresa estava inadimplente e não tem mais faturas atrasadas, reativar
    const emAtraso = await prisma.fatura.count({ where: { empresaId: fatura.empresaId, status: "atrasada" } });
    if (emAtraso === 0) {
      await prisma.assinatura.updateMany({
        where: { empresaId: fatura.empresaId, status: "inadimplente" },
        data: { status: "ativo" },
      });
    }

    revalidatePath("/superadmin/cobrancas");
    revalidatePath("/superadmin/visao-geral");
    return {};
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Erro ao processar pagamento." };
  }
}

export async function gerarFaturasMes(competencia: string): Promise<{ criadas: number; error?: string }> {
  try {
    await checkSuperAdmin();
    const [year, month] = competencia.split("-").map(Number);
    const vencimento = new Date(year, month - 1, 10); // dia 10 do mês

    const assinaturasAtivas = await prisma.assinatura.findMany({
      where: { status: { in: ["ativo", "trial"] } },
      include: { plano: true },
    });

    let criadas = 0;
    for (const ass of assinaturasAtivas) {
      const existente = await prisma.fatura.findFirst({
        where: { empresaId: ass.empresaId, competencia },
      });
      if (existente) continue;
      await prisma.fatura.create({
        data: { empresaId: ass.empresaId, competencia, valor: ass.plano.preco, vencimento, status: "pendente" },
      });
      criadas++;
    }

    revalidatePath("/superadmin/cobrancas");
    revalidatePath("/superadmin/visao-geral");
    return { criadas };
  } catch (e: unknown) {
    return { criadas: 0, error: e instanceof Error ? e.message : "Erro ao gerar faturas." };
  }
}

export async function marcarFaturaAtrasada(faturaId: string): Promise<void> {
  await checkSuperAdmin();
  await prisma.fatura.update({ where: { id: faturaId }, data: { status: "atrasada" } });
  // Marcar empresa como inadimplente
  const fatura = await prisma.fatura.findUnique({ where: { id: faturaId } });
  if (fatura) {
    await prisma.assinatura.updateMany({
      where: { empresaId: fatura.empresaId, status: "ativo" },
      data: { status: "inadimplente" },
    });
  }
  revalidatePath("/superadmin/cobrancas");
}
