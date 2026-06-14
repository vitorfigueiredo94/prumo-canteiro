import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { criarPortalToken, listarTokens, revogarToken } from "@/lib/portal-auth";
import { z } from "zod";

const CriarSchema = z.object({
  nome: z.string().min(1, "Nome obrigatório"),
  expiraEm: z.string().datetime().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  return NextResponse.json(await listarTokens(session.empresaId));
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = CriarSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const resultado = await criarPortalToken(
    session.empresaId,
    parsed.data.nome,
    parsed.data.expiraEm ? new Date(parsed.data.expiraEm) : undefined
  );

  return NextResponse.json(resultado, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await req.json().catch(() => ({ id: "" }));
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

  await revogarToken(session.empresaId, id);
  return new NextResponse(null, { status: 204 });
}
