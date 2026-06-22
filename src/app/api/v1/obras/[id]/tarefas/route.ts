import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recomputeProgresso } from "@/lib/obra-progresso";

const FASES = ["inicio", "execucao", "entrega"];

// Lista as tarefas (cards do Kanban) de uma obra
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: obraId } = await params;

  const obra = await prisma.obra.findFirst({ where: { id: obraId, empresaId: session.empresaId }, select: { id: true } });
  if (!obra) return NextResponse.json({ error: "Obra não encontrada" }, { status: 404 });

  const tarefas = await prisma.tarefaObra.findMany({
    where: { obraId, empresaId: session.empresaId },
    orderBy: [{ status: "asc" }, { ordem: "asc" }, { criadoEm: "asc" }],
  });

  return NextResponse.json({
    tarefas: tarefas.map((t) => ({ ...t, custo: t.custo != null ? Number(t.custo) : null })),
  });
}

// Cria uma nova tarefa
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: obraId } = await params;

  const obra = await prisma.obra.findFirst({ where: { id: obraId, empresaId: session.empresaId }, select: { id: true } });
  if (!obra) return NextResponse.json({ error: "Obra não encontrada" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const titulo = String(body.titulo ?? "").trim();
  if (!titulo) return NextResponse.json({ error: "Título é obrigatório" }, { status: 400 });

  const status = ["a_fazer", "em_execucao", "concluido"].includes(body.status) ? body.status : "a_fazer";
  const custo = body.custo != null && body.custo !== "" ? Number(body.custo) : null;

  const prazo = body.prazo ? new Date(`${String(body.prazo).slice(0, 10)}T12:00:00`) : null;
  const fase = FASES.includes(body.fase) ? body.fase : null;

  const tarefa = await prisma.tarefaObra.create({
    data: {
      empresaId: session.empresaId,
      obraId,
      titulo,
      categoria: body.categoria ? String(body.categoria).trim() : null,
      responsavel: body.responsavel ? String(body.responsavel).trim() : null,
      custo: custo != null && !Number.isNaN(custo) ? custo : null,
      prazo: prazo && !Number.isNaN(prazo.getTime()) ? prazo : null,
      fase,
      status,
      ordem: typeof body.ordem === "number" ? body.ordem : 0,
    },
  });

  await recomputeProgresso(obraId);
  return NextResponse.json({ tarefa: { ...tarefa, custo: tarefa.custo != null ? Number(tarefa.custo) : null } });
}
