import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { DiarioView } from "./diario-view";

export const metadata: Metadata = { title: "Diário de Obra" };

export default async function DiarioPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const usuario = await prisma.usuario.findUnique({
    where: { id: user.id },
    select: { empresaId: true },
  });
  if (!usuario) redirect("/login");

  const [entradas, obras] = await Promise.all([
    prisma.diarioObra.findMany({
      where: { obra: { empresaId: usuario.empresaId } },
      include: { obra: { select: { id: true, nome: true } } },
      orderBy: { data: "desc" },
      take: 100,
    }),
    prisma.obra.findMany({
      where: { empresaId: usuario.empresaId },
      select: { id: true, nome: true },
      orderBy: { nome: "asc" },
    }),
  ]);

  const serialized = entradas.map((e: typeof entradas[0]) => ({
    ...e,
    data: e.data?.toISOString() ?? null,
  }));

  return <DiarioView entradas={serialized as any} obras={obras} />;
}
