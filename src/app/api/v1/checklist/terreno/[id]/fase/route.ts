import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSugestaoFase, avancarFase } from "@/features/checklist/service";
import { prisma } from "@/lib/prisma";
import { parseRole, checkPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit-log";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const sugestao = await getSugestaoFase("terreno", id, session.empresaId);
  if (!sugestao) return NextResponse.json({ error: "Nenhum checklist encontrado" }, { status: 404 });
  return NextResponse.json(sugestao);
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const usuarioRow = await prisma.usuario.findUnique({ where: { id: session.userId }, select: { cargo: true } });
  const role = parseRole(usuarioRow?.cargo);

  if (!checkPermission(role, "terreno_checklist", "write")) {
    logAudit({ empresaId: session.empresaId, userId: session.userId }, "write", "terreno_checklist", id, "denied");
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }
  logAudit({ empresaId: session.empresaId, userId: session.userId }, "write", "terreno_checklist", id, "allowed");

  try {
    const novo = await avancarFase("terreno", id, session.empresaId);
    return NextResponse.json(novo, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 422 });
  }
}
