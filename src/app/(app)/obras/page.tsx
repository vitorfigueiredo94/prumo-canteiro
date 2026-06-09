import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ObrasView } from "./obras-view";

export const metadata: Metadata = { title: "Obras" };

export default async function ObrasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const usuario = await prisma.usuario.findUnique({
    where: { id: user.id },
    select: { empresaId: true },
  });
  if (!usuario) redirect("/login");

  const [obras, terrenos] = await Promise.all([
    prisma.obra.findMany({
      where: { empresaId: usuario.empresaId },
      include: {
        terreno: { select: { id: true, nome: true, cidade: true } },
        notas: { select: { id: true, status: true, valor: true, categoria: true } },
        pagamentos: { select: { id: true, valor: true } },
      },
      orderBy: { criadoEm: "desc" },
    }),
    prisma.terreno.findMany({
      where: { empresaId: usuario.empresaId },
      select: { id: true, nome: true, cidade: true },
      orderBy: { nome: "asc" },
    }),
  ]);

  const serialized = obras.map((o: typeof obras[0]) => ({
    ...o,
    orcamento: Number(o.orcamento),
    inicio: o.inicio?.toISOString() ?? null,
    prazo: o.prazo?.toISOString() ?? null,
    notas: o.notas.map((n: typeof o.notas[0]) => ({ ...n, valor: Number(n.valor) })),
    pagamentos: o.pagamentos.map((p: typeof o.pagamentos[0]) => ({ ...p, valor: Number(p.valor) })),
  }));

  return <ObrasView obras={serialized as any} terrenos={terrenos} />;
}
