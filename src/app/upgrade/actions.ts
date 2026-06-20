"use server";

import Stripe from "stripe";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-05-27.dahlia" });

export async function assinarAction(planoId: string) {
  const session = await getSession();
  if (!session) redirect("/login");

  const [plano, empresa] = await Promise.all([
    prisma.plano.findUnique({ where: { id: planoId } }),
    prisma.empresa.findUnique({
      where: { id: session.empresaId },
      select: { nome: true, assinatura: { select: { stripeCustomerId: true } } },
    }),
  ]);

  if (!plano) throw new Error("Plano não encontrado");

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
  } else if (empresa?.nome) {
    checkoutParams.customer_email = undefined;
  }

  const checkoutSession = await stripe.checkout.sessions.create(checkoutParams);
  redirect(checkoutSession.url!);
}
