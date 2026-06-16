"use server";

import { prisma } from "@/lib/prisma";
import { getEmpresaId } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { criarChecklistParaObra } from "@/features/checklist/service";

const ObraSchema = z.object({
  nome: z.string().min(1),
  terrenoId: z.string().optional(),
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
  const obra = await prisma.obra.create({
    data: {
      empresaId, nome, orcamento, status,
      terrenoId: terrenoId || null,
      inicio: inicio ? new Date(inicio) : null,
      prazo: prazo ? new Date(prazo) : null,
      responsavel: responsavel || null,
      progresso,
    },
  });
  await criarChecklistParaObra(obra.id, empresaId).catch(() => null);
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
      nome, orcamento, status, progresso,
      terrenoId: terrenoId || null,
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

const NotaSchemaInline = z.object({
  obraId: z.string().min(1),
  categoria: z.enum(["material", "mao_obra", "servicos", "equipamentos", "outros"]),
  valor: z.coerce.number().positive(),
  fornecedor: z.string().optional(),
  numero: z.string().optional(),
  descricao: z.string().optional(),
  emitidaEm: z.string().optional(),
  status: z.enum(["pendente", "em_revisao", "confirmada", "cancelada"]).default("pendente"),
});

export async function criarNotaParaObra(_prev: { error?: string } | null, formData: FormData): Promise<{ error?: string } | null> {
  const empresaId = await getEmpresaId();
  const parsed = NotaSchemaInline.safeParse({
    obraId: formData.get("obraId"),
    categoria: formData.get("categoria"),
    valor: formData.get("valor"),
    fornecedor: formData.get("fornecedor") || undefined,
    numero: formData.get("numero") || undefined,
    descricao: formData.get("descricao") || undefined,
    emitidaEm: formData.get("emitidaEm") || undefined,
    status: formData.get("status") || "pendente",
  });
  if (!parsed.success) return { error: "Verifique os campos obrigatórios." };
  const { obraId, categoria, valor, fornecedor, numero, descricao, emitidaEm, status } = parsed.data;
  const obra = await prisma.obra.findFirst({ where: { id: obraId, empresaId }, select: { id: true } });
  if (!obra) return { error: "Obra não encontrada." };
  await prisma.notaFiscal.create({
    data: {
      empresaId, obraId, categoria, valor, status,
      fornecedor: fornecedor || null, numero: numero || null,
      descricao: descricao || null,
      emitidaEm: emitidaEm ? new Date(emitidaEm) : null,
    },
  });
  revalidatePath(`/obras/${obraId}`);
  revalidatePath("/notas");
  return null;
}
