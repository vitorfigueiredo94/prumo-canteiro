import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ObraDetail } from "./obra-detail";

export const metadata: Metadata = { title: "Detalhes da Obra" };

export default async function ObraDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const usuario = await prisma.usuario.findUnique({
    where: { id: user.id },
    select: { empresaId: true },
  });
  if (!usuario) redirect("/login");

  const [obra, terrenos] = await Promise.all([
    prisma.obra.findFirst({
      where: { id, empresaId: usuario.empresaId },
      include: {
        terreno: { select: { id: true, nome: true, cidade: true, numero: true } },
        notas: {
          orderBy: { emitidaEm: "desc" },
          include: { funcionario: { select: { id: true, nome: true } } },
        },
        alocacoes: {
          include: { funcionario: { select: { id: true, nome: true, cargo: true } } },
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
      where: { empresaId: usuario.empresaId },
      select: { id: true, nome: true, cidade: true },
      orderBy: { nome: "asc" },
    }),
  ]);

  if (!obra) notFound();

  const serialized = {
    ...obra,
    orcamento: Number(obra.orcamento),
    inicio: obra.inicio?.toISOString() ?? null,
    prazo: obra.prazo?.toISOString() ?? null,
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

  return <ObraDetail obra={serialized as any} terrenos={terrenos} />;
}
