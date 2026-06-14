"use server";

import { prisma } from "@/lib/prisma";
import { getEmpresaId } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const TerrenoSchema = z.object({
  nome: z.string().min(1),
  numero: z.string().optional(),
  endereco: z.string().optional(),
  cidade: z.string().min(1),
  area: z.coerce.number().positive(),
  status: z.enum(["disponivel", "em_obra", "vendido"]),
  aquisicao: z.string().optional(),
  valorCompra: z.coerce.number().optional(),
});

export type TerrenoFormState = { error?: string } | null;

export async function criarTerreno(_prev: TerrenoFormState, formData: FormData): Promise<TerrenoFormState> {
  const empresaId = await getEmpresaId();
  const parsed = TerrenoSchema.safeParse({
    nome: formData.get("nome"),
    numero: formData.get("numero") || undefined,
    endereco: formData.get("endereco") || undefined,
    cidade: formData.get("cidade"),
    area: formData.get("area"),
    status: formData.get("status") || "disponivel",
    aquisicao: formData.get("aquisicao") || undefined,
    valorCompra: formData.get("valorCompra") || undefined,
  });
  if (!parsed.success) return { error: "Verifique os campos obrigatórios." };
  const { nome, numero, endereco, cidade, area, status, aquisicao, valorCompra } = parsed.data;
  await prisma.terreno.create({
    data: {
      empresaId, nome, cidade, area, status,
      numero: numero || null,
      endereco: endereco || null,
      aquisicao: aquisicao ? new Date(aquisicao) : null,
      valorCompra: valorCompra ?? null,
    },
  });
  revalidatePath("/terrenos");
  return null;
}

export async function editarTerreno(id: string, _prev: TerrenoFormState, formData: FormData): Promise<TerrenoFormState> {
  const empresaId = await getEmpresaId();
  const parsed = TerrenoSchema.safeParse({
    nome: formData.get("nome"),
    numero: formData.get("numero") || undefined,
    endereco: formData.get("endereco") || undefined,
    cidade: formData.get("cidade"),
    area: formData.get("area"),
    status: formData.get("status"),
    aquisicao: formData.get("aquisicao") || undefined,
    valorCompra: formData.get("valorCompra") || undefined,
  });
  if (!parsed.success) return { error: "Verifique os campos obrigatórios." };
  const { nome, numero, endereco, cidade, area, status, aquisicao, valorCompra } = parsed.data;
  await prisma.terreno.updateMany({
    where: { id, empresaId },
    data: {
      nome, cidade, area, status,
      numero: numero || null,
      endereco: endereco || null,
      aquisicao: aquisicao ? new Date(aquisicao) : null,
      valorCompra: valorCompra ?? null,
    },
  });
  revalidatePath("/terrenos");
  revalidatePath(`/terrenos/${id}`);
  return null;
}

export async function excluirTerreno(id: string): Promise<void> {
  const empresaId = await getEmpresaId();
  await prisma.terreno.deleteMany({ where: { id, empresaId } });
  revalidatePath("/terrenos");
}
