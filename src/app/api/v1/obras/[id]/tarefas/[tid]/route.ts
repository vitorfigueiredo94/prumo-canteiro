import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Atualiza uma tarefa (usado no drag: status/ordem; e edição de campos)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; tid: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: obraId, tid } = await params;

  const tarefa = await prisma.tarefaObra.findFirst({
    where: { id: tid, obraId, empresaId: session.empresaId },
    select: { id: true },
  });
  if (!tarefa) return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof body.status === "string" && ["a_fazer", "em_execucao", "concluido"].includes(body.status)) data.status = body.status;
  if (typeof body.ordem === "number") data.ordem = body.ordem;
  if (typeof body.titulo === "string" && body.titulo.trim()) data.titulo = body.titulo.trim();
  if ("categoria" in body) data.categoria = body.categoria ? String(body.categoria).trim() : null;
  if ("responsavel" in body) data.responsavel = body.responsavel ? String(body.responsavel).trim() : null;
  if ("custo" in body) {
    const c = body.custo != null && body.custo !== "" ? Number(body.custo) : null;
    data.custo = c != null && !Number.isNaN(c) ? c : null;
  }
  if ("prazo" in body) {
    if (body.prazo) {
      const p = new Date(`${String(body.prazo).slice(0, 10)}T12:00:00`);
      data.prazo = !Number.isNaN(p.getTime()) ? p : null;
    } else {
      data.prazo = null;
    }
  }

  const atual = await prisma.tarefaObra.update({ where: { id: tid }, data });
  return NextResponse.json({ tarefa: { ...atual, custo: atual.custo != null ? Number(atual.custo) : null } });
}

// Remove uma tarefa
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; tid: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: obraId, tid } = await params;

  const r = await prisma.tarefaObra.deleteMany({ where: { id: tid, obraId, empresaId: session.empresaId } });
  return NextResponse.json({ ok: r.count > 0 });
}
