import Stripe from "stripe";

// Inicialização preguiçosa: o cliente Stripe só é criado quando realmente usado.
// Assim o app NUNCA quebra no boot/build só porque STRIPE_SECRET_KEY ainda não
// está no .env — quem precisar do Stripe trata a ausência da chave na hora.
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY não configurada no .env da VM.");
  }
  if (!_stripe) {
    _stripe = new Stripe(key, { apiVersion: "2026-05-27.dahlia" });
  }
  return _stripe;
}

export function stripeConfigurado(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
