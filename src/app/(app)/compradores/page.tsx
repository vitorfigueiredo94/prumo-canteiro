import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlanoEmpresa, temRecurso, RECURSO } from "@/lib/plano";
import { PlanoGate } from "@/components/layout/plano-gate";
import { CompradoresView } from "./compradores-view";

export const metadata: Metadata = { title: "Compradores" };

export default async function CompradoresPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const eid = session.empresaId;
  const plano = await getPlanoEmpresa(eid);
  if (!temRecurso(plano, RECURSO.VENDAS)) {
    return <PlanoGate recurso="vendas" planoNecessario="Profissional" planoAtual={plano.planoNome} />;
  }

  const [vendasRaw, terrenosRaw] = await Promise.all([
    prisma.venda.findMany({
      where: { empresaId: eid },
      select: {
        id: true,
        nomeComprador: true,
        cpfCnpjComprador: true,
        telefoneComprador: true,
        emailComprador: true,
        valorTotal: true,
        dataContrato: true,
        terreno: { select: { id: true, nome: true, cidade: true } },
        parcelas: {
          select: { status: true, vencimento: true, pagoEm: true, valor: true },
        },
      },
      orderBy: { criadoEm: "desc" },
    }),
    prisma.terreno.findMany({
      where: { empresaId: eid, vendas: { none: {} } },
      select: { id: true, nome: true, cidade: true },
      orderBy: { nome: "asc" },
    }),
  ]);

  const compradores = vendasRaw.map((v) => ({
    id: v.id,
    nomeComprador: v.nomeComprador,
    cpfCnpjComprador: v.cpfCnpjComprador ?? null,
    telefoneComprador: v.telefoneComprador ?? null,
    emailComprador: v.emailComprador ?? null,
    valorTotal: Number(v.valorTotal),
    dataContrato: v.dataContrato?.toISOString() ?? null,
    terreno: v.terreno,
    parcelas: v.parcelas.map((p) => ({
      status: p.status,
      vencimento: p.vencimento?.toISOString() ?? null,
      pagoEm: p.pagoEm?.toISOString() ?? null,
      valor: Number(p.valor),
    })),
  }));

  const terrenos = terrenosRaw.map((t) => ({ id: t.id, nome: t.nome, cidade: t.cidade }));

  return <CompradoresView compradores={compradores} terrenos={terrenos} />;
}
