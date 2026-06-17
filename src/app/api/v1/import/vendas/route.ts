import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateVendaTemplate, parseVendaExcel } from "@/lib/excel-import";

const MAX_ROWS = 200;

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const buffer = generateVendaTemplate();
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-vendas.xlsx"',
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });

  let rows: ReturnType<typeof parseVendaExcel>;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    rows = parseVendaExcel(buffer);
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

    if (!row.nomeTerreno) { erros.push(`Linha ${linha}: coluna "nomeTerreno" é obrigatória`); continue; }
    if (!row.nomeComprador) { erros.push(`Linha ${linha}: coluna "nomeComprador" é obrigatória`); continue; }
    if (row.valorTotal === null || row.valorTotal <= 0) {
      erros.push(`Linha ${linha}: coluna "valorTotal (R$)" deve ser um número positivo`); continue;
    }

    const terreno = await prisma.terreno.findFirst({
      where: { empresaId: session.empresaId, nome: row.nomeTerreno },
      select: { id: true },
    });
    if (!terreno) {
      erros.push(`Linha ${linha}: terreno "${row.nomeTerreno}" não encontrado (verifique o nome exato)`); continue;
    }

    const valorTotal = row.valorTotal;
    const entrada = row.entrada ?? 0;
    const numeroParcelas = Math.max(1, Math.min(360, Math.round(row.numeroParcelas ?? 1)));
    const diaVencimento = Math.max(1, Math.min(28, Math.round(row.diaVencimento ?? 5)));

    const restante = valorTotal - entrada;
    const valorParcela = numeroParcelas > 0 ? restante / numeroParcelas : restante;
    const base = row.dataContrato ? new Date(row.dataContrato) : new Date();
    const vencimentos: Date[] = Array.from({ length: numeroParcelas }, (_, idx) => {
      const d = new Date(base);
      d.setMonth(d.getMonth() + idx + 1);
      d.setDate(diaVencimento);
      return d;
    });

    try {
      await prisma.$transaction(async (tx) => {
        const venda = await tx.venda.create({
          data: {
            empresaId: session.empresaId,
            terrenoId: terreno.id,
            nomeComprador: row.nomeComprador,
            cpfCnpjComprador: row.cpfCnpj || null,
            telefoneComprador: row.telefone || null,
            emailComprador: row.email || null,
            valorTotal,
            entrada,
            numeroParcelas,
            diaVencimento,
            dataContrato: row.dataContrato ? new Date(row.dataContrato) : null,
            observacoes: row.observacoes || null,
          },
        });

        if (numeroParcelas > 0 && restante > 0) {
          await tx.parcela.createMany({
            data: vencimentos.map((venc, idx) => ({
              vendaId: venda.id,
              numero: idx + 1,
              valor: valorParcela,
              vencimento: venc,
              status: "aberta",
            })),
          });
        }

        await tx.terreno.updateMany({
          where: { id: terreno.id, empresaId: session.empresaId },
          data: { status: "vendido" },
        });
      });

      importados++;
    } catch (e) {
      erros.push(`Linha ${linha}: ${e instanceof Error ? e.message : "erro desconhecido"}`);
    }
  }

  revalidatePath("/vendas");
  revalidatePath("/terrenos");
  revalidatePath("/compradores");
  return NextResponse.json({ importados, erros });
}
