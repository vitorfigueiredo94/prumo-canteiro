import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateTerrenoTemplate, parseTerrenoExcel } from "@/lib/excel-import";
import { criarChecklistParaTerreno } from "@/features/checklist/service";

const VALID_STATUS = new Set(["disponivel", "em_obra", "vendido"]);
const MAX_ROWS = 500;

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const buffer = generateTerrenoTemplate();
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-terrenos.xlsx"',
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });

  let rows: ReturnType<typeof parseTerrenoExcel>;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    rows = parseTerrenoExcel(buffer);
  } catch {
    return NextResponse.json({ error: "Arquivo inválido. Use o template fornecido." }, { status: 400 });
  }

  if (rows.length === 0) return NextResponse.json({ importados: 0, erros: ["A planilha está vazia."] });
  if (rows.length > MAX_ROWS) {
    return NextResponse.json({ error: `Máximo de ${MAX_ROWS} linhas por importação.` }, { status: 400 });
  }

  let importados = 0;
  const erros: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const linha = i + 2;

    if (!row.nome) { erros.push(`Linha ${linha}: coluna "nome" é obrigatória`); continue; }
    if (!row.cidade) { erros.push(`Linha ${linha}: coluna "cidade" é obrigatória`); continue; }
    if (row.area === null || row.area <= 0) { erros.push(`Linha ${linha}: coluna "area (m²)" deve ser um número positivo`); continue; }

    const status = VALID_STATUS.has(row.status) ? row.status : "disponivel";

    try {
      const terreno = await prisma.terreno.create({
        data: {
          empresaId: session.empresaId,
          nome: row.nome,
          cidade: row.cidade,
          area: row.area,
          status,
          endereco: row.endereco || null,
          numero: row.numero || null,
          valorCompra: row.valorCompra ?? null,
          aquisicao: row.aquisicao ? new Date(row.aquisicao) : null,
        },
      });

      await criarChecklistParaTerreno(terreno.id, session.empresaId).catch(() => null);
      importados++;
    } catch (e) {
      erros.push(`Linha ${linha}: ${e instanceof Error ? e.message : "erro desconhecido"}`);
    }
  }

  revalidatePath("/terrenos");
  return NextResponse.json({ importados, erros });
}
