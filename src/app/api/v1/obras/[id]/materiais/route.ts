import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const MaterialSchema = z.object({
  nome:       z.string().min(1, "Nome obrigatório"),
  quantidade: z.coerce.number().positive("Quantidade deve ser positiva"),
  unidade:    z.string().min(1).default("un"),
  valorUnit:  z.coerce.number().min(0, "Valor não pode ser negativo"),
  fornecedor: z.string().optional(),
  data:       z.string().optional(),
  obs:        z.string().optional(),
});

function serial(m: any) {
  return {
    ...m,
    quantidade: Number(m.quantidade),
    valorUnit:  Number(m.valorUnit),
    data:       m.data?.toISOString() ?? null,
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: obraId } = await params;

  const obra = await prisma.obra.findFirst({ where: { id: obraId, empresaId: session.empresaId }, select: { id: true } });
  if (!obra) return NextResponse.json({ error: "Não encontrada" }, { status: 404 });

  const materiais = await prisma.materialObra.findMany({
    where: { obraId, empresaId: session.empresaId },
    orderBy: { criadoEm: "desc" },
  });

  return NextResponse.json({ materiais: materiais.map(serial) });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: obraId } = await params;

  const obra = await prisma.obra.findFirst({ where: { id: obraId, empresaId: session.empresaId }, select: { id: true } });
  if (!obra) return NextResponse.json({ error: "Não encontrada" }, { status: 404 });

  const body = await req.json();
  const parsed = MaterialSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const { nome, quantidade, unidade, valorUnit, fornecedor, data, obs } = parsed.data;

  const material = await prisma.materialObra.create({
    data: {
      obraId,
      empresaId: session.empresaId,
      nome,
      quantidade,
      unidade,
      valorUnit,
      fornecedor: fornecedor || null,
      data:       data ? new Date(data) : null,
      obs:        obs || null,
    },
  });

  return NextResponse.json(serial(material), { status: 201 });
}
