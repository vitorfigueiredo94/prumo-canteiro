import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { toggleItem } from "@/features/checklist/service";
import { z } from "zod";

const PatchSchema = z.object({
  concluido: z.boolean(),
  observacao: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  try {
    const { id } = await params;
    const item = await toggleItem(
      id,
      session.empresaId,
      parsed.data.concluido,
      parsed.data.observacao
    );
    return NextResponse.json(item);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 404 });
  }
}
