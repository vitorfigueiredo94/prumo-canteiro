import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Progresso por fase calculado a partir das tarefas do Quadro.
// Mesma forma que o cronograma esperava do checklist ({ fase, total, concluidos, porcentagem }),
// para o Gantt passar a usar o Quadro como fonte.
const REV: Record<string, string> = { inicio: "OBRA_INICIO", execucao: "OBRA_MEIO", entrega: "OBRA_FIM" };

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: obraId } = await params;

  const obra = await prisma.obra.findFirst({ where: { id: obraId, empresaId: session.empresaId }, select: { id: true } });
  if (!obra) return NextResponse.json({ error: "Obra não encontrada" }, { status: 404 });

  const tarefas = await prisma.tarefaObra.findMany({
    where: { obraId, empresaId: session.empresaId },
    select: { fase: true, status: true },
  });

  const checklists = ["inicio", "execucao", "entrega"].map((fk) => {
    const itens = tarefas.filter((t) => t.fase === fk);
    const total = itens.length;
    const concluidos = itens.filter((t) => t.status === "concluido").length;
    return { fase: REV[fk], total, concluidos, porcentagem: total === 0 ? 0 : Math.round((concluidos / total) * 100) };
  });

  return NextResponse.json({ checklists });
}
