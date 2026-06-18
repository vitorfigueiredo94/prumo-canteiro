import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const FaseSchema = z.object({
  inicio: z.string().nullable().optional(),
  fim: z.string().nullable().optional(),
});

const CronogramaSchema = z.object({
  OBRA_INICIO: FaseSchema.optional(),
  OBRA_MEIO: FaseSchema.optional(),
  OBRA_FIM: FaseSchema.optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const obra = await prisma.obra.findFirst({
    where: { id, empresaId: session.empresaId },
    select: { cronogramaJson: true },
  });
  if (!obra) return NextResponse.json({ error: "Obra não encontrada" }, { status: 404 });

  const cronograma = obra.cronogramaJson ? JSON.parse(obra.cronogramaJson) : {};
  return NextResponse.json(cronograma);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = CronogramaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const updated = await prisma.obra.updateMany({
    where: { id, empresaId: session.empresaId },
    data: { cronogramaJson: JSON.stringify(parsed.data) },
  });
  if (!updated.count) return NextResponse.json({ error: "Obra não encontrada" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
