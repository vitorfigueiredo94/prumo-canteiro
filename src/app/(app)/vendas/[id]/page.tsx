import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VendaDetail } from "./venda-detail";

export const metadata: Metadata = { title: "Extrato de Venda" };

export default async function VendaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const venda = await prisma.venda.findFirst({
    where: { id, empresaId: session.empresaId },
    include: {
      terreno: { select: { id: true, nome: true, cidade: true, numero: true } },
      parcelas: { orderBy: { numero: "asc" } },
    },
  });

  if (!venda) notFound();

  const serialized = {
    ...venda,
    valorTotal: Number(venda.valorTotal),
    entrada: Number(venda.entrada),
    dataContrato: venda.dataContrato?.toISOString() ?? null,
    parcelas: venda.parcelas.map((p: typeof venda.parcelas[0]) => ({
      ...p,
      valor: Number(p.valor),
      vencimento: p.vencimento?.toISOString() ?? null,
      pagoEm: p.pagoEm?.toISOString() ?? null,
    })),
  };

  return <VendaDetail venda={serialized as any} />;
}
