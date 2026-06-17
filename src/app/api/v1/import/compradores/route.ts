import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateCompradorTemplate, parseCompradorExcel } from "@/lib/excel-import";

const MAX_ROWS = 500;

function normalizeCpf(v: string): string {
  return v.replace(/\D/g, "");
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const buffer = generateCompradorTemplate();
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-compradores.xlsx"',
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });

  let rows: ReturnType<typeof parseCompradorExcel>;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    rows = parseCompradorExcel(buffer);
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

    if (!row.cpfCnpj) { erros.push(`Linha ${linha}: coluna "cpfCnpj" é obrigatória para identificar o comprador`); continue; }

    const cpfNorm = normalizeCpf(row.cpfCnpj);

    // Find all vendas for this empresa that match by CPF (normalized comparison)
    const vendas = await prisma.venda.findMany({
      where: { empresaId: session.empresaId },
      select: { id: true, cpfCnpjComprador: true },
    });

    const matches = vendas.filter((v) => {
      if (!v.cpfCnpjComprador) return false;
      return normalizeCpf(v.cpfCnpjComprador) === cpfNorm;
    });

    if (matches.length === 0) {
      erros.push(`Linha ${linha}: nenhuma venda encontrada para CPF/CNPJ "${row.cpfCnpj}"`); continue;
    }

    const data: Record<string, string | null> = {};
    if (row.nomeComprador) data.nomeComprador = row.nomeComprador;
    if (row.telefone) data.telefoneComprador = row.telefone;
    if (row.email) data.emailComprador = row.email;

    try {
      await prisma.venda.updateMany({
        where: { id: { in: matches.map((m) => m.id) } },
        data,
      });
      importados += matches.length;
    } catch (e) {
      erros.push(`Linha ${linha}: ${e instanceof Error ? e.message : "erro desconhecido"}`);
    }
  }

  revalidatePath("/compradores");
  return NextResponse.json({ importados, erros });
}
