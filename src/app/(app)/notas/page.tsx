import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NotasView } from "./notas-view";

export const metadata: Metadata = { title: "Notas Fiscais" };

export default async function NotasPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const eid = session.empresaId;

  const [notas, obras] = await Promise.all([
    prisma.notaFiscal.findMany({
      where: { empresaId: eid },
      include: { obra: { select: { id: true, nome: true } } },
      orderBy: { emitidaEm: "desc" },
    }),
    prisma.obra.findMany({
      where: { empresaId: eid },
      select: { id: true, nome: true },
      orderBy: { nome: "asc" },
    }),
  ]);

  const serialized = notas.map((n: typeof notas[0]) => ({
    ...n,
    valor: Number(n.valor),
    emitidaEm: n.emitidaEm?.toISOString() ?? null,
  }));

  return <NotasView notas={serialized as any} obras={obras} />;
}
