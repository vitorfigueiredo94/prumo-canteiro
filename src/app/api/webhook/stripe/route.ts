import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { notificarAdmin, notificarGestor } from "@/lib/notificar-admin";

function agora(): string {
  return new Date().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe não configurado" }, { status: 503 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("[stripe-webhook] assinatura inválida (STRIPE_WEBHOOK_SECRET não bate?):", err);
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 400 });
  }

  console.log(`[stripe-webhook] evento recebido: ${event.type} (id=${event.id})`);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const empresaId = session.client_reference_id ?? session.metadata?.empresaId;
    const planoId = session.metadata?.planoId;
    console.log(`[stripe-webhook] checkout.completed → empresaId=${empresaId ?? "(vazio)"} planoId=${planoId ?? "(vazio)"}`);
    if (!empresaId) {
      console.log("[stripe-webhook] sem empresaId no metadata → ignorando (provavelmente checkout de outro produto)");
      return NextResponse.json({ ok: true });
    }

    const proximaCobranca = new Date();
    proximaCobranca.setMonth(proximaCobranca.getMonth() + 1);

    const res = await prisma.assinatura.updateMany({
      where: { empresaId },
      data: {
        status: "ativo",
        stripeCustomerId: session.customer as string | null,
        stripeSubscriptionId: session.subscription as string | null,
        proximaCobranca,
        ...(planoId ? { planoId } : {}),
      },
    });
    console.log(`[stripe-webhook] assinatura atualizada para ativo: ${res.count} registro(s) (empresaId=${empresaId})`);

    const empresa = await prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { nome: true, telefoneGestor: true },
    });

    const plano = planoId ? await prisma.plano.findUnique({ where: { id: planoId } }) : null;
    const planoNome = plano?.nome ?? "Plano";

    await notificarGestor(
      empresa?.telefoneGestor,
      `✅ *PrumoCanteiro — Assinatura confirmada!*\n\n` +
        `Olá, ${empresa?.nome ?? ""}! Seu pagamento foi processado com sucesso.\n\n` +
        `📦 *Plano:* ${planoNome}\n` +
        `📅 *Próxima cobrança:* ${proximaCobranca.toLocaleDateString("pt-BR")}\n\n` +
        `Bom trabalho! 🏗️`
    );

    await notificarAdmin(
      `💳 *Assinatura confirmada — PrumoCanteiro*\n\n` +
        `🏗️ *Empresa:* ${empresa?.nome ?? empresaId}\n` +
        `📦 *Plano:* ${planoNome}\n\n` +
        `_${agora()}_`
    );
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    await prisma.assinatura.updateMany({
      where: { stripeSubscriptionId: sub.id },
      data: { status: "cancelado" },
    });
  }

  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    const sub = invoice.parent?.subscription_details?.subscription;
    const subId = typeof sub === "string" ? sub : sub?.id;
    if (!subId) return NextResponse.json({ ok: true });

    await prisma.assinatura.updateMany({
      where: { stripeSubscriptionId: subId },
      data: { status: "inadimplente" },
    });

    const assinatura = await prisma.assinatura.findFirst({
      where: { stripeSubscriptionId: subId },
      include: { empresa: { select: { nome: true, telefoneGestor: true } } },
    });

    if (assinatura) {
      await notificarGestor(
        assinatura.empresa.telefoneGestor,
        `⚠️ *PrumoCanteiro — Falha no pagamento*\n\n` +
          `Identificamos uma falha no pagamento da sua assinatura *${assinatura.empresa.nome}*.\n\n` +
          `Verifique os dados do cartão no Stripe ou entre em contato com nosso suporte.`
      );

      await notificarAdmin(
        `⚠️ *Pagamento falhou — PrumoCanteiro*\n\n` +
          `🏗️ *Empresa:* ${assinatura.empresa.nome}\n\n` +
          `_${agora()}_`
      );
    }
  }

  return NextResponse.json({ ok: true });
}
