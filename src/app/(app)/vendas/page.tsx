import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { VendasView } from "./vendas-view";

export const metadata: Metadata = { title: "Vendas" };

export default async function VendasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const usuario = await prisma.usuario.findUnique({
    where: { id: user.id },
    select: { empresaId: true },
  });
  if (!usuario) redirect("/login");

  const [vendas, terrenos] = await Promise.all([
    prisma.venda.findMany({
      where: { empresaId: usuario.empresaId },
      include: {
        terreno: { select: { id: true, nome: true, cidade: true } },
        parcelas: { select: { id: true, status: true, valor: true } },
      },
      orderBy: { criadoEm: "desc" },
    }),
    prisma.terreno.findMany({
      where: { empresaId: usuario.empresaId, status: { not: "vendido" } },
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
