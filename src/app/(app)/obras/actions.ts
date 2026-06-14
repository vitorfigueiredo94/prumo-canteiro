"use server";

import { prisma } from "@/lib/prisma";
import { getEmpresaId } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const ObraSchema = z.object({
  nome: z.string().min(1),
  terrenoId: z.string().min(1),
  orcamento: z.coerce.number().positive(),
  status: z.enum(["planejamento", "em_andamento", "parada", "concluida"]),
  inicio: z.string().optional(),
  prazo: z.string().optional(),
  responsavel: z.string().optional(),
  progresso: z.coerce.number().min(0).max(100).default(0),
});

export type ObraFormState = { error?: string } | null;

export async function criarObra(_prev: ObraFormState, formData: FormData): Promise<ObraFormState> {
  const empresaId = await getEmpresaId();
  const parsed = ObraSchema.safeParse({
    nome: formData.get("nome"),
    terrenoId: formData.get("terrenoId"),
    orcamento: formData.get("orcamento"),
    status: formData.get("status") || "planejamento",
    inicio: formData.get("inicio") || undefined,
    prazo: formData.get("prazo") || undefined,
    responsavel: formData.get("responsavel") || undefined,
    progresso: formData.get("progresso") || 0,
  });
  if (!parsed.success) return { error: "Verifique os campos obrigatórios." };
  const { nome, terrenoId, orcamento, status, inicio, prazo, responsavel, progresso } = parsed.data;
  await prisma.obra.create({
    data: {
      empresaId, terrenoId, nome, orcamento, status,
      inicio: inicio ? new Date(inicio) : null,
      prazo: prazo ? new Date(prazo) : null,
      responsavel: responsavel || null,
      progresso,
    },
  });
  revalidatePath("/obras");
  return null;
}

export async function editarObra(id: string, _prev: ObraFormState, formData: FormData): Promise<ObraFormState> {
  const empresaId = await getEmpresaId();
  const parsed = ObraSchema.safeParse({
    nome: formData.get("nome"),
    terrenoId: formData.get("terrenoId"),
    orcamento: formData.get("orcamento"),
    status: formData.get("status"),
    inicio: formData.get("inicio") || undefined,
    prazo: formData.get("prazo") || undefined,
    responsavel: formData.get("responsavel") || undefined,
    progresso: formData.get("progresso") || 0,
  });
  if (!parsed.success) return { error: "Verifique os campos obrigatórios." };
  const { nome, terrenoId, orcamento, status, inicio, prazo, responsavel, progresso } = parsed.data;
  await prisma.obra.updateMany({
    where: { id, empresaId },
    data: {
      nome, terrenoId, orcamento, status, progresso,
      inicio: inicio ? new Date(inicio) : null,
      prazo: prazo ? new Date(prazo) : null,
      responsavel: responsavel || null,
    },
  });
  revalidatePath("/obras");
  revalidatePath(`/obras/${id}`);
  return null;
}

export async function confirmarNota(notaId: string, obraId: string): Promise<void> {
  const empresaId = await getEmpresaId();
  await prisma.notaFiscal.updateMany({
    where: { id: notaId, empresaId },
    data: { status: "confirmada" },
  });
  revalidatePath(`/obras/${obraId}`);
  revalidatePath("/notas");
}

export async function excluirNota(notaId: string, obraId: string): Promise<void> {
  const empresaId = await getEmpresaId();
  await prisma.notaFiscal.deleteMany({ where: { id: notaId, empresaId } });
  revalidatePath(`/obras/${obraId}`);
  revalidatePath("/notas");
}
