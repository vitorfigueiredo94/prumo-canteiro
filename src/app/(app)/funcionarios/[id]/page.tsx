import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FuncionarioDetail } from "./funcionario-detail";

export const metadata: Metadata = { title: "Detalhes do Funcionário" };

export default async function FuncionarioDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const eid = session.empresaId;

  const [funcionario, obras] = await Promise.all([
    prisma.funcionario.findFirst({
      where: { id, empresaId: eid },
      include: {
        alocacoes: {
          include: { obra: { select: { id: true, nome: true, status: true } } },
          orderBy: { inicio: "desc" },
        },
        pagamentos: {
          orderBy: { pagoEm: "desc" },
          include: { obra: { select: { id: true, nome: true } } },
        },
      },
    }),
    prisma.obra.findMany({
      where: { empresaId: eid },
      select: { id: true, nome: true },
      orderBy: { nome: "asc" },
    }),
  ]);

  if (!funcionario) notFound();

  const serialized = {
    ...funcionario,
    salario: funcionario.salario ? Number(funcionario.salario) : null,
    admissao: funcionario.admissao?.toISOString() ?? null,
    alocacoes: funcionario.alocacoes.map((a: typeof funcionario.alocacoes[0]) => ({
      ...a,
      inicio: a.inicio?.toISOString() ?? null,
      fim: a.fim?.toISOString() ?? null,
    })),
    pagamentos: funcionario.pagamentos.map((p: typeof funcionario.pagamentos[0]) => ({
      ...p,
      valor: Number(p.valor),
      pagoEm: p.pagoEm?.toISOString() ?? null,
    })),
  };

  return <FuncionarioDetail funcionario={serialized as any} obras={obras} />;
}
