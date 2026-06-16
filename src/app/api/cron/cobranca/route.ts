import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dispararCobranca } from "@/lib/cobranca-service";

export const runtime = "nodejs";

function startOfDay(d: Date) { const r = new Date(d); r.setHours(0,0,0,0); return r; }
function endOfDay(d: Date)   { const r = new Date(d); r.setHours(23,59,59,999); return r; }
function diasAtras(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d; }
function diasFrente(n: number){ const d = new Date(); d.setDate(d.getDate() + n); return d; }

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const select = {
    id: true, numero: true, valor: true, vencimento: true,
    venda: { select: { id: true, empresaId: true, nomeComprador: true, telefoneComprador: true } },
  };

  const [lembretes, avisos, notificacoes] = await Promise.all([
    // T-5: vence em 5 dias
    prisma.parcela.findMany({
      where: { status: "aberta", vencimento: { gte: startOfDay(diasFrente(5)), lte: endOfDay(diasFrente(5)) } },
      select,
    }),
    // T+1: venceu ontem
    prisma.parcela.findMany({
      where: { status: "aberta", vencimento: { gte: startOfDay(diasAtras(1)), lte: endOfDay(diasAtras(1)) } },
      select,
    }),
    // T+30: 30 dias em atraso
    prisma.parcela.findMany({
      where: { status: "aberta", vencimento: { gte: startOfDay(diasAtras(30)), lte: endOfDay(diasAtras(30)) } },
      select,
    }),
  ]);

  const mapParcela = (p: typeof lembretes[0]) => ({
    ...p, valor: Number(p.valor),
  });

  const results = await Promise.allSettled([
    ...lembretes.map(p => dispararCobranca(mapParcela(p), "lembrete_amigavel")),
    ...avisos.map(p => dispararCobranca(mapParcela(p), "aviso_atraso")),
    ...notificacoes.map(p => dispararCobranca(mapParcela(p), "notificacao_extrajudicial")),
  ]);

  const ok  = results.filter(r => r.status === "fulfilled").length;
  const err = results.filter(r => r.status === "rejected").length;

  return NextResponse.json({
    ok, err, total: results.length,
    breakdown: {
      lembretes: lembretes.length,
      avisos: avisos.length,
      notificacoes: notificacoes.length,
    },
  });
}
