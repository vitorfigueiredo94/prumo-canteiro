import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { parseNFeXml } from "@/features/financeiro-xml/service";
import { assertFileType, FileTypeError } from "@/lib/file-guard";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("xml") as File | null;

    if (!file) return NextResponse.json({ error: "Campo 'xml' obrigatório" }, { status: 400 });
    await assertFileType(file, ["xml"]);

    const xml = await file.text();
    const resultado = parseNFeXml(xml);
    return NextResponse.json(resultado);
  } catch (e) {
    if (e instanceof FileTypeError) return NextResponse.json({ error: e.message }, { status: 415 });
    return NextResponse.json({ error: String(e) }, { status: 422 });
  }
}
