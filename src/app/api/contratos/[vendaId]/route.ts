import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildContratoHTML } from "@/lib/contrato-pdf";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ vendaId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { vendaId } = await params;

  const venda = await prisma.venda.findFirst({
    where: { id: vendaId, empresaId: session.empresaId },
    include: {
      empresa: { select: { nome: true, logoEmpresa: true } },
      terreno: { select: { nome: true, cidade: true, numero: true, area: true } },
      parcelas: { orderBy: { numero: "asc" } },
    },
  });

  if (!venda) return NextResponse.json({ error: "not found" }, { status: 404 });

  const ano = new Date(venda.criadoEm).getFullYear();
  const numeroContrato = `${ano}-${venda.id.slice(-6).toUpperCase()}`;

  const html = buildContratoHTML({
    numeroContrato,
    dataContrato: venda.dataContrato?.toISOString() ?? venda.criadoEm.toISOString(),
    cidade: venda.terreno.cidade,
    nomeEmpresa: venda.empresa.nome,
    logoEmpresa: (venda.empresa as any).logoEmpresa ?? null,
    nomeComprador: venda.nomeComprador,
    cpfCnpjComprador: venda.cpfCnpjComprador ?? null,
    telefoneComprador: venda.telefoneComprador ?? null,
    emailComprador: venda.emailComprador ?? null,
    nomeLote: venda.terreno.nome + (venda.terreno.numero ? ` — Lote ${venda.terreno.numero}` : ""),
    cidadeLote: venda.terreno.cidade,
    areaLote: (venda.terreno as any).area ? String((venda.terreno as any).area) : null,
    valorTotal: Number(venda.valorTotal),
    entrada: Number(venda.entrada),
    numeroParcelas: venda.numeroParcelas,
    diaVencimento: venda.diaVencimento,
    parcelas: venda.parcelas.map((p) => ({
      numero: p.numero,
      valor: Number(p.valor),
      vencimento: p.vencimento?.toISOString() ?? null,
    })),
    observacoes: venda.observacoes ?? null,
    contratoAssinadoEm: (venda as any).contratoAssinadoEm?.toISOString() ?? null,
  });

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
