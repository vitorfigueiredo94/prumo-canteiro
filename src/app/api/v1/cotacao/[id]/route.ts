import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { buscarCotacao } from "@/features/cotacao-inteligente/service";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const cotacao = await buscarCotacao(session.empresaId, id);
  if (!cotacao) return NextResponse.json({ error: "Cotação não encontrada" }, { status: 404 });
  return NextResponse.json(cotacao);
}
