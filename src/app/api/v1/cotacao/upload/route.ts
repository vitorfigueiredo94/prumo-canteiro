import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { extrairInsumosDosPdf, salvarPdfCotacao, criarCotacao } from "@/features/cotacao-inteligente/service";
import { SsrfBlockedError } from "@/lib/ssrf-guard";
import { assertFileType, FileTypeError } from "@/lib/file-guard";

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
    await assertFileType(file, ["pdf"]);

    const [pdfUrl, insumos] = await Promise.all([
      salvarPdfCotacao(file),
      extrairInsumosDosPdf(file),
    ]);

    const cotacao = await criarCotacao(session.empresaId, nome, insumos, pdfUrl, obraId, webhookUrl);
    return NextResponse.json({ ...cotacao, insumos }, { status: 201 });
  } catch (e) {
    if (e instanceof FileTypeError) return NextResponse.json({ error: e.message }, { status: 415 });
    if (e instanceof SsrfBlockedError) return NextResponse.json({ error: e.message }, { status: 422 });
    return NextResponse.json({ error: String(e) }, { status: 422 });
  }
}
