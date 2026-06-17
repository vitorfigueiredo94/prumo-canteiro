import { prisma } from "@/lib/prisma";
import { PlanosView } from "./planos-view";

export default async function PlanosPage() {
  const planos = await prisma.plano.findMany({
    include: {
      _count: { select: { assinaturas: true } },
      assinaturas: {
        include: { empresa: { select: { id: true } } },
      },
    },
    orderBy: { preco: "asc" },
  });

  const serialized = planos.map(p => ({
    id: p.id,
    nome: p.nome,
    preco: Number(p.preco),
    limiteObras: p.limiteObras,
    limiteUsuarios: p.limiteUsuarios,
    destaque: p.destaque,
    recursos: JSON.parse(p.recursos ?? "[]") as string[],
    assinantes: p._count.assinaturas,
    receitaMensal: p._count.assinaturas * Number(p.preco),
    criadoEm: p.criadoEm.toISOString(),
  }));

  return <PlanosView planos={serialized} />;
}
