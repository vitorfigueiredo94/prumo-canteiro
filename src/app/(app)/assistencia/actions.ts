"use server";

import { prisma } from "@/lib/prisma";
import { getEmpresaId } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { calcularGarantia } from "@/lib/garantia-service";
import { buildGarantiaPrompt } from "@/lib/garantia-prompt";
import { chamarLLM } from "@/lib/llm";
import { COMPONENTES_PADRAO } from "@/lib/garantia-service";
import { z } from "zod";

export type AssistenciaFormState = { error?: string } | null;

const ChamadoSchema = z.object({
  vendaId:          z.string().min(1),
  componenteId:     z.string().min(1),
  descricao:        z.string().min(10, "Descreva o defeito com ao menos 10 caracteres."),
  dataEntregaChaves: z.string().min(1, "Informe a data de entrega das chaves."),
});

export async function criarChamado(
  _prev: AssistenciaFormState,
  formData: FormData
): Promise<AssistenciaFormState> {
  const empresaId = await getEmpresaId();
  const parsed = ChamadoSchema.safeParse({
    vendaId:           formData.get("vendaId"),
    componenteId:      formData.get("componenteId"),
    descricao:         formData.get("descricao"),
    dataEntregaChaves: formData.get("dataEntregaChaves"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Verifique os campos." };

  const { vendaId, componenteId, descricao, dataEntregaChaves } = parsed.data;

  const venda = await prisma.venda.findFirst({ where: { id: vendaId, empresaId }, select: { id: true } });
  if (!venda) return { error: "Venda não encontrada." };

  const comp = await prisma.garantiaComponente.findFirst({ where: { id: componenteId, empresaId }, select: { id: true } });
  if (!comp) return { error: "Componente não encontrado." };

  await prisma.chamadoAssistencia.create({
    data: {
      empresaId, vendaId, componenteId, descricao,
      dataEntregaChaves: new Date(dataEntregaChaves),
      status: "aberto",
    },
  });

  revalidatePath("/assistencia");
  return null;
}

export async function gerarParecer(chamadoId: string): Promise<{ error?: string }> {
  const empresaId = await getEmpresaId();

  const chamado = await prisma.chamadoAssistencia.findFirst({
    where: { id: chamadoId, empresaId },
  });
  if (!chamado) return { error: "Chamado não encontrado." };
  if (!chamado.dataEntregaChaves) return { error: "Informe a data de entrega das chaves." };

  const componente = await prisma.garantiaComponente.findFirst({
    where: { id: chamado.componenteId, empresaId },
  });
  if (!componente) return { error: "Componente não encontrado." };

  const venda = await prisma.venda.findFirst({
    where: { id: chamado.vendaId, empresaId },
    select: { nomeComprador: true },
  });
  if (!venda) return { error: "Venda não encontrada." };

  const garantia = calcularGarantia(
    chamado.dataEntregaChaves,
    chamado.criadoEm,
    componente.prazoLegalMeses,
    componente.prazoContratMeses
  );

  const prompt = buildGarantiaPrompt({
    nomeComprador:     venda.nomeComprador,
    componenteNome:    componente.nome,
    baseLegal:         componente.baseLegal ?? "CC art. 618",
    descricaoDefeito:  chamado.descricao,
    dataEntregaChaves: chamado.dataEntregaChaves.toLocaleDateString("pt-BR"),
    dataAbertura:      chamado.criadoEm.toLocaleDateString("pt-BR"),
    garantia,
  });

  try {
    const parecerTexto = await chamarLLM(prompt);
    await prisma.chamadoAssistencia.update({
      where: { id: chamadoId },
      data: {
        parecerTexto,
        parecerStatus: garantia.status,
        parecerGeradoEm: new Date(),
        status: garantia.status === "fora_garantia" ? "negado" : "aceito",
      },
    });
  } catch (err) {
    return { error: `Erro ao gerar parecer: ${String(err).slice(0, 100)}` };
  }

  revalidatePath("/assistencia");
  return {};
}

export async function atualizarStatusChamado(
  chamadoId: string,
  status: string
): Promise<void> {
  const empresaId = await getEmpresaId();
  await prisma.chamadoAssistencia.updateMany({ where: { id: chamadoId, empresaId }, data: { status } });
  revalidatePath("/assistencia");
}

export async function excluirChamado(chamadoId: string): Promise<void> {
  const empresaId = await getEmpresaId();
  await prisma.chamadoAssistencia.deleteMany({ where: { id: chamadoId, empresaId } });
  revalidatePath("/assistencia");
}

export async function inicializarGarantiasPadrao(): Promise<{ criados: number }> {
  const empresaId = await getEmpresaId();
  let criados = 0;

  for (const comp of COMPONENTES_PADRAO) {
    const existe = await prisma.garantiaComponente.findFirst({
      where: { empresaId, codigo: comp.codigo },
      select: { id: true },
    });
    if (!existe) {
      await prisma.garantiaComponente.create({ data: { empresaId, ...comp } });
      criados++;
    }
  }

  revalidatePath("/assistencia");
  return { criados };
}

export async function criarComponente(
  _prev: AssistenciaFormState,
  formData: FormData
): Promise<AssistenciaFormState> {
  const empresaId = await getEmpresaId();
  const codigo = String(formData.get("codigo") ?? "").trim().toLowerCase().replace(/\s+/g, "_");
  const nome   = String(formData.get("nome") ?? "").trim();
  const prazoLegal  = parseInt(String(formData.get("prazoLegalMeses")  ?? "12"));
  const prazoContrat= parseInt(String(formData.get("prazoContratMeses") ?? "12"));
  const baseLegal   = String(formData.get("baseLegal") ?? "").trim() || null;

  if (!codigo || !nome) return { error: "Código e nome são obrigatórios." };

  const existe = await prisma.garantiaComponente.findFirst({ where: { empresaId, codigo }, select: { id: true } });
  if (existe) return { error: "Já existe um componente com este código." };

  await prisma.garantiaComponente.create({
    data: {
      empresaId, codigo, nome,
      prazoLegalMeses: prazoLegal,
      prazoContratMeses: prazoContrat,
      baseLegal,
    },
  });

  revalidatePath("/assistencia");
  return null;
}
