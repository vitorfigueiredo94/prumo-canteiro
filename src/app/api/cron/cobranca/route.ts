import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dispararCobranca } from "@/lib/cobranca-service";
import { timingSafeEqual } from "crypto";

export const runtime = "nodejs";

function verifyCronSecret(incoming: string | null): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected || !incoming) return false;
  try {
    const a = Buffer.from(incoming);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req.headers.get("x-cron-secret"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const agora = new Date();
  const hoje  = new Date(agora); hoje.setHours(0, 0, 0, 0);
  const dia30 = new Date(hoje);  dia30.setDate(dia30.getDate() - 30);
  const dia5  = new Date(hoje);  dia5.setDate(dia5.getDate() + 5);
  const dia5f = new Date(dia5);  dia5f.setHours(23, 59, 59, 999);

  const select = {
    id: true, numero: true, valor: true, vencimento: true,
    venda: { select: { id: true, empresaId: true, nomeComprador: true, telefoneComprador: true } },
  };

  // Busca logs existentes para deduplicação (um tipo por parcela — não reenviar)
  const logsExistentes = await prisma.cobrancaLog.findMany({
    where: { tipo: { in: ["lembrete_amigavel", "aviso_atraso", "notificacao_extrajudicial"] }, status: "enviado" },
    select: { parcelaId: true, tipo: true },
  });

  type Tipo = "lembrete_amigavel" | "aviso_atraso" | "notificacao_extrajudicial";
  const jaEnviou = (parcelaId: string, tipo: Tipo) =>
    logsExistentes.some((l: { parcelaId: string; tipo: string }) => l.parcelaId === parcelaId && l.tipo === tipo);

  const [lembretes, emAtraso, extrajudiciais] = await Promise.all([
    // T-5: vence em até 5 dias
    prisma.parcela.findMany({
      where: { status: "aberta", vencimento: { gte: hoje, lte: dia5f } },
      select,
    }),
    // Todos em atraso (venceu antes de hoje, ainda não pagos)
    prisma.parcela.findMany({
      where: { status: "aberta", vencimento: { lt: hoje, gte: dia30 } },
      select,
    }),
    // 30+ dias em atraso
    prisma.parcela.findMany({
      where: { status: "aberta", vencimento: { lt: dia30 } },
      select,
    }),
  ]);

  const toSend: Array<{ parcela: typeof lembretes[0]; tipo: Tipo }> = [];

  for (const p of lembretes) {
    if (!jaEnviou(p.id, "lembrete_amigavel")) toSend.push({ parcela: p, tipo: "lembrete_amigavel" });
  }
  for (const p of emAtraso) {
    if (!jaEnviou(p.id, "aviso_atraso")) toSend.push({ parcela: p, tipo: "aviso_atraso" });
  }
  for (const p of extrajudiciais) {
    if (!jaEnviou(p.id, "notificacao_extrajudicial")) toSend.push({ parcela: p, tipo: "notificacao_extrajudicial" });
  }

  const results = await Promise.allSettled(
    toSend.map(({ parcela: p, tipo }) =>
      dispararCobranca({ ...p, valor: Number(p.valor) }, tipo)
    )
  );

  const ok  = results.filter(r => r.status === "fulfilled" && (r.value as any).ok).length;
  const err = results.filter(r => r.status === "rejected" || !(r as any).value?.ok).length;

  return NextResponse.json({
    ok, err, total: toSend.length,
    breakdown: {
      lembretes: toSend.filter(t => t.tipo === "lembrete_amigavel").length,
      avisos:    toSend.filter(t => t.tipo === "aviso_atraso").length,
      extrajudiciais: toSend.filter(t => t.tipo === "notificacao_extrajudicial").length,
    },
  });
}
