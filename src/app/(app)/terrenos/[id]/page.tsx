import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { TerrenoDetail } from "./terreno-detail";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const terreno = await prisma.terreno.findUnique({ where: { id }, select: { nome: true } });
  return { title: terreno?.nome ?? "Terreno" };
}

export default async function TerrenoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const usuario = await prisma.usuario.findUnique({
    where: { id: user.id },
    select: { empresaId: true },
  });
  if (!usuario) redirect("/login");

  const terreno = await prisma.terreno.findFirst({
    where: { id, empresaId: usuario.empresaId },
    include: {
      obras: {
        select: {
          id: true,
          nome: true,
          status: true,
          orcamento: true,
          progresso: true,
          inicio: true,
          prazo: true,
        },
        orderBy: { criadoEm: "desc" },
      },
      vendas: {
        select: {
          id: true,
          comprador: true,
          valorTotal: true,
          dataVenda: true,
        },
      },
      documentos: {
        orderBy: { criadoEm: "desc" },
      },
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
      ...v,
      valorTotal: Number(v.valorTotal),
      dataVenda: v.dataVenda.toISOString(),
    })),
  };

  return <TerrenoDetail terreno={serialized as any} />;
}
