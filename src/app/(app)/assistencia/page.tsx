import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AssistenciaView } from "./assistencia-view";

export const metadata: Metadata = { title: "Assistência Técnica" };

export default async function AssistenciaPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const eid = session.empresaId;

  const [chamadosRaw, componentes, vendas] = await Promise.all([
    prisma.chamadoAssistencia.findMany({
      where: { empresaId: eid },
      orderBy: { criadoEm: "desc" },
    }),
    prisma.garantiaComponente.findMany({
      where: { empresaId: eid, ativo: true },
      orderBy: { nome: "asc" },
    }),
    prisma.venda.findMany({
      where: { empresaId: eid },
      select: { id: true, nomeComprador: true, dataContrato: true },
      orderBy: { nomeComprador: "asc" },
    }),
  ]);

  type VendaRow = typeof vendas[0];
  type CompRow  = typeof componentes[0];
  type ChamRow  = typeof chamadosRaw[0];

  const vendaMap = Object.fromEntries(vendas.map((v: VendaRow) => [v.id, v.nomeComprador]));
  const compMap  = Object.fromEntries(componentes.map((c: CompRow) => [c.id, c.nome]));

  const chamados = chamadosRaw.map((c: ChamRow) => ({
    id:                c.id,
    vendaId:           c.vendaId,
    componenteId:      c.componenteId,
    descricao:         c.descricao,
    status:            c.status,
    parecerStatus:     c.parecerStatus,
    parecerTexto:      c.parecerTexto,
    parecerGeradoEm:   c.parecerGeradoEm?.toISOString() ?? null,
    dataEntregaChaves: c.dataEntregaChaves?.toISOString() ?? null,
    criadoEm:          c.criadoEm.toISOString(),
    nomeComprador:     vendaMap[c.vendaId] ?? "—",
    nomeComponente:    compMap[c.componenteId] ?? "—",
  }));

  return (
    <AssistenciaView
      chamados={chamados}
      componentes={componentes.map((c: CompRow) => ({
        id: c.id, codigo: c.codigo, nome: c.nome,
        prazoLegalMeses: c.prazoLegalMeses, prazoContratMeses: c.prazoContratMeses,
        baseLegal: c.baseLegal,
      }))}
      vendas={vendas.map((v: VendaRow) => ({ id: v.id, nomeComprador: v.nomeComprador }))}
    />
  );
}
