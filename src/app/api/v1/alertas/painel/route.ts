import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const agora  = new Date();
  const hoje   = new Date(agora); hoje.setHours(0, 0, 0, 0);
  const amanha = new Date(hoje); amanha.setDate(hoje.getDate() + 1);
  const em3d   = new Date(hoje); em3d.setDate(hoje.getDate() + 3);
  const em30d  = new Date(hoje); em30d.setDate(hoje.getDate() + 30);

  const [
    parcelasAtrasadas,
    parcelasHoje,
    parcelasEm3d,
    obrasRisco,
    chamadosAbertos,
  ] = await Promise.all([
    // Parcelas em atraso
    prisma.parcela.findMany({
      where: { venda: { empresaId: session.empresaId }, status: "aberta", vencimento: { lt: hoje } },
      include: { venda: { select: { nomeComprador: true, terreno: { select: { nome: true } } } } },
      orderBy: { vencimento: "asc" },
      take: 50,
    }),
    // Vencendo hoje
    prisma.parcela.findMany({
      where: { venda: { empresaId: session.empresaId }, status: "aberta", vencimento: { gte: hoje, lt: amanha } },
      include: { venda: { select: { nomeComprador: true, terreno: { select: { nome: true } } } } },
    }),
    // Vencendo em até 3 dias
    prisma.parcela.findMany({
      where: { venda: { empresaId: session.empresaId }, status: "aberta", vencimento: { gte: amanha, lt: em3d } },
      include: { venda: { select: { nomeComprador: true, terreno: { select: { nome: true } } } } },
      orderBy: { vencimento: "asc" },
    }),
    // Obras em risco: prazo vencido ou prazo < 30 dias, status ativo
    prisma.obra.findMany({
      where: {
        empresaId: session.empresaId,
        status: { notIn: ["concluida", "cancelada", "suspensa"] },
        prazo: { not: null, lte: em30d },
      },
      select: { id: true, nome: true, status: true, progresso: true, prazo: true, responsavel: true },
      orderBy: { prazo: "asc" },
    }),
    // Chamados de assistência abertos (sem @relation — append-only model)
    prisma.chamadoAssistencia.findMany({
      where: { empresaId: session.empresaId, status: "aberto" },
      orderBy: { criadoEm: "asc" },
      take: 30,
    }),
  ]);

  const s = (d: Date) => d.toISOString();
  const diasAtraso = (v: Date | null) => {
    if (!v) return 0;
    return Math.max(0, Math.floor((hoje.getTime() - v.getTime()) / 86_400_000));
  };
  const diasRestantes = (v: Date | null) => {
    if (!v) return null;
    return Math.ceil((v.getTime() - hoje.getTime()) / 86_400_000);
  };

  // Enrich chamados com nomes de venda e componente
  const vendaIds      = [...new Set(chamadosAbertos.map((c) => c.vendaId))];
  const componenteIds = [...new Set(chamadosAbertos.map((c) => c.componenteId))];
  const [vendas, componentes] = await Promise.all([
    vendaIds.length > 0
      ? prisma.venda.findMany({ where: { id: { in: vendaIds } }, select: { id: true, nomeComprador: true } })
      : Promise.resolve([]),
    componenteIds.length > 0
      ? prisma.garantiaComponente.findMany({ where: { id: { in: componenteIds } }, select: { id: true, nome: true } })
      : Promise.resolve([]),
  ]);
  const vendaMap      = Object.fromEntries(vendas.map((v) => [v.id, v.nomeComprador]));
  const componenteMap = Object.fromEntries(componentes.map((c) => [c.id, c.nome]));

  return NextResponse.json({
    atrasadas: parcelasAtrasadas.map((p) => ({
      id: p.id,
      nomeComprador: p.venda.nomeComprador,
      terreno: p.venda.terreno?.nome ?? null,
      numero: p.numero,
      valor: Number(p.valor),
      vencimento: p.vencimento ? s(p.vencimento) : null,
      diasAtraso: diasAtraso(p.vencimento),
    })),
    vencendoHoje: parcelasHoje.map((p) => ({
      id: p.id,
      nomeComprador: p.venda.nomeComprador,
      terreno: p.venda.terreno?.nome ?? null,
      numero: p.numero,
      valor: Number(p.valor),
      vencimento: p.vencimento ? s(p.vencimento) : null,
    })),
    vencendoEm3d: parcelasEm3d.map((p) => ({
      id: p.id,
      nomeComprador: p.venda.nomeComprador,
      terreno: p.venda.terreno?.nome ?? null,
      numero: p.numero,
      valor: Number(p.valor),
      vencimento: p.vencimento ? s(p.vencimento) : null,
      diasRestantes: diasRestantes(p.vencimento) ?? 0,
    })),
    obrasRisco: obrasRisco.map((o) => ({
      id: o.id,
      nome: o.nome,
      status: o.status,
      progresso: o.progresso,
      prazo: o.prazo ? s(o.prazo) : null,
      responsavel: o.responsavel,
      diasRestantes: diasRestantes(o.prazo),
    })),
    chamados: chamadosAbertos.map((c) => ({
      id: c.id,
      nomeComprador: vendaMap[c.vendaId] ?? "—",
      componente: componenteMap[c.componenteId] ?? "—",
      descricao: c.descricao,
      criadoEm: s(c.criadoEm),
    })),
    totais: {
      atrasadas: parcelasAtrasadas.length,
      vencendoHoje: parcelasHoje.length,
      vencendoEm3d: parcelasEm3d.length,
      obrasRisco: obrasRisco.length,
      chamados: chamadosAbertos.length,
    },
  });
}
