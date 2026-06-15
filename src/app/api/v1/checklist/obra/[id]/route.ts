import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getChecklistComProgresso } from "@/features/checklist/service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const checklists = await getChecklistComProgresso("obra", id, session.empresaId);
  return NextResponse.json({ checklists });
}
