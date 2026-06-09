import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NotasView } from "./notas-view";

export const metadata: Metadata = { title: "Notas Fiscais" };

export default async function NotasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const usuario = await prisma.usuario.findUnique({
    where: { id: user.id },
    select: { empresaId: true },
  });
  if (!usuario) redirect("/login");

  const [notas, obras] = await Promise.all([
    prisma.notaFiscal.findMany({
      where: { empresaId: usuario.empresaId },
      include: { obra: { select: { id: true, nome: true } } },
      orderBy: { emitidaEm: "desc" },
    }),
    prisma.obra.findMany({
      where: { empresaId: usuario.empresaId },
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
