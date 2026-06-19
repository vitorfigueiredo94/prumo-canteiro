import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getChecklistComProgresso } from "@/features/checklist/service";
import { buildRelatorioObraHTML } from "@/lib/relatorio-obra";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;

  const [obra, empresa, checklists, materiais, orcamento] = await Promise.all([
    prisma.obra.findFirst({
      where: { id, empresaId: session.empresaId },
      include: {
        terreno: { select: { nome: true, cidade: true, area: true } },
        notas: { orderBy: { emitidaEm: "desc" } },
        pagamentos: {
          include: { funcionario: { select: { nome: true } } },
          orderBy: { pagoEm: "desc" },
        },
        diario: { orderBy: { data: "desc" }, take: 40 },
      },
    }),
    prisma.empresa.findUnique({
      where: { id: session.empresaId },
      select: { nome: true, logoEmpresa: true },
    }),
    getChecklistComProgresso("obra", id, session.empresaId),
    prisma.materialObra.findMany({
      where: { obraId: id, empresaId: session.empresaId },
      orderBy: { criadoEm: "asc" },
    }),
    prisma.orcamentoItem.findMany({
      where: { obraId: id, empresaId: session.empresaId },
      orderBy: [{ categoria: "asc" }, { ordem: "asc" }],
    }),
  ]);

  if (!obra || !empresa)
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const html = buildRelatorioObraHTML({
    obra: {
      id: obra.id,
      nome: obra.nome,
      status: obra.status,
      orcamento: Number(obra.orcamento),
      progresso: obra.progresso,
      inicio: obra.inicio ? obra.inicio.toISOString() : null,
      prazo: obra.prazo ? obra.prazo.toISOString() : null,
      responsavel: obra.responsavel,
      cronogramaJson: obra.cronogramaJson,
      terreno: obra.terreno
        ? {
            nome: obra.terreno.nome,
            cidade: obra.terreno.cidade,
            area: obra.terreno.area ? Number(obra.terreno.area) : null,
          }
        : null,
    },
    empresa: { nome: empresa.nome, logoEmpresa: empresa.logoEmpresa },
    notas: obra.notas.map((n) => ({
      fornecedor: n.fornecedor,
      categoria: n.categoria,
      valor: Number(n.valor),
      emitidaEm: n.emitidaEm ? n.emitidaEm.toISOString() : null,
      status: n.status,
    })),
    pagamentos: obra.pagamentos.map((p) => ({
      valor: Number(p.valor),
      descricao: p.descricao,
      pagoEm: p.pagoEm ? p.pagoEm.toISOString() : null,
      funcionario: p.funcionario,
    })),
    checklists,
    diario: obra.diario.map((d) => ({
      data: d.data ? d.data.toISOString() : null,
      conteudo: d.conteudo,
      autor: d.autor,
      fotos: (() => {
        const arr: string[] = d.fotosJson ? JSON.parse(d.fotosJson) : d.fotoUrl ? [d.fotoUrl] : [];
        return arr.slice(0, 4);
      })(),
    })),
    materiais: materiais.map((m) => ({
      nome: m.nome,
      quantidade: Number(m.quantidade),
      unidade: m.unidade,
      valorUnit: Number(m.valorUnit),
      fornecedor: m.fornecedor,
      data: m.data ? m.data.toISOString() : null,
    })),
    orcamento: orcamento.map((o) => ({
      categoria: o.categoria,
      descricao: o.descricao,
      unidade: o.unidade,
      quantidade: Number(o.quantidade),
      valorUnit: Number(o.valorUnit),
    })),
  });

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
