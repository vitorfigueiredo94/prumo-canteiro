import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sid: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { sid } = await params;

  const body = await req.json();
  const s = await prisma.bolServico.update({
    where: { id: sid, empresaId: session.empresaId },
    data: {
      ...(body.descricao !== undefined && { descricao: body.descricao }),
      ...(body.unidade !== undefined && { unidade: body.unidade }),
      ...(body.qtdeContratada !== undefined && { qtdeContratada: body.qtdeContratada }),
      ...(body.valorUnit !== undefined && { valorUnit: body.valorUnit }),
    },
  });
  return NextResponse.json({ servico: { ...s, qtdeContratada: Number(s.qtdeContratada), valorUnit: Number(s.valorUnit) } });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; sid: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { sid } = await params;

  await prisma.bolServico.deleteMany({ where: { id: sid, empresaId: session.empresaId } });
  return NextResponse.json({ ok: true });
}
