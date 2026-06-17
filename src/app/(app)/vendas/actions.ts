"use server";

import { prisma } from "@/lib/prisma";
import { getEmpresaId } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dispararCobranca } from "@/lib/cobranca-service";

const VendaSchema = z.object({
  terrenoId: z.string().min(1),
  nomeComprador: z.string().min(1),
  cpfCnpjComprador: z.string().optional(),
  telefoneComprador: z.string().optional(),
  emailComprador: z.string().email().optional().or(z.literal("")),
  valorTotal: z.coerce.number().positive(),
  entrada: z.coerce.number().min(0).default(0),
  numeroParcelas: z.coerce.number().int().min(1).max(360).default(1),
  diaVencimento: z.coerce.number().int().min(1).max(28).default(5),
  dataContrato: z.string().optional(),
  observacoes: z.string().optional(),
});

export type VendaFormState = { error?: string } | null;

export async function criarVenda(_prev: VendaFormState, formData: FormData): Promise<VendaFormState> {
  const empresaId = await getEmpresaId();
  const parsed = VendaSchema.safeParse({
    terrenoId: formData.get("terrenoId"),
    nomeComprador: formData.get("nomeComprador"),
    cpfCnpjComprador: formData.get("cpfCnpjComprador") || undefined,
    telefoneComprador: formData.get("telefoneComprador") || undefined,
    emailComprador: formData.get("emailComprador") || undefined,
    valorTotal: formData.get("valorTotal"),
    entrada: formData.get("entrada") || 0,
    numeroParcelas: formData.get("numeroParcelas") || 1,
    diaVencimento: formData.get("diaVencimento") || 5,
    dataContrato: formData.get("dataContrato") || undefined,
    observacoes: formData.get("observacoes") || undefined,
  });
  if (!parsed.success) return { error: "Verifique os campos obrigatórios." };

  const { terrenoId, nomeComprador, cpfCnpjComprador, telefoneComprador, emailComprador,
    valorTotal, entrada, numeroParcelas, diaVencimento, dataContrato, observacoes } = parsed.data;

  const terreno = await prisma.terreno.findFirst({ where: { id: terrenoId, empresaId }, select: { id: true } });
  if (!terreno) return { error: "Terreno não encontrado." };

  const restante = valorTotal - entrada;
  const valorParcela = numeroParcelas > 0 ? restante / numeroParcelas : restante;
  const base = dataContrato ? new Date(dataContrato) : new Date();
  const vencimentos: Date[] = Array.from({ length: numeroParcelas }, (_, i) => {
    const d = new Date(base);
    d.setMonth(d.getMonth() + i + 1);
    d.setDate(diaVencimento);
    return d;
  });

  await prisma.$transaction(async (tx) => {
    const venda = await tx.venda.create({
      data: {
        empresaId, terrenoId, nomeComprador,
        cpfCnpjComprador: cpfCnpjComprador || null,
        telefoneComprador: telefoneComprador || null,
        emailComprador: emailComprador || null,
        valorTotal, entrada, numeroParcelas, diaVencimento,
        dataContrato: dataContrato ? new Date(dataContrato) : null,
        observacoes: observacoes || null,
      },
    });
    if (numeroParcelas > 0 && restante > 0) {
      await tx.parcela.createMany({
        data: vencimentos.map((venc, i) => ({
          vendaId: venda.id, numero: i + 1,
          valor: valorParcela, vencimento: venc, status: "aberta",
        })),
      });
    }
    await tx.terreno.updateMany({ where: { id: terrenoId, empresaId }, data: { status: "vendido" } });
  });

  revalidatePath("/vendas");
  revalidatePath("/terrenos");
  return null;
}

export async function registrarPagamentoParcela(parcelaId: string, vendaId: string): Promise<void> {
  const empresaId = await getEmpresaId();
  const parcela = await prisma.parcela.findFirst({ where: { id: parcelaId, venda: { empresaId } }, select: { id: true } });
  if (!parcela) return;
  await prisma.parcela.update({ where: { id: parcelaId }, data: { status: "paga", pagoEm: new Date() } });
  revalidatePath(`/vendas/${vendaId}`);
}

export async function estornarParcela(parcelaId: string, vendaId: string): Promise<void> {
  const empresaId = await getEmpresaId();
  const parcela = await prisma.parcela.findFirst({ where: { id: parcelaId, venda: { empresaId } }, select: { id: true } });
  if (!parcela) return;
  await prisma.parcela.update({ where: { id: parcelaId }, data: { status: "aberta", pagoEm: null } });
  revalidatePath(`/vendas/${vendaId}`);
}

export async function cobrarParcelaWhatsApp(parcelaId: string): Promise<{ ok: boolean; reason?: string }> {
  const empresaId = await getEmpresaId();
  const parcela = await prisma.parcela.findFirst({
    where: { id: parcelaId, venda: { empresaId } },
    select: {
      id: true, numero: true, valor: true, vencimento: true,
      venda: { select: { id: true, empresaId: true, nomeComprador: true, telefoneComprador: true } },
    },
  });
  if (!parcela) return { ok: false, reason: "Parcela não encontrada" };

  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const tipo = parcela.vencimento && new Date(parcela.vencimento) < hoje ? "aviso_atraso" : "lembrete_amigavel";

  return dispararCobranca({ ...parcela, valor: Number(parcela.valor) }, tipo);
}
