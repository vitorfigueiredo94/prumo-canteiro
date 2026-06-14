import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { gerarPredicao, ultimaPredicao } from "@/features/predicao-atrasos/service";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const predicao = await ultimaPredicao(session.empresaId, id);
  if (!predicao) return NextResponse.json({ error: "Nenhuma predição disponível para esta obra" }, { status: 404 });
  return NextResponse.json(predicao);
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const { id } = await params;
    const predicao = await gerarPredicao(session.empresaId, id);
    return NextResponse.json(predicao, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 422 });
  }
}
