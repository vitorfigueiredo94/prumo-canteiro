"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const EntradaSchema = z.object({
  obraId: z.string().min(1),
  data: z.string().optional(),
  conteudo: z.string().min(1, "O conteúdo é obrigatório."),
  clima: z.string().optional(),
  equipePresente: z.coerce.number().int().min(0).optional(),
});

export type DiarioFormState = { error?: string } | null;

export async function criarEntrada(_prev: DiarioFormState, formData: FormData): Promise<DiarioFormState> {
  const session = await getSession();
  if (!session) redirect("/login");

  const parsed = EntradaSchema.safeParse({
    obraId: formData.get("obraId"),
    data: formData.get("data") || undefined,
    conteudo: formData.get("conteudo"),
    clima: formData.get("clima") || undefined,
    equipePresente: formData.get("equipePresente") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Verifique os campos." };

  const { obraId, data, conteudo, clima, equipePresente } = parsed.data;

  const obra = await prisma.obra.findFirst({
    where: { id: obraId, empresaId: session.empresaId },
    select: { id: true },
  });
  if (!obra) return { error: "Obra não encontrada." };

  await prisma.diarioObra.create({
    data: {
      obraId,
      empresaId: session.empresaId,
      conteudo,
      autor: session.nome,
      data: data ? new Date(data) : new Date(),
      clima: clima || null,
      equipePresente: equipePresente ?? null,
    },
  });

  revalidatePath("/diario");
  revalidatePath(`/obras/${obraId}`);
  return null;
}

export async function excluirEntrada(id: string): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  await prisma.diarioObra.deleteMany({ where: { id, empresaId: session.empresaId } });
  revalidatePath("/diario");
}
