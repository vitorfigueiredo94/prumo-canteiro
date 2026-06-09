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

const FuncSchema = z.object({
  nome: z.string().min(1),
  cpf: z.string().optional(),
  cargo: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  salario: z.coerce.number().positive().optional(),
  admissao: z.string().optional(),
  status: z.enum(["ativo", "inativo"]).default("ativo"),
});

const AlocSchema = z.object({
  obraId: z.string().min(1),
  cargo: z.string().optional(),
  inicio: z.string().optional(),
  fim: z.string().optional(),
});

const PagSchema = z.object({
  obraId: z.string().optional(),
  valor: z.coerce.number().positive(),
  descricao: z.string().optional(),
  pagoEm: z.string().optional(),
});

export type FuncFormState = { error?: string } | null;

export async function criarFuncionario(_prev: FuncFormState, formData: FormData): Promise<FuncFormState> {
  const empresaId = await getEmpresaId();
  const parsed = FuncSchema.safeParse({
    nome: formData.get("nome"),
    cpf: formData.get("cpf") || undefined,
    cargo: formData.get("cargo") || undefined,
    telefone: formData.get("telefone") || undefined,
    email: formData.get("email") || undefined,
    salario: formData.get("salario") || undefined,
    admissao: formData.get("admissao") || undefined,
    status: formData.get("status") || "ativo",
  });
  if (!parsed.success) return { error: "Verifique os campos obrigatórios." };
  const { nome, cpf, cargo, telefone, email, salario, admissao, status } = parsed.data;
  await prisma.funcionario.create({
    data: {
      empresaId, nome, cpf: cpf || null, cargo: cargo || null,
      telefone: telefone || null, email: email || null,
      salario: salario ?? null, status: status as any,
      admissao: admissao ? new Date(admissao) : null,
    },
  });
  revalidatePath("/funcionarios");
  return null;
}

export async function editarFuncionario(id: string, _prev: FuncFormState, formData: FormData): Promise<FuncFormState> {
  const empresaId = await getEmpresaId();
  const parsed = FuncSchema.safeParse({
    nome: formData.get("nome"),
    cpf: formData.get("cpf") || undefined,
    cargo: formData.get("cargo") || undefined,
    telefone: formData.get("telefone") || undefined,
    email: formData.get("email") || undefined,
    salario: formData.get("salario") || undefined,
    admissao: formData.get("admissao") || undefined,
    status: formData.get("status") || "ativo",
  });
  if (!parsed.success) return { error: "Verifique os campos obrigatórios." };
  const { nome, cpf, cargo, telefone, email, salario, admissao, status } = parsed.data;
  await prisma.funcionario.updateMany({
    where: { id, empresaId },
    data: {
      nome, cpf: cpf || null, cargo: cargo || null,
      telefone: telefone || null, email: email || null,
      salario: salario ?? null, status: status as any,
      admissao: admissao ? new Date(admissao) : null,
    },
  });
  revalidatePath("/funcionarios");
  revalidatePath(`/funcionarios/${id}`);
  return null;
}

export async function alocarFuncionario(funcionarioId: string, _prev: FuncFormState, formData: FormData): Promise<FuncFormState> {
  const empresaId = await getEmpresaId();
  const parsed = AlocSchema.safeParse({
    obraId: formData.get("obraId"),
    cargo: formData.get("cargo") || undefined,
    inicio: formData.get("inicio") || undefined,
    fim: formData.get("fim") || undefined,
  });
  if (!parsed.success) return { error: "Selecione a obra de destino." };
  const { obraId, cargo, inicio, fim } = parsed.data;
  const obra = await prisma.obra.findFirst({ where: { id: obraId, empresaId }, select: { id: true } });
  if (!obra) return { error: "Obra não encontrada." };
  await prisma.alocacaoFuncionario.create({
    data: {
      funcionarioId, obraId,
      cargo: cargo || null,
      inicio: inicio ? new Date(inicio) : null,
      fim: fim ? new Date(fim) : null,
    },
  });
  revalidatePath(`/funcionarios/${funcionarioId}`);
  return null;
}

export async function registrarPagamento(funcionarioId: string, _prev: FuncFormState, formData: FormData): Promise<FuncFormState> {
  const empresaId = await getEmpresaId();
  const parsed = PagSchema.safeParse({
    obraId: formData.get("obraId") || undefined,
    valor: formData.get("valor"),
    descricao: formData.get("descricao") || undefined,
    pagoEm: formData.get("pagoEm") || undefined,
  });
  if (!parsed.success) return { error: "Informe o valor do pagamento." };
  const { obraId, valor, descricao, pagoEm } = parsed.data;
  if (obraId) {
    const obra = await prisma.obra.findFirst({ where: { id: obraId, empresaId }, select: { id: true } });
    if (!obra) return { error: "Obra não encontrada." };
  }
  await prisma.pagamentoFuncionario.create({
    data: {
      funcionarioId, empresaId, valor,
      obraId: obraId || null,
      descricao: descricao || null,
      pagoEm: pagoEm ? new Date(pagoEm) : new Date(),
    },
  });
  revalidatePath(`/funcionarios/${funcionarioId}`);
  return null;
}
