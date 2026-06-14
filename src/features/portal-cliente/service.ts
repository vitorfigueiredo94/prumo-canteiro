import { prisma } from "@/lib/prisma";

export async function listarObrasPortal(empresaId: string) {
  return prisma.obra.findMany({
    where: { empresaId },
    select: {
      id: true,
      nome: true,
      status: true,
      progresso: true,
      orcamento: true,
      inicio: true,
      prazo: true,
      responsavel: true,
      terreno: { select: { nome: true, cidade: true } },
    },
    orderBy: { criadoEm: "desc" },
  });
}

export async function detalheObraPortal(empresaId: string, obraId: string) {
  return prisma.obra.findFirst({
    where: { id: obraId, empresaId },
    select: {
      id: true,
      nome: true,
      status: true,
      progresso: true,
      orcamento: true,
      inicio: true,
      prazo: true,
      responsavel: true,
      terreno: { select: { nome: true, cidade: true, area: true } },
      notas: {
        where: { status: "confirmada" },
        select: { fornecedor: true, categoria: true, valor: true, emitidaEm: true },
      },
      diario: {
        select: { data: true, conteudo: true, clima: true, equipePresente: true },
        orderBy: { data: "desc" },
        take: 10,
      },
    },
  });
}

export async function financeiroPortal(empresaId: string) {
  const [porCategoria, totalPagamentos] = await Promise.all([
    prisma.notaFiscal.groupBy({
      by: ["categoria"],
      where: { empresaId },
      _sum: { valor: true },
      _count: true,
    }),
    prisma.pagamentoFuncionario.aggregate({
      where: { empresaId },
      _sum: { valor: true },
      _count: true,
    }),
  ]);

  return { porCategoria, totalPagamentos };
}
