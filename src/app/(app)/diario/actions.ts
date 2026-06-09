"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

async function getEmpresaId(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const usuario = await prisma.usuario.findUnique({ where: { id: user.id }, select: { empresaId: true, nome: true } });
  if (!usuario) redirect("/login");
  return usuario.empresaId;
}

async function getUsuario() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const usuario = await prisma.usuario.findUnique({ where: { id: user.id }, select: { empresaId: true, nome: true } });
  if (!usuario) redirect("/login");
  return usuario;
}

const EntradaSchema = z.object({
  obraId: z.string().min(1),
  data: z.string().optional(),
  conteudo: z.string().min(1, "O conteúdo é obrigatório."),
  clima: z.string().optional(),
  equipePresente: z.coerce.number().int().min(0).optional(),
});

export type DiarioFormState = { error?: string } | null;

export async function criarEntrada(_prev: DiarioFormState, formData: FormData): Promise<DiarioFormState> {
  const usuario = await getUsuario();
  const parsed = EntradaSchema.safeParse({
    obraId: formData.get("obraId"),
    data: formData.get("data") || undefined,
    conteudo: formData.get("conteudo"),
    clima: formData.get("clima") || undefined,
    equipePresente: formData.get("equipePresente") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Verifique os campos." };

  const { obraId, data, conteudo, clima, equipePresente } = parsed.data;
  const obra = await prisma.obra.findFirst({ where: { id: obraId, empresaId: usuario.empresaId }, select: { id: true } });
  if (!obra) return { error: "Obra não encontrada." };

  await prisma.diarioObra.create({
    data: {
      obraId, conteudo, autor: usuario.nome,
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
  const empresaId = await getEmpresaId();
  await prisma.diarioObra.deleteMany({ where: { id, obra: { empresaId } } });
  revalidatePath("/diario");
}
