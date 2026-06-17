import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DiarioView } from "./diario-view";
import { getPlanoEmpresa, temRecurso, RECURSO } from "@/lib/plano";
import { PlanoGate } from "@/components/layout/plano-gate";

export const metadata: Metadata = { title: "Diário de Obra" };

export default async function DiarioPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const eid = session.empresaId;
  const plano = await getPlanoEmpresa(eid);
  if (!temRecurso(plano, RECURSO.DIARIO)) {
    return <PlanoGate recurso="diario" planoNecessario="Profissional" planoAtual={plano.planoNome} />;
  }

  const [entradas, obras] = await Promise.all([
    prisma.diarioObra.findMany({
      where: { empresaId: eid },
      include: { obra: { select: { id: true, nome: true } } },
      orderBy: { data: "desc" },
      take: 100,
    }),
    prisma.obra.findMany({
      where: { empresaId: eid },
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
