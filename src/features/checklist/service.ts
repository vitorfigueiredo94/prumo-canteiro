import { prisma } from "@/lib/prisma";
import {
  TEMPLATES,
  FLUXO_OBRA,
  FLUXO_TERRENO,
  type TipoChecklist,
} from "./templates";

// ── Garante que todos os templates existem no banco ──────────────────────────

async function garantirTemplates() {
  for (const tpl of TEMPLATES) {
    const existe = await prisma.checklistTemplate.findUnique({
      where: { tipo: tpl.tipo },
    });
    if (existe) continue;
    await prisma.checklistTemplate.create({
      data: {
        tipo: tpl.tipo,
        nome: tpl.nome,
        ordem: tpl.ordem,
        itens: {
          create: tpl.itens.map((descricao, idx) => ({
            descricao,
            obrigatorio: true,
            ordem: idx,
          })),
        },
      },
    });
  }
}

// ── Gatilhos de criação ──────────────────────────────────────────────────────

export async function criarChecklistParaObra(obraId: string, empresaId: string) {
  await garantirTemplates();
  const template = await prisma.checklistTemplate.findUnique({
    where: { tipo: "OBRA_INICIO" },
    include: { itens: { orderBy: { ordem: "asc" } } },
  });
  if (!template) return;
  await prisma.checklist.create({
    data: {
      empresaId,
      ownerType: "obra",
      obraId,
      templateId: template.id,
      fase: "OBRA_INICIO",
      itens: {
        create: template.itens.map((ti) => ({
          templateItemId: ti.id,
          descricao: ti.descricao,
        })),
      },
    },
  });
}

export async function criarChecklistParaTerreno(terrenoId: string, empresaId: string) {
  await garantirTemplates();
  const template = await prisma.checklistTemplate.findUnique({
    where: { tipo: "TERRENO_PREPARACAO" },
    include: { itens: { orderBy: { ordem: "asc" } } },
  });
  if (!template) return;
  await prisma.checklist.create({
    data: {
      empresaId,
      ownerType: "terreno",
      terrenoId,
      templateId: template.id,
      fase: "TERRENO_PREPARACAO",
      itens: {
        create: template.itens.map((ti) => ({
          templateItemId: ti.id,
          descricao: ti.descricao,
        })),
      },
    },
  });
}

// ── Consulta de progresso ────────────────────────────────────────────────────

export async function getChecklistComProgresso(
  ownerType: "obra" | "terreno",
  ownerId: string,
  empresaId: string
) {
  const where =
    ownerType === "obra"
      ? { obraId: ownerId, empresaId, ownerType }
      : { terrenoId: ownerId, empresaId, ownerType };

  const checklists = await prisma.checklist.findMany({
    where,
    include: { itens: { orderBy: { criadoEm: "asc" } } },
    orderBy: { criadoEm: "asc" },
  });

  return checklists.map((cl) => {
    const total = cl.itens.length;
    const concluidos = cl.itens.filter((i) => i.concluido).length;
    const porcentagem = total === 0 ? 0 : Math.round((concluidos / total) * 100);
    return { ...cl, total, concluidos, porcentagem };
  });
}

// ── Toggle de item ───────────────────────────────────────────────────────────

export async function toggleItem(
  itemId: string,
  empresaId: string,
  concluido: boolean,
  observacao?: string
) {
  const item = await prisma.checklistItem.findUnique({
    where: { id: itemId },
    include: { checklist: { select: { empresaId: true } } },
  });
  if (!item || item.checklist.empresaId !== empresaId) {
    throw new Error("Item não encontrado");
  }
  return prisma.checklistItem.update({
    where: { id: itemId },
    data: {
      concluido,
      concluidoEm: concluido ? new Date() : null,
      observacao: observacao ?? item.observacao,
    },
  });
}

// ── Sugestão de fase ─────────────────────────────────────────────────────────

export async function getSugestaoFase(
  ownerType: "obra" | "terreno",
  ownerId: string,
  empresaId: string
) {
  const fluxo = ownerType === "obra" ? FLUXO_OBRA : FLUXO_TERRENO;
  const where =
    ownerType === "obra"
      ? { obraId: ownerId, empresaId, ownerType }
      : { terrenoId: ownerId, empresaId, ownerType };

  const checklists = await prisma.checklist.findMany({
    where,
    include: { itens: { select: { concluido: true } } },
    orderBy: { criadoEm: "asc" },
  });

  const faseAtual = checklists.at(-1);
  if (!faseAtual) return null;

  const total = faseAtual.itens.length;
  const concluidos = faseAtual.itens.filter((i) => i.concluido).length;
  const porcentagem = total === 0 ? 0 : Math.round((concluidos / total) * 100);
  const idxAtual = fluxo.indexOf(faseAtual.fase as TipoChecklist);
  const proximaFase =
    idxAtual >= 0 && idxAtual < fluxo.length - 1 ? fluxo[idxAtual + 1] : null;
  const fasesPercorridas = checklists.map((c) => c.fase);

  return {
    faseAtual: faseAtual.fase,
    porcentagem,
    concluidos,
    total,
    completo: porcentagem === 100,
    podeAvancar: porcentagem === 100 && !!proximaFase,
    proximaFase,
    fasesPercorridas,
    encerrado: !proximaFase && porcentagem === 100,
  };
}

// ── Avançar fase ─────────────────────────────────────────────────────────────

export async function avancarFase(
  ownerType: "obra" | "terreno",
  ownerId: string,
  empresaId: string
) {
  await garantirTemplates();
  const sugestao = await getSugestaoFase(ownerType, ownerId, empresaId);
  if (!sugestao?.podeAvancar || !sugestao.proximaFase) {
    throw new Error(
      "Fase atual não está 100% concluída ou não há próxima fase"
    );
  }

  const template = await prisma.checklistTemplate.findUnique({
    where: { tipo: sugestao.proximaFase },
    include: { itens: { orderBy: { ordem: "asc" } } },
  });
  if (!template) throw new Error("Template não encontrado");

  return prisma.checklist.create({
    data: {
      empresaId,
      ownerType,
      obraId: ownerType === "obra" ? ownerId : undefined,
      terrenoId: ownerType === "terreno" ? ownerId : undefined,
      templateId: template.id,
      fase: sugestao.proximaFase,
      itens: {
        create: template.itens.map((ti) => ({
          templateItemId: ti.id,
          descricao: ti.descricao,
        })),
      },
    },
    include: { itens: true },
  });
}
