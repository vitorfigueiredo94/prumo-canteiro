import { prisma } from "@/lib/prisma";
import { ClientesView } from "./clientes-view";

export default async function ClientesPage() {
  const [empresas, planos] = await Promise.all([
    prisma.empresa.findMany({
      include: {
        assinatura: { include: { plano: true } },
        _count: { select: { usuarios: true, obras: true } },
      },
      orderBy: { criadoEm: "desc" },
    }),
    prisma.plano.findMany({ orderBy: { preco: "asc" } }),
  ]);

  const serialized = empresas.map(e => ({
    id: e.id,
    nome: e.nome,
    criadoEm: e.criadoEm.toISOString(),
    planoId: e.assinatura?.planoId ?? null,
    planoNome: e.assinatura?.plano?.nome ?? "—",
    preco: Number(e.assinatura?.plano?.preco ?? 0),
    status: e.assinatura?.status ?? "sem_assinatura",
    proximaCobranca: e.assinatura?.proximaCobranca?.toISOString() ?? null,
    usuarios: e._count.usuarios,
    obras: e._count.obras,
  }));

  const planosSerial = planos.map(p => ({
    id: p.id,
    nome: p.nome,
    preco: Number(p.preco),
  }));

  return <ClientesView empresas={serialized} planos={planosSerial} />;
}
