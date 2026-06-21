"use server";

import type Stripe from "stripe";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe, stripeConfigurado } from "@/lib/stripe";

export async function assinarAction(planoId: string) {
  const session = await getSession();
  if (!session) redirect("/login");

  // Stripe ainda não configurado no .env → mensagem clara, sem estourar erro
  if (!stripeConfigurado()) redirect("/upgrade?erro=config");

  const [plano, empresa] = await Promise.all([
    prisma.plano.findUnique({ where: { id: planoId } }),
    prisma.empresa.findUnique({
      where: { id: session.empresaId },
      select: { nome: true, assinatura: { select: { stripeCustomerId: true } } },
    }),
  ]);

  if (!plano) redirect("/upgrade?erro=plano");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const checkoutParams: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    client_reference_id: session.empresaId,
    metadata: { empresaId: session.empresaId, planoId },
    line_items: [
      {
        price_data: {
          currency: "brl",
          recurring: { interval: "month" },
          product_data: { name: `PrumoCanteiro — ${plano.nome}` },
          unit_amount: Math.round(Number(plano.preco) * 100),
        },
        quantity: 1,
      },
    ],
    success_url: `${appUrl}/dashboard?payment=success`,
    cancel_url: `${appUrl}/upgrade`,
    locale: "pt-BR",
  };

  const existingCustomerId = empresa?.assinatura?.stripeCustomerId;
  if (existingCustomerId) {
    checkoutParams.customer = existingCustomerId;
  }

  // Cria a sessão de checkout. Se a chave estiver errada/inválida, o Stripe
  // lança aqui — capturamos e voltamos com mensagem em vez de quebrar a tela.
  let url: string | null = null;
  try {
    const checkoutSession = await getStripe().checkout.sessions.create(checkoutParams);
    url = checkoutSession.url;
  } catch (e) {
    console.error("[stripe] Falha ao criar checkout:", e);
    redirect("/upgrade?erro=checkout");
  }

  if (!url) redirect("/upgrade?erro=checkout");
  redirect(url);
}
