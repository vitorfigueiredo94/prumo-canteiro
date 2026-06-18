import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSugestaoFase, avancarFase } from "@/features/checklist/service";
import { prisma } from "@/lib/prisma";
import { parseRole, checkPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit-log";
import { notificarCliente, msgFaseObra } from "@/lib/notificar-admin";

const FASE_LABELS: Record<string, string> = {
  OBRA_INICIO: "Início da obra",
  OBRA_MEIO: "Execução da obra",
  OBRA_FIM: "Entrega da obra",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const sugestao = await getSugestaoFase("obra", id, session.empresaId);
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

  if (!checkPermission(role, "obra_checklist", "write")) {
    logAudit({ empresaId: session.empresaId, userId: session.userId }, "write", "obra_checklist", id, "denied");
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }
  logAudit({ empresaId: session.empresaId, userId: session.userId }, "write", "obra_checklist", id, "allowed");

  try {
    const novo = await avancarFase("obra", id, session.empresaId);

    // Notificar comprador via WhatsApp (fire-and-forget)
    void (async () => {
      try {
        const obra = await prisma.obra.findFirst({
          where: { id, empresaId: session.empresaId },
          select: { nome: true, terrenoId: true, empresa: { select: { nome: true } } },
        });
        if (!obra?.terrenoId) return;
        const venda = await prisma.venda.findFirst({
          where: { terrenoId: obra.terrenoId, empresaId: session.empresaId },
          select: { nomeComprador: true, telefoneComprador: true },
          orderBy: { criadoEm: "desc" },
        });
        if (!venda?.telefoneComprador) return;
        const faseLabel = FASE_LABELS[novo.fase] ?? novo.fase;
        const msg = msgFaseObra(obra.nome, venda.nomeComprador, faseLabel, obra.empresa.nome);
        await notificarCliente(venda.telefoneComprador, msg);
      } catch { /* silencioso — notificação é best-effort */ }
    })();

    return NextResponse.json(novo, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 422 });
  }
}
