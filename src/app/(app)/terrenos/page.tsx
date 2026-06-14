import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TerrenosView } from "./terrenos-view";

export const metadata: Metadata = { title: "Terrenos" };

export default async function TerrenosPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const terrenos = await prisma.terreno.findMany({
    where: { empresaId: session.empresaId },
    include: {
      obras: {
        select: { id: true, nome: true, status: true },
        orderBy: { criadoEm: "desc" },
      },
    },
    orderBy: { criadoEm: "desc" },
  });

  const serialized = terrenos.map((t: typeof terrenos[0]) => ({
    ...t,
    area: Number(t.area),
    valorCompra: t.valorCompra ? Number(t.valorCompra) : null,
    aquisicao: t.aquisicao ? t.aquisicao.toISOString() : null,
  }));

  return <TerrenosView terrenos={serialized as any} />;
}
