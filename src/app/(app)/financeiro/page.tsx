import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FinanceiroView } from "./financeiro-view";
import { getPlanoEmpresa, temRecurso, RECURSO } from "@/lib/plano";
import { PlanoGate } from "@/components/layout/plano-gate";

export const metadata: Metadata = { title: "Financeiro" };

export default async function FinanceiroPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const eid = session.empresaId;
  const plano = await getPlanoEmpresa(eid);
  if (!temRecurso(plano, RECURSO.FLUXO_CAIXA)) {
    return <PlanoGate recurso="fluxo_caixa" planoNecessario="Profissional" planoAtual={plano.planoNome} />;
  }

  const today = new Date();

  const [obras, notas, pagamentos, parcelas, emRevisaoAgg, parcelasVencidas, parcelasFuturas] = await Promise.all([
    prisma.obra.findMany({
      where: { empresaId: eid },
      select: { id: true, nome: true, orcamento: true, status: true },
      orderBy: { nome: "asc" },
    }),
    prisma.notaFiscal.findMany({
      where: { empresaId: eid, status: "confirmada" },
      select: { obraId: true, valor: true, emitidaEm: true, categoria: true, fornecedor: true },
    }),
    prisma.pagamentoFuncionario.findMany({
      where: { empresaId: eid },
      select: { obraId: true, valor: true, pagoEm: true, descricao: true, funcionario: { select: { nome: true } } },
    }),
    prisma.parcela.findMany({
      where: { venda: { empresaId: eid }, status: "paga" },
      select: { valor: true, pagoEm: true },
    }),
    prisma.notaFiscal.aggregate({
      where: { empresaId: eid, status: "em_revisao" },
      _sum: { valor: true },
    }),
    // Inadimplência: parcelas vencidas e não pagas
    prisma.parcela.findMany({
      where: { venda: { empresaId: eid }, status: "aberta", vencimento: { lt: today } },
      select: { id: true, valor: true, vencimento: true, numero: true, venda: { select: { nomeComprador: true } } },
      orderBy: { vencimento: "asc" },
      take: 200,
    }),
    // Projeção: parcelas abertas com vencimento futuro
    prisma.parcela.findMany({
      where: { venda: { empresaId: eid }, status: "aberta", vencimento: { gte: today } },
      select: { valor: true, vencimento: true },
      orderBy: { vencimento: "asc" },
      take: 500,
    }),
  ]);

  const serialized = {
    obras: obras.map((o: typeof obras[0]) => ({ ...o, orcamento: Number(o.orcamento) })),
    notas: notas.map((n: typeof notas[0]) => ({ ...n, valor: Number(n.valor), emitidaEm: n.emitidaEm?.toISOString() ?? null })),
    pagamentos: pagamentos.map((p: typeof pagamentos[0]) => ({ ...p, valor: Number(p.valor), pagoEm: p.pagoEm?.toISOString() ?? null, funcNome: (p as any).funcionario?.nome ?? null })),
    parcelas: parcelas.map((p: typeof parcelas[0]) => ({ valor: Number(p.valor), pagoEm: p.pagoEm?.toISOString() ?? null })),
    totalEmRevisao: Number((emRevisaoAgg._sum as any).valor ?? 0),
    parcelasVencidas: parcelasVencidas.map((p) => ({
      id: p.id,
      valor: Number(p.valor),
      vencimento: p.vencimento?.toISOString() ?? null,
      numero: p.numero,
      nomeComprador: (p as any).venda?.nomeComprador ?? "—",
    })),
    parcelasFuturas: parcelasFuturas.map((p) => ({
      valor: Number(p.valor),
      vencimento: p.vencimento?.toISOString() ?? null,
    })),
  };

  return <FinanceiroView {...serialized} />;
}
