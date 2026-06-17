import { prisma } from "@/lib/prisma";
import { CobrancasView } from "./cobrancas-view";

export default async function CobrancasPage({
  searchParams,
}: {
  searchParams: Promise<{ comp?: string }>;
}) {
  const { comp } = await searchParams;
  const agora = new Date();
  const competencia = comp ?? `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;

  const [faturas, empresas] = await Promise.all([
    prisma.fatura.findMany({
      where: { competencia },
      orderBy: { vencimento: "asc" },
    }),
    prisma.empresa.findMany({ select: { id: true, nome: true } }),
  ]);

  // Totais do mês filtrado
  const recebido = faturas.filter(f => f.status === "paga").reduce((s, f) => s + Number(f.valor), 0);
  const aReceber = faturas.filter(f => f.status === "pendente").reduce((s, f) => s + Number(f.valor), 0);
  const emAtraso = faturas.filter(f => f.status === "atrasada").reduce((s, f) => s + Number(f.valor), 0);

  const empresasById = Object.fromEntries(empresas.map(e => [e.id, e.nome]));

  const serialized = faturas.map(f => ({
    id: f.id,
    empresaId: f.empresaId,
    empresaNome: empresasById[f.empresaId] ?? "—",
    competencia: f.competencia,
    valor: Number(f.valor),
    vencimento: f.vencimento.toISOString(),
    status: f.status,
    pagaEm: f.pagaEm?.toISOString() ?? null,
  }));

  return (
    <CobrancasView
      faturas={serialized}
      competencia={competencia}
      totais={{ recebido, aReceber, emAtraso }}
    />
  );
}
