import { NextRequest, NextResponse } from "next/server";
import { verifyPortalToken } from "@/lib/portal-auth";
import { detalheObraPortal } from "@/features/portal-cliente/service";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifyPortalToken(req);
  if (!session) return NextResponse.json({ error: "Token inválido ou expirado" }, { status: 401 });

  const { id } = await params;
  const obra = await detalheObraPortal(session.empresaId, id);
  if (!obra) return NextResponse.json({ error: "Obra não encontrada" }, { status: 404 });
  return NextResponse.json(obra);
}
