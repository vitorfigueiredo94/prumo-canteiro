import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function escapeCell(v: string): string {
  if (v.includes(";") || v.includes('"') || v.includes("\n")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

function fmtBR(v: number): string {
  return v.toFixed(2).replace(".", ",");
}

function fmtDate(d: Date | null): string {
  if (!d) return "";
  return d.toLocaleDateString("pt-BR");
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const tipo = req.nextUrl.searchParams.get("tipo");

  const obra = await prisma.obra.findFirst({
    where: { id, empresaId: session.empresaId },
    select: { id: true, nome: true },
  });
  if (!obra) return NextResponse.json({ error: "Obra não encontrada" }, { status: 404 });

  const slug = obra.nome.replace(/[^a-zA-Z0-9À-ÿ]/g, "_").slice(0, 40);

  if (tipo === "notas") {
    const notas = await prisma.notaFiscal.findMany({
      where: { obraId: id, empresaId: session.empresaId },
      orderBy: { emitidaEm: "desc" },
      include: { funcionario: { select: { nome: true } } },
    });

    const header = ["Número", "Categoria", "Status", "Fornecedor", "Funcionário", "Valor (R$)", "Emitida em", "Descrição"].map(escapeCell).join(";");
    const rows = notas.map((n: typeof notas[0]) =>
      [
        n.numero ?? "",
        n.categoria,
        n.status,
        n.fornecedor ?? "",
        n.funcionario?.nome ?? "",
        fmtBR(Number(n.valor)),
        fmtDate(n.emitidaEm),
        n.descricao ?? "",
      ].map(escapeCell).join(";")
    );

    const csv = "﻿" + [header, ...rows].join("\r\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="notas-${slug}.csv"`,
      },
    });
  }

  if (tipo === "pagamentos") {
    const pagamentos = await prisma.pagamentoFuncionario.findMany({
      where: { obraId: id, empresaId: session.empresaId },
      orderBy: { pagoEm: "desc" },
      include: { funcionario: { select: { nome: true } } },
    });

    const header = ["Funcionário", "Valor (R$)", "Pago em", "Descrição"].map(escapeCell).join(";");
    const rows = pagamentos.map((p: typeof pagamentos[0]) =>
      [
        p.funcionario?.nome ?? "",
        fmtBR(Number(p.valor)),
        fmtDate(p.pagoEm),
        p.descricao ?? "",
      ].map(escapeCell).join(";")
    );

    const csv = "﻿" + [header, ...rows].join("\r\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="pagamentos-${slug}.csv"`,
      },
    });
  }

  return NextResponse.json({ error: "tipo deve ser 'notas' ou 'pagamentos'" }, { status: 400 });
}
