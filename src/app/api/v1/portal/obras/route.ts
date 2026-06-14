import { NextRequest, NextResponse } from "next/server";
import { verifyPortalToken } from "@/lib/portal-auth";
import { listarObrasPortal } from "@/features/portal-cliente/service";

export async function GET(req: NextRequest) {
  const session = await verifyPortalToken(req);
  if (!session) return NextResponse.json({ error: "Token inválido ou expirado" }, { status: 401 });

  const obras = await listarObrasPortal(session.empresaId);
  return NextResponse.json({ obras });
}
