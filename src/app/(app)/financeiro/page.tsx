import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { FinanceiroView } from "./financeiro-view";

export const metadata: Metadata = { title: "Financeiro" };

export default async function FinanceiroPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const usuario = await prisma.usuario.findUnique({
    where: { id: user.id },
    select: { empresaId: true },
  });
  if (!usuario) redirect("/login");

  const eid = usuario.empresaId;

  const [obras, notas, pagamentos, parcelas] = await Promise.all([
    prisma.obra.findMany({
      where: { empresaId: eid },
      select: { id: true, nome: true, orcamento: true, status: true },
      orderBy: { nome: "asc" },
    }),
    prisma.notaFiscal.findMany({
      where: { empresaId: eid, status: "confirmada" },
      select: { obraId: true, valor: true, emitidaEm: true, categoria: true },
    }),
    prisma.pagamentoFuncionario.findMany({
      where: { empresaId: eid },
      select: { obraId: true, valor: true, pagoEm: true },
    }),
    prisma.parcela.findMany({
      where: { venda: { empresaId: eid }, status: "paga" },
      select: { valor: true, pagoEm: true },
    }),
  ]);

  const serialized = {
    obras: obras.map((o: typeof obras[0]) => ({ ...o, orcamento: Number(o.orcamento) })),
    notas: notas.map((n: typeof notas[0]) => ({ ...n, valor: Number(n.valor), emitidaEm: n.emitidaEm?.toISOString() ?? null })),
    pagamentos: pagamentos.map((p: typeof pagamentos[0]) => ({ ...p, valor: Number(p.valor), pagoEm: p.pagoEm?.toISOString() ?? null })),
    parcelas: parcelas.map((p: typeof parcelas[0]) => ({ valor: Number(p.valor), pagoEm: p.pagoEm?.toISOString() ?? null })),
  };

  return <FinanceiroView {...serialized} />;
}
