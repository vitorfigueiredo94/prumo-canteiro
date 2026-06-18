import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { toggleItem } from "@/features/checklist/service";
import { prisma } from "@/lib/prisma";
import { parseRole, checkPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit-log";
import { z } from "zod";

const PatchSchema = z.object({
  concluido: z.boolean().optional(),
  observacao: z.string().optional(),
  descricao: z.string().min(1).max(200).optional(),
}).refine((d) => d.concluido !== undefined || d.descricao !== undefined, {
  message: "Informe concluido ou descricao",
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;

  const [usuarioRow, itemCheck] = await Promise.all([
    prisma.usuario.findUnique({ where: { id: session.userId }, select: { cargo: true } }),
    prisma.checklistItem.findUnique({
      where: { id },
      select: { checklist: { select: { ownerType: true, empresaId: true } } },
    }),
  ]);

  if (!itemCheck || itemCheck.checklist.empresaId !== session.empresaId) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  const role = parseRole(usuarioRow?.cargo);
  const resource = itemCheck.checklist.ownerType === "obra" ? "obra_checklist" as const : "terreno_checklist" as const;

  if (!checkPermission(role, resource, "write")) {
    logAudit({ empresaId: session.empresaId, userId: session.userId }, "write", resource, id, "denied");
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }
  logAudit({ empresaId: session.empresaId, userId: session.userId }, "write", resource, id, "allowed");

  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  try {
    const { concluido, observacao, descricao } = parsed.data;

    if (descricao !== undefined) {
      await prisma.checklistItem.update({ where: { id }, data: { descricao } });
    }

    if (concluido !== undefined) {
      const item = await toggleItem(id, session.empresaId, concluido, observacao);
      return NextResponse.json(item);
    }

    const item = await prisma.checklistItem.findUnique({ where: { id } });
    return NextResponse.json(item);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 404 });
  }
}
