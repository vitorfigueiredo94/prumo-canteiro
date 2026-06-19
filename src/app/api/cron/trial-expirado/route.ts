import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { timingSafeEqual } from "crypto";

export const runtime = "nodejs";

const TRIAL_DIAS = 14;

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

async function enviarWhatsApp(telefone: string, mensagem: string): Promise<boolean> {
  const accessToken   = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!accessToken || !phoneNumberId || !telefone) return false;

  const tel = telefone.replace(/\D/g, "");
  const payload = {
    messaging_product: "whatsapp",
    to: tel.startsWith("55") ? tel : `55${tel}`,
    type: "text",
    text: { body: mensagem },
  };
  try {
    const res = await fetch(
      `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

function diaInicio(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function diaFim(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req.headers.get("x-cron-secret"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const hoje = diaInicio(new Date());

  // Expirados: desde + 14 dias <= hoje (ou seja, criados há >= 14 dias)
  const dataLimiteExpiracao = new Date(hoje);
  dataLimiteExpiracao.setDate(dataLimiteExpiracao.getDate() - TRIAL_DIAS);

  // Aviso -3 dias: criados exatamente há 11 dias (3 dias restantes)
  const inicio3d = new Date(hoje);
  inicio3d.setDate(inicio3d.getDate() - (TRIAL_DIAS - 3));

  // Aviso -1 dia: criados exatamente há 13 dias (1 dia restante)
  const inicio1d = new Date(hoje);
  inicio1d.setDate(inicio1d.getDate() - (TRIAL_DIAS - 1));

  const assinaturaSelect = {
    id: true,
    desde: true,
    empresa: { select: { nome: true, telefoneGestor: true } },
  };

  const [expirados, aviso3d, aviso1d] = await Promise.all([
    // Trials vencidos (ainda com status trial)
    prisma.assinatura.findMany({
      where: { status: "trial", desde: { lte: dataLimiteExpiracao } },
      select: assinaturaSelect,
    }),
    // Trials que expiram em exatamente 3 dias
    prisma.assinatura.findMany({
      where: {
        status: "trial",
        desde: { gte: diaInicio(inicio3d), lte: diaFim(inicio3d) },
      },
      select: assinaturaSelect,
    }),
    // Trials que expiram em exatamente 1 dia
    prisma.assinatura.findMany({
      where: {
        status: "trial",
        desde: { gte: diaInicio(inicio1d), lte: diaFim(inicio1d) },
      },
      select: assinaturaSelect,
    }),
  ]);

  let expiradosOk = 0;
  let avisos3dOk = 0;
  let avisos1dOk = 0;

  // ── Expirar trials vencidos ──────────────────────────────────────
  for (const a of expirados) {
    await prisma.assinatura.update({
      where: { id: a.id },
      data: { status: "cancelado" },
    });

    const tel = a.empresa.telefoneGestor;
    if (tel) {
      const msg = [
        `⚠️ *Seu período de teste do PrumoCanteiro encerrou*`,
        ``,
        `Olá, ${a.empresa.nome}! Seu acesso gratuito de ${TRIAL_DIAS} dias chegou ao fim.`,
        ``,
        `Para continuar usando a plataforma, entre em contato para assinar um de nossos planos e manter todos os seus dados.`,
        ``,
        `_PrumoCanteiro — Gestão de Obras_`,
      ].join("\n");
      if (await enviarWhatsApp(tel, msg)) expiradosOk++;
    } else {
      expiradosOk++;
    }
  }

  // ── Avisos 3 dias antes ─────────────────────────────────────────
  for (const a of aviso3d) {
    const tel = a.empresa.telefoneGestor;
    if (!tel) continue;
    const msg = [
      `⏰ *Seu teste no PrumoCanteiro termina em 3 dias*`,
      ``,
      `Olá, ${a.empresa.nome}! Você ainda tem 3 dias para explorar todos os recursos.`,
      ``,
      `Após esse período, o acesso será suspenso. Entre em contato para assinar e continuar com seus dados intactos.`,
      ``,
      `_PrumoCanteiro — Gestão de Obras_`,
    ].join("\n");
    if (await enviarWhatsApp(tel, msg)) avisos3dOk++;
  }

  // ── Avisos 1 dia antes ──────────────────────────────────────────
  for (const a of aviso1d) {
    const tel = a.empresa.telefoneGestor;
    if (!tel) continue;
    const msg = [
      `🔔 *Último dia de teste — PrumoCanteiro*`,
      ``,
      `Olá, ${a.empresa.nome}! Amanhã seu período gratuito encerra.`,
      ``,
      `Assine agora para não perder o acesso às suas obras, terrenos e dados cadastrados.`,
      ``,
      `_PrumoCanteiro — Gestão de Obras_`,
    ].join("\n");
    if (await enviarWhatsApp(tel, msg)) avisos1dOk++;
  }

  return NextResponse.json({
    expirados: expirados.length,
    expiradosNotificados: expiradosOk,
    avisos3d: aviso3d.length,
    avisos3dEnviados: avisos3dOk,
    avisos1d: aviso1d.length,
    avisos1dEnviados: avisos1dOk,
  });
}
