import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ObraDetail } from "./obra-detail";

export const metadata: Metadata = { title: "Detalhes da Obra" };

export default async function ObraDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const eid = session.empresaId;

  const [obra, terrenos] = await Promise.all([
    prisma.obra.findFirst({
      where: { id, empresaId: eid },
      include: {
        terreno: { select: { id: true, nome: true, cidade: true, numero: true } },
        notas: {
          orderBy: { emitidaEm: "desc" },
          include: { funcionario: { select: { id: true, nome: true } } },
        },
        alocacoes: {
          include: { funcionario: { select: { id: true, nome: true, cargo: true, telefone: true } } },
          orderBy: { inicio: "asc" },
        },
        pagamentos: {
          orderBy: { pagoEm: "desc" },
          include: { funcionario: { select: { id: true, nome: true } } },
        },
        diario: { orderBy: { data: "desc" } },
      },
    }),
    prisma.terreno.findMany({
      where: { empresaId: eid },
      select: { id: true, nome: true, cidade: true },
      orderBy: { nome: "asc" },
    }),
  ]);

  const funcionarios = await prisma.funcionario.findMany({
    where: { empresaId: eid, status: "ativo" },
    select: { id: true, nome: true, cargo: true },
    orderBy: { nome: "asc" },
  });

  if (!obra) notFound();

  const receitaAtribuidaAgg = obra.terreno?.id
    ? await prisma.parcela.aggregate({
        where: { status: "paga", venda: { terrenoId: obra.terreno.id } },
        _sum: { valor: true },
      })
    : null;
  const receitaAtribuida = Number((receitaAtribuidaAgg?._sum as any)?.valor ?? 0);

  const serialized = {
    ...obra,
    orcamento: Number(obra.orcamento),
    inicio: obra.inicio?.toISOString() ?? null,
    prazo: obra.prazo?.toISOString() ?? null,
    cronogramaJson: obra.cronogramaJson ?? null,
    notas: obra.notas.map((n: typeof obra.notas[0]) => ({
      ...n,
      valor: Number(n.valor),
      emitidaEm: n.emitidaEm?.toISOString() ?? null,
    })),
    pagamentos: obra.pagamentos.map((p: typeof obra.pagamentos[0]) => ({
      ...p,
      valor: Number(p.valor),
      pagoEm: p.pagoEm?.toISOString() ?? null,
    })),
    alocacoes: obra.alocacoes.map((a: typeof obra.alocacoes[0]) => ({
      ...a,
      inicio: a.inicio?.toISOString() ?? null,
      fim: a.fim?.toISOString() ?? null,
    })),
    diario: obra.diario.map((d: typeof obra.diario[0]) => ({
      ...d,
      data: d.data?.toISOString() ?? null,
    })),
  };

  return <ObraDetail obra={serialized as any} terrenos={terrenos} funcionarios={funcionarios} receitaAtribuida={receitaAtribuida} />;
}
