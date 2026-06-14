import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VendasView } from "./vendas-view";

export const metadata: Metadata = { title: "Vendas" };

export default async function VendasPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const eid = session.empresaId;

  const [vendas, terrenos] = await Promise.all([
    prisma.venda.findMany({
      where: { empresaId: eid },
      include: {
        terreno: { select: { id: true, nome: true, cidade: true } },
        parcelas: { select: { id: true, status: true, valor: true } },
      },
      orderBy: { criadoEm: "desc" },
    }),
    prisma.terreno.findMany({
      where: { empresaId: eid, status: { not: "vendido" } },
      select: { id: true, nome: true, cidade: true },
      orderBy: { nome: "asc" },
    }),
  ]);

  const serialized = vendas.map((v: typeof vendas[0]) => ({
    ...v,
    valorTotal: Number(v.valorTotal),
    entrada: Number(v.entrada),
    dataContrato: v.dataContrato?.toISOString() ?? null,
    parcelas: v.parcelas.map((p: typeof v.parcelas[0]) => ({ ...p, valor: Number(p.valor) })),
  }));

  return <VendasView vendas={serialized as any} terrenos={terrenos} />;
}
