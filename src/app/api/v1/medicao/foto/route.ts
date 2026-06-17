import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { salvarMedicaoFoto, listarMedicoes } from "@/features/medicao-foto/service";
import { assertFileType, FileTypeError } from "@/lib/file-guard";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const obraId = req.nextUrl.searchParams.get("obraId");
  if (!obraId) return NextResponse.json({ error: "obraId obrigatório" }, { status: 400 });

  return NextResponse.json(await listarMedicoes(session.empresaId, obraId));
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("foto") as File | null;
    const obraId = formData.get("obraId") as string | null;
    const etapa = (formData.get("etapa") as string | null) ?? undefined;
    const metaRaw = (formData.get("metadata") as string | null) ?? "{}";

    if (!file) return NextResponse.json({ error: "Campo 'foto' obrigatório" }, { status: 400 });
    if (!obraId) return NextResponse.json({ error: "Campo 'obraId' obrigatório" }, { status: 400 });

    await assertFileType(file, ["image"]);

    let metadata: Record<string, unknown> = {};
    try { metadata = JSON.parse(metaRaw); } catch { /* ignora JSON inválido */ }

    const medicao = await salvarMedicaoFoto({ empresaId: session.empresaId, obraId, etapa, metadata, file });
    return NextResponse.json(medicao, { status: 201 });
  } catch (e) {
    if (e instanceof FileTypeError) return NextResponse.json({ error: e.message }, { status: 415 });
    return NextResponse.json({ error: String(e) }, { status: 422 });
  }
}
