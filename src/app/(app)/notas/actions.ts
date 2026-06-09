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
  const usuario = await prisma.usuario.findUnique({ where: { id: user.id }, select: { empresaId: true } });
  if (!usuario) redirect("/login");
  return usuario.empresaId;
}

const NotaSchema = z.object({
  obraId: z.string().min(1),
  categoria: z.enum(["material", "mao_obra", "servicos", "equipamentos", "outros"]),
  valor: z.coerce.number().positive(),
  fornecedor: z.string().optional(),
  numero: z.string().optional(),
  descricao: z.string().optional(),
  emitidaEm: z.string().optional(),
  status: z.enum(["pendente", "em_revisao", "confirmada", "cancelada"]).default("pendente"),
});

export type NotaFormState = { error?: string } | null;

export async function criarNota(_prev: NotaFormState, formData: FormData): Promise<NotaFormState> {
  const empresaId = await getEmpresaId();
  const parsed = NotaSchema.safeParse({
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
      empresaId, obraId, categoria: categoria as any, valor,
      fornecedor: fornecedor || null, numero: numero || null,
      descricao: descricao || null, status: status as any,
      emitidaEm: emitidaEm ? new Date(emitidaEm) : null,
    },
  });
  revalidatePath("/notas");
  return null;
}

export async function editarNota(id: string, _prev: NotaFormState, formData: FormData): Promise<NotaFormState> {
  const empresaId = await getEmpresaId();
  const parsed = NotaSchema.safeParse({
    obraId: formData.get("obraId"),
    categoria: formData.get("categoria"),
    valor: formData.get("valor"),
    fornecedor: formData.get("fornecedor") || undefined,
    numero: formData.get("numero") || undefined,
    descricao: formData.get("descricao") || undefined,
    emitidaEm: formData.get("emitidaEm") || undefined,
    status: formData.get("status"),
  });
  if (!parsed.success) return { error: "Verifique os campos obrigatórios." };

  const { obraId, categoria, valor, fornecedor, numero, descricao, emitidaEm, status } = parsed.data;
  await prisma.notaFiscal.updateMany({
    where: { id, empresaId },
    data: {
      obraId, categoria: categoria as any, valor,
      fornecedor: fornecedor || null, numero: numero || null,
      descricao: descricao || null, status: status as any,
      emitidaEm: emitidaEm ? new Date(emitidaEm) : null,
    },
  });
  revalidatePath("/notas");
  return null;
}

export async function atualizarStatusNota(id: string, status: string): Promise<void> {
  const empresaId = await getEmpresaId();
  await prisma.notaFiscal.updateMany({
    where: { id, empresaId },
    data: { status: status as any },
  });
  revalidatePath("/notas");
}

export async function excluirNota(id: string): Promise<void> {
  const empresaId = await getEmpresaId();
  await prisma.notaFiscal.deleteMany({ where: { id, empresaId } });
  revalidatePath("/notas");
}

/** Parse minimal fields from a NF-e XML string (nfce/nfe namespace). */
export async function parseNFeXml(_prev: NotaFormState, formData: FormData): Promise<NotaFormState & { parsed?: Record<string, string> }> {
  const file = formData.get("xml") as File | null;
  if (!file || file.size === 0) return { error: "Selecione um arquivo XML." };

  const text = await file.text();

  const get = (tag: string) => {
    const m = text.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "i"));
    return m?.[1]?.trim() ?? "";
  };

  const numero = get("nNF") || get("cNF");
  const fornecedor = get("xNome");
  const valor = get("vNF") || get("vProd");
  const emitidaEm = get("dhEmi") || get("dEmi");

  return {
    parsed: {
      numero,
      fornecedor,
      valor,
      emitidaEm: emitidaEm ? emitidaEm.split("T")[0] : "",
    },
  };
}
