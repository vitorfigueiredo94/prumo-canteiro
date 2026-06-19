import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardView } from "./dashboard-view";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const eid = session.empresaId;
  const today = new Date();
  const in7 = new Date(today); in7.setDate(today.getDate() + 7);

  const [
    obrasAtivas, obrasTotal,
    funcAtivos,
    orcamentoAggregate,
    gastoNotasAggregate,
    gastoPagsAggregate,
    receitaAggregate,
    valorAtrasadoAggregate,
    notasPendentes,
    parcelasVencendo,
    parcelasAtrasadas,
    obrasRaw,
    funcAtivosRaw,
    notasPorCategoria,
  ] = await Promise.all([
    prisma.obra.count({ where: { empresaId: eid, status: "em_andamento" } }),
    prisma.obra.count({ where: { empresaId: eid } }),
    prisma.funcionario.count({ where: { empresaId: eid, status: "ativo" } }),
    prisma.obra.aggregate({ where: { empresaId: eid }, _sum: { orcamento: true } }),
    prisma.notaFiscal.aggregate({ where: { empresaId: eid, status: "confirmada" }, _sum: { valor: true } }),
    prisma.pagamentoFuncionario.aggregate({ where: { empresaId: eid }, _sum: { valor: true } }),
    prisma.parcela.aggregate({ where: { venda: { empresaId: eid }, status: "paga" }, _sum: { valor: true } }),
    prisma.parcela.aggregate({ where: { venda: { empresaId: eid }, status: "aberta", vencimento: { lt: today } }, _sum: { valor: true } }),
    prisma.notaFiscal.findMany({
      where: { empresaId: eid, status: "pendente" },
      include: { obra: { select: { id: true, nome: true } } },
      orderBy: { emitidaEm: "desc" }, take: 5,
    }),
    prisma.parcela.findMany({
      where: { venda: { empresaId: eid }, status: "aberta", vencimento: { gte: today, lte: in7 } },
      include: { venda: { select: { id: true, nomeComprador: true } } },
      orderBy: { vencimento: "asc" }, take: 5,
    }),
    prisma.parcela.count({ where: { venda: { empresaId: eid }, status: "aberta", vencimento: { lt: today } } }),
    prisma.obra.findMany({
      where: { empresaId: eid },
      include: {
        notas: { where: { status: "confirmada" }, select: { valor: true } },
        pagamentos: { select: { valor: true } },
      },
    }),
    prisma.funcionario.findMany({
      where: { empresaId: eid, status: "ativo" },
      select: { id: true, nome: true, cargo: true, salario: true },
      orderBy: { salario: "desc" },
      take: 5,
    }),
    prisma.notaFiscal.groupBy({
      by: ["categoria"],
      where: { empresaId: eid, status: "confirmada" },
      _sum: { valor: true },
    }),
  ]);

  const orcamento = Number(orcamentoAggregate._sum.orcamento ?? 0);
  const gastoTotal = Number(gastoNotasAggregate._sum.valor ?? 0) + Number(gastoPagsAggregate._sum.valor ?? 0);
  const receita = Number(receitaAggregate._sum.valor ?? 0);
  const parcelasAtrasadasValor = Number((valorAtrasadoAggregate._sum as any).valor ?? 0);

  const obrasFinanceiro = obrasRaw.map((o: typeof obrasRaw[0]) => {
    const gasto = o.notas.reduce((s: number, n: any) => s + Number(n.valor), 0)
      + o.pagamentos.reduce((s: number, p: any) => s + Number(p.valor), 0);
    return { id: o.id, nome: o.nome, status: o.status, orcamento: Number(o.orcamento), progresso: o.progresso, gasto };
  });

  const obrasComEstouro = obrasFinanceiro
    .filter((o) => o.gasto > o.orcamento)
    .map((o) => ({ id: o.id, nome: o.nome, orcamento: o.orcamento, gasto: o.gasto }));

  const catMap: Record<string, number> = {};
  for (const row of notasPorCategoria) {
    catMap[row.categoria] = Number((row._sum as any).valor ?? 0);
  }

  return (
    <DashboardView
      nomeUsuario={session.nome}
      kpis={{ obrasAtivas, obrasTotal, funcAtivos, orcamento, gastoTotal, receita, parcelasAtrasadas, parcelasAtrasadasValor }}
      notasPendentes={notasPendentes.map((n: typeof notasPendentes[0]) => ({ id: n.id, fornecedor: n.fornecedor, valor: Number(n.valor), emitidaEm: n.emitidaEm?.toISOString() ?? null, obra: n.obra }))}
      parcelasVencendo={parcelasVencendo.map((p: typeof parcelasVencendo[0]) => ({ id: p.id, valor: Number(p.valor), vencimento: p.vencimento?.toISOString() ?? null, venda: p.venda }))}
      obrasComEstouro={obrasComEstouro}
      obrasFinanceiro={obrasFinanceiro}
      funcAtivosRaw={funcAtivosRaw.map((f: typeof funcAtivosRaw[0]) => ({ id: f.id, nome: f.nome, cargo: f.cargo, salario: Number(f.salario ?? 0) }))}
      gastosPorCategoria={catMap}
    />
  );
}
