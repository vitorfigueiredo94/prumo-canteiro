import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await params;

  const itens = await prisma.orcamentoItem.findMany({
    where: { obraId: id, empresaId: session.empresaId },
    orderBy: [{ categoria: "asc" }, { ordem: "asc" }, { criadoEm: "asc" }],
  });

  return NextResponse.json({
    itens: itens.map((i) => ({
      ...i,
      quantidade: Number(i.quantidade),
      valorUnit: Number(i.valorUnit),
    })),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await params;

  const body = await req.json();
  const item = await prisma.orcamentoItem.create({
    data: {
      empresaId: session.empresaId,
      obraId: id,
      categoria: body.categoria ?? "outros",
      descricao: body.descricao,
      unidade: body.unidade ?? "un",
      quantidade: body.quantidade ?? 1,
      valorUnit: body.valorUnit ?? 0,
      ordem: body.ordem ?? 0,
    },
  });

  return NextResponse.json({
    item: { ...item, quantidade: Number(item.quantidade), valorUnit: Number(item.valorUnit) },
  });
}
