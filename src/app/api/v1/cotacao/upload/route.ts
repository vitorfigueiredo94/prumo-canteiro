import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { extrairInsumosDosPdf, salvarPdfCotacao, criarCotacao } from "@/features/cotacao-inteligente/service";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("pdf") as File | null;
    const nome = (formData.get("nome") as string | null) ?? "Cotação sem título";
    const obraId = (formData.get("obraId") as string | null) ?? undefined;
    const webhookUrl = (formData.get("webhookUrl") as string | null) ?? undefined;

    if (!file) return NextResponse.json({ error: "Campo 'pdf' obrigatório" }, { status: 400 });
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Arquivo deve ser PDF" }, { status: 400 });
    }

    const [pdfUrl, insumos] = await Promise.all([
      salvarPdfCotacao(file),
      extrairInsumosDosPdf(file),
    ]);

    const cotacao = await criarCotacao(session.empresaId, nome, insumos, pdfUrl, obraId, webhookUrl);
    return NextResponse.json({ ...cotacao, insumos }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 422 });
  }
}
