"use server";

import { prisma } from "@/lib/prisma";
import { getEmpresaId } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { criarChecklistParaObra } from "@/features/checklist/service";
import { getPlanoEmpresa, dentroDoLimiteObras } from "@/lib/plano";

const ObraSchema = z.object({
  nome: z.string().min(1),
  terrenoId: z.string().optional(),
  orcamento: z.coerce.number().positive(),
  status: z.enum(["planejamento", "em_andamento", "parada", "concluida"]),
  inicio: z.string().optional(),
  prazo: z.string().optional(),
  responsavel: z.string().optional(),
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  cep: z.string().optional(),
  clienteNome: z.string().optional(),
  clienteTelefone: z.string().optional(),
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
    endereco: formData.get("endereco") || undefined,
    cidade: formData.get("cidade") || undefined,
    cep: formData.get("cep") || undefined,
    clienteNome: formData.get("clienteNome") || undefined,
    clienteTelefone: formData.get("clienteTelefone") || undefined,
    progresso: formData.get("progresso") || 0,
  });
  if (!parsed.success) return { error: "Verifique os campos obrigatórios." };
  const { nome, terrenoId, orcamento, status, inicio, prazo, responsavel, endereco, cidade, cep, clienteNome, clienteTelefone, progresso } = parsed.data;

  // Verifica limite de obras do plano
  const [plano, totalObras] = await Promise.all([
    getPlanoEmpresa(empresaId),
    prisma.obra.count({ where: { empresaId } }),
  ]);
  if (!dentroDoLimiteObras(plano, totalObras)) {
    return { error: `Seu plano ${plano.planoNome} permite no máximo ${plano.limiteObras} obra(s). Faça upgrade para adicionar mais.` };
  }

  const obra = await prisma.obra.create({
    data: {
      empresaId, nome, orcamento, status,
      terrenoId: terrenoId || null,
      inicio: inicio ? new Date(inicio) : null,
      prazo: prazo ? new Date(prazo) : null,
      responsavel: responsavel || null,
      endereco: endereco || null,
      cidade: cidade || null,
      cep: cep || null,
      clienteNome: clienteNome || null,
      clienteTelefone: clienteTelefone || null,
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
    endereco: formData.get("endereco") || undefined,
    cidade: formData.get("cidade") || undefined,
    cep: formData.get("cep") || undefined,
    clienteNome: formData.get("clienteNome") || undefined,
    clienteTelefone: formData.get("clienteTelefone") || undefined,
    progresso: formData.get("progresso") || 0,
  });
  if (!parsed.success) return { error: "Verifique os campos obrigatórios." };
  const { nome, terrenoId, orcamento, status, inicio, prazo, responsavel, endereco, cidade, cep, clienteNome, clienteTelefone, progresso } = parsed.data;
  await prisma.obra.updateMany({
    where: { id, empresaId },
    data: {
      nome, orcamento, status, progresso,
      terrenoId: terrenoId || null,
      inicio: inicio ? new Date(inicio) : null,
      prazo: prazo ? new Date(prazo) : null,
      responsavel: responsavel || null,
      endereco: endereco || null,
      cidade: cidade || null,
      cep: cep || null,
      clienteNome: clienteNome || null,
      clienteTelefone: clienteTelefone || null,
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

// ── Kanban de portfólio: mudar status da obra (drag) ─────────────────────────

export async function mudarStatusObra(id: string, status: string): Promise<{ error?: string } | null> {
  const empresaId = await getEmpresaId();
  const validos = ["planejamento", "em_andamento", "parada", "concluida"];
  if (!validos.includes(status)) return { error: "Status inválido." };
  const r = await prisma.obra.updateMany({ where: { id, empresaId }, data: { status } });
  if (r.count === 0) return { error: "Obra não encontrada." };
  revalidatePath("/obras");
  revalidatePath(`/obras/${id}`);
  return null;
}

// ── Alocação de funcionário na obra ──────────────────────────────────────────

export async function alocarNaObra(obraId: string, formData: FormData): Promise<{ error?: string } | null> {
  const empresaId = await getEmpresaId();
  const funcionarioId = String(formData.get("funcionarioId") ?? "");
  const cargo = (String(formData.get("cargo") ?? "").trim()) || null;
  if (!funcionarioId) return { error: "Selecione um funcionário." };

  // Garante que obra e funcionário são da empresa
  const [obra, func] = await Promise.all([
    prisma.obra.findFirst({ where: { id: obraId, empresaId }, select: { id: true } }),
    prisma.funcionario.findFirst({ where: { id: funcionarioId, empresaId }, select: { id: true } }),
  ]);
  if (!obra || !func) return { error: "Obra ou funcionário não encontrado." };

  // Evita duplicar alocação ativa do mesmo funcionário na mesma obra
  const jaAlocado = await prisma.alocacaoFuncionario.findFirst({ where: { obraId, funcionarioId } });
  if (jaAlocado) return { error: "Funcionário já está alocado nesta obra." };

  await prisma.alocacaoFuncionario.create({
    data: { obraId, funcionarioId, cargo, inicio: new Date() },
  });
  revalidatePath(`/obras/${obraId}`);
  return null;
}

export async function desalocarFuncionario(alocacaoId: string, obraId: string): Promise<void> {
  const empresaId = await getEmpresaId();
  // Confirma que a alocação pertence a uma obra da empresa antes de apagar
  const aloc = await prisma.alocacaoFuncionario.findFirst({
    where: { id: alocacaoId, obra: { empresaId } },
    select: { id: true },
  });
  if (!aloc) return;
  await prisma.alocacaoFuncionario.delete({ where: { id: alocacaoId } });
  revalidatePath(`/obras/${obraId}`);
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
