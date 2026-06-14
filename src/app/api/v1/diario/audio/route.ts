import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { transcreverAudio } from "@/features/diario-audio/service";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("audio") as File | null;
    const obraId = formData.get("obraId") as string | null;

    if (!file) return NextResponse.json({ error: "Campo 'audio' obrigatório" }, { status: 400 });
    if (!obraId) return NextResponse.json({ error: "Campo 'obraId' obrigatório" }, { status: 400 });

    const resultado = await transcreverAudio(session.empresaId, obraId, file);
    return NextResponse.json(resultado, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 422 });
  }
}
