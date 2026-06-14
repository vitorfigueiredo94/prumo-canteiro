import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TerrenoDetail } from "./terreno-detail";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const terreno = await prisma.terreno.findUnique({ where: { id }, select: { nome: true } });
  return { title: terreno?.nome ?? "Terreno" };
}

export default async function TerrenoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await getSession();
  if (!session) redirect("/login");

  const terreno = await prisma.terreno.findFirst({
    where: { id, empresaId: session.empresaId },
    include: {
      obras: {
        select: { id: true, nome: true, status: true, orcamento: true, progresso: true, inicio: true, prazo: true },
        orderBy: { criadoEm: "desc" },
      },
      vendas: {
        select: { id: true, nomeComprador: true, valorTotal: true, dataContrato: true },
      },
      documentos: { orderBy: { criadoEm: "desc" } },
    },
  });

  if (!terreno) notFound();

  const serialized = {
    ...terreno,
    area: Number(terreno.area),
    valorCompra: terreno.valorCompra ? Number(terreno.valorCompra) : null,
    aquisicao: terreno.aquisicao?.toISOString() ?? null,
    obras: terreno.obras.map((o: typeof terreno.obras[0]) => ({
      ...o,
      orcamento: Number(o.orcamento),
      inicio: o.inicio?.toISOString() ?? null,
      prazo: o.prazo?.toISOString() ?? null,
    })),
    vendas: terreno.vendas.map((v: typeof terreno.vendas[0]) => ({
      id: v.id,
      comprador: v.nomeComprador,
      valorTotal: Number(v.valorTotal),
      dataVenda: v.dataContrato?.toISOString() ?? null,
    })),
  };

  return <TerrenoDetail terreno={serialized as any} />;
}
