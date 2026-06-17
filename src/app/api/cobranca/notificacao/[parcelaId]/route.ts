import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildNotificacaoHTML } from "@/lib/cobranca-pdf";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ parcelaId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { parcelaId } = await params;

  const parcela = await prisma.parcela.findFirst({
    where: { id: parcelaId, venda: { empresaId: session.empresaId } },
    include: {
      venda: {
        include: { empresa: { select: { nome: true, logoEmpresa: true } } },
      },
    },
  });

  if (!parcela) return NextResponse.json({ error: "not found" }, { status: 404 });

  const hoje = new Date();
  const diasAtraso = parcela.vencimento
    ? Math.max(0, Math.floor((hoje.getTime() - parcela.vencimento.getTime()) / 86_400_000))
    : 0;

  const html = buildNotificacaoHTML({
    nomeEmpresa:      parcela.venda.empresa.nome,
    logoEmpresa:      (parcela.venda.empresa as any).logoEmpresa ?? null,
    cnpjEmpresa:      "00.000.000/0001-00",
    nomeComprador:    parcela.venda.nomeComprador,
    cpfComprador:     parcela.venda.cpfCnpjComprador,
    enderecoComprador: "Conforme cadastro",
    numeroParcela:    parcela.numero,
    valorParcela:     Number(parcela.valor),
    dataVencimento:   parcela.vencimento?.toLocaleDateString("pt-BR") ?? "—",
    diasAtraso,
    numeroContrato:   parcela.vendaId.slice(-8).toUpperCase(),
    cidade:           "São Paulo",
    dataAtual:        hoje.toLocaleDateString("pt-BR"),
  });

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
