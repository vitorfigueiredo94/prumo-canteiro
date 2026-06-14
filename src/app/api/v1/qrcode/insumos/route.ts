import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { criarQrCode, listarQrCodes } from "@/features/qrcode-insumos/service";
import { z } from "zod";

const CriarSchema = z.object({
  nome: z.string().min(1, "Nome obrigatório"),
  tipo: z.enum(["insumo", "equipamento"]).optional(),
  descricao: z.string().optional(),
  obraId: z.string().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const qrcodes = await listarQrCodes(session.empresaId);
  return NextResponse.json(qrcodes);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = CriarSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const qr = await criarQrCode({ empresaId: session.empresaId, ...parsed.data });
  return NextResponse.json(qr, { status: 201 });
}
