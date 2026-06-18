// Helpers de notificação via WhatsApp — superadmin e gestor de empresa
// Todas as funções são fire-and-forget: nunca lançam exceção para o chamador.
//
// Variáveis de env necessárias:
//   WHATSAPP_ACCESS_TOKEN     — token da Meta Cloud API (já existente)
//   WHATSAPP_PHONE_NUMBER_ID  — ID do número de envio (já existente)
//   ADMIN_WHATSAPP_PHONE      — celular do superadmin, só dígitos (ex: 11987654321)

async function enviarWA(telefone: string, mensagem: string): Promise<void> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!accessToken || !phoneNumberId || !telefone) return;

  await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: telefone.startsWith("55") ? telefone : `55${telefone}`,
      type: "text",
      text: { body: mensagem },
    }),
    signal: AbortSignal.timeout(8_000),
  });
}

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

/** Envia WhatsApp para o superadmin (ADMIN_WHATSAPP_PHONE). */
export async function notificarAdmin(mensagem: string): Promise<void> {
  const phone = process.env.ADMIN_WHATSAPP_PHONE?.replace(/\D/g, "");
  if (!phone) return;
  await enviarWA(phone, mensagem).catch(() => null);
}

/** Envia WhatsApp para o gestor de uma empresa (best-effort). */
export async function notificarGestor(
  telefoneGestor: string | null | undefined,
  mensagem: string
): Promise<void> {
  const phone = telefoneGestor?.replace(/\D/g, "");
  if (!phone) return;
  await enviarWA(phone, mensagem).catch(() => null);
}

// ── Mensagens prontas ────────────────────────────────────────────────────────

export function msgNovoCadastro(nome: string, empresa: string, email: string): string {
  return (
    `🆕 *Novo cadastro — PrumoCanteiro*\n\n` +
    `👤 *Usuário:* ${nome}\n` +
    `🏗️ *Empresa:* ${empresa}\n` +
    `✉️ *Email:* ${email}\n\n` +
    `_${agora()}_`
  );
}

export function msgFaturaPaga(empresa: string, competencia: string, valor: number): string {
  const [ano, mes] = competencia.split("-");
  return (
    `✅ *Pagamento confirmado — PrumoCanteiro*\n\n` +
    `🏗️ *Empresa:* ${empresa}\n` +
    `📅 *Competência:* ${mes}/${ano}\n` +
    `💰 *Valor:* R$ ${valor.toFixed(2).replace(".", ",")}\n\n` +
    `_${agora()}_`
  );
}

export function msgFaturaAtrasada(empresa: string, competencia: string, valor: number): string {
  const [ano, mes] = competencia.split("-");
  return (
    `⚠️ *Inadimplência — PrumoCanteiro*\n\n` +
    `🏗️ *Empresa:* ${empresa}\n` +
    `📅 *Competência:* ${mes}/${ano}\n` +
    `💰 *Valor em aberto:* R$ ${valor.toFixed(2).replace(".", ",")}\n\n` +
    `_${agora()}_`
  );
}

export function msgAssinaturaAtrasadaGestor(empresa: string, competencia: string, valor: number): string {
  const [ano, mes] = competencia.split("-");
  return (
    `⚠️ *PrumoCanteiro — Fatura em atraso*\n\n` +
    `Olá! A fatura de *${mes}/${ano}* da empresa *${empresa}* no valor de ` +
    `*R$ ${valor.toFixed(2).replace(".", ",")}* está em atraso.\n\n` +
    `O acesso ao sistema pode ser suspenso em breve. ` +
    `Entre em contato para regularizar.`
  );
}

export function msgAssinaturaPagaGestor(empresa: string, competencia: string): string {
  const [ano, mes] = competencia.split("-");
  return (
    `✅ *PrumoCanteiro — Pagamento confirmado*\n\n` +
    `O pagamento da fatura de *${mes}/${ano}* da empresa *${empresa}* foi confirmado. ` +
    `Seu acesso segue ativo. Obrigado!`
  );
}
