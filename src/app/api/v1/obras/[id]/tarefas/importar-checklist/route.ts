import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recomputeProgresso } from "@/lib/obra-progresso";

// Mapeia as fases do checklist de obra para as fases do Quadro
const FASE_MAP: Record<string, string> = {
  OBRA_INICIO: "inicio",
  OBRA_MEIO: "execucao",
  OBRA_FIM: "entrega",
};

// Importa os itens do checklist da obra como cards do Quadro (uma vez).
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: obraId } = await params;

  const obra = await prisma.obra.findFirst({ where: { id: obraId, empresaId: session.empresaId }, select: { id: true } });
  if (!obra) return NextResponse.json({ error: "Obra não encontrada" }, { status: 404 });

  const checklists = await prisma.checklist.findMany({
    where: { obraId, empresaId: session.empresaId, ownerType: "obra" },
    include: { itens: { orderBy: { criadoEm: "asc" } } },
    orderBy: { criadoEm: "asc" },
  });

  const data: { empresaId: string; obraId: string; titulo: string; status: string; fase: string | null; ordem: number }[] = [];
  let ordem = 0;
  for (const cl of checklists) {
    const fase = FASE_MAP[cl.fase] ?? null;
    for (const it of cl.itens) {
      data.push({
        empresaId: session.empresaId,
        obraId,
        titulo: it.descricao,
        status: it.concluido ? "concluido" : "a_fazer",
        fase,
        ordem: ordem++,
      });
    }
  }

  if (data.length > 0) {
    await prisma.tarefaObra.createMany({ data });
    await recomputeProgresso(obraId);
  }

  return NextResponse.json({ importadas: data.length });
}
