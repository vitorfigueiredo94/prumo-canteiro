import { prisma } from "@/lib/prisma";

// Recalcula a "execução física" da obra a partir das tarefas do Quadro (Kanban).
// Só sobrescreve o progresso quando há tarefas — não zera um valor definido manualmente.
export async function recomputeProgresso(obraId: string): Promise<void> {
  const all = await prisma.tarefaObra.findMany({ where: { obraId }, select: { status: true } });
  if (all.length === 0) return;
  const done = all.filter((t) => t.status === "concluido").length;
  const prog = Math.round((done / all.length) * 100);
  await prisma.obra.update({ where: { id: obraId }, data: { progresso: prog } });
}
