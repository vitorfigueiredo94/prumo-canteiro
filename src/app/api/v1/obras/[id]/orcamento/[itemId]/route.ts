import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { itemId } = await params;

  const body = await req.json();
  const item = await prisma.orcamentoItem.update({
    where: { id: itemId, empresaId: session.empresaId },
    data: {
      ...(body.descricao !== undefined && { descricao: body.descricao }),
      ...(body.categoria !== undefined && { categoria: body.categoria }),
      ...(body.unidade !== undefined && { unidade: body.unidade }),
      ...(body.quantidade !== undefined && { quantidade: body.quantidade }),
      ...(body.valorUnit !== undefined && { valorUnit: body.valorUnit }),
      ...(body.ordem !== undefined && { ordem: body.ordem }),
    },
  });

  return NextResponse.json({
    item: { ...item, quantidade: Number(item.quantidade), valorUnit: Number(item.valorUnit) },
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { itemId } = await params;

  await prisma.orcamentoItem.deleteMany({
    where: { id: itemId, empresaId: session.empresaId },
  });

  return NextResponse.json({ ok: true });
}
