// Helpers de notificação — superadmin (email + WhatsApp) e gestor de empresa (WhatsApp)
// Todas as funções são fire-and-forget: nunca lançam exceção para o chamador.
//
// Variáveis de env:
//   WHATSAPP_ACCESS_TOKEN     — token da Meta Cloud API (já existente)
//   WHATSAPP_PHONE_NUMBER_ID  — ID do número de envio (já existente)
//   ADMIN_WHATSAPP_PHONE      — celular do superadmin, só dígitos (ex: 11987654321)
//   ADMIN_NOTIFICATION_EMAIL  — email do superadmin (ex: voce@gmail.com)
//   EMAIL_HOST                — servidor SMTP (ex: smtp.gmail.com)
//   EMAIL_PORT                — porta SMTP (ex: 587)
//   EMAIL_USER                — usuário SMTP (ex: voce@gmail.com)
//   EMAIL_PASS                — senha/app-password do SMTP
//   EMAIL_FROM                — remetente (ex: PrumoCanteiro <noreply@seudominio.com>)

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

/** Envia WhatsApp para o comprador/cliente de uma obra (best-effort). */
export async function notificarCliente(
  telefoneCliente: string | null | undefined,
  mensagem: string
): Promise<void> {
  const phone = telefoneCliente?.replace(/\D/g, "");
  if (!phone) return;
  await enviarWA(phone, mensagem).catch(() => null);
}

// ── Email (nodemailer) ───────────────────────────────────────────────────────

async function criarTransporter() {
  const nodemailer = await import("nodemailer");
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT ?? 587),
    secure: Number(process.env.EMAIL_PORT) === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

/**
 * Envia email ao superadmin (ADMIN_NOTIFICATION_EMAIL).
 * Silencioso se as vars de env não estiverem configuradas.
 */
export async function emailAdmin(assunto: string, html: string, texto: string): Promise<void> {
  const to = process.env.ADMIN_NOTIFICATION_EMAIL;
  const from = process.env.EMAIL_FROM ?? process.env.EMAIL_USER;
  if (!to || !process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;

  try {
    const transporter = await criarTransporter();
    await transporter.sendMail({ from, to, subject: assunto, text: texto, html });
  } catch {
    // silencioso — notificação é best-effort
  }
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

export function emailNovoCadastroHtml(nome: string, empresa: string, email: string): string {
  const ts = agora();
  return `<!DOCTYPE html>
<html lang="pt-BR">
<body style="margin:0;padding:0;background:#f4f4f5;font-family:sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
<tr><td align="center">
<table width="540" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
  <!-- Header -->
  <tr><td style="background:#1e3a5f;padding:24px 32px">
    <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff">🏗️ PrumoCanteiro</p>
    <p style="margin:4px 0 0;font-size:13px;color:#a0b4cc">Novo cadastro no SaaS</p>
  </td></tr>
  <!-- Body -->
  <tr><td style="padding:28px 32px">
    <p style="margin:0 0 20px;font-size:15px;color:#374151">
      Um novo usuário se cadastrou em <strong>${ts}</strong>.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-radius:6px;overflow:hidden">
      <tr>
        <td style="padding:11px 16px;background:#f3f4f6;font-size:13px;font-weight:600;color:#6b7280;width:130px">Usuário</td>
        <td style="padding:11px 16px;background:#f9fafb;font-size:14px;color:#111827">${nome}</td>
      </tr>
      <tr>
        <td style="padding:11px 16px;background:#f3f4f6;font-size:13px;font-weight:600;color:#6b7280">Empresa</td>
        <td style="padding:11px 16px;background:#f9fafb;font-size:14px;color:#111827">${empresa}</td>
      </tr>
      <tr>
        <td style="padding:11px 16px;background:#f3f4f6;font-size:13px;font-weight:600;color:#6b7280">E-mail</td>
        <td style="padding:11px 16px;background:#f9fafb;font-size:14px;color:#111827">${email}</td>
      </tr>
    </table>
  </td></tr>
  <!-- Footer -->
  <tr><td style="padding:16px 32px 24px;border-top:1px solid #e5e7eb">
    <p style="margin:0;font-size:12px;color:#9ca3af">
      Notificação automática do PrumoCanteiro · ${ts}
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

export function emailNovoCadastroTexto(nome: string, empresa: string, email: string): string {
  return (
    `Novo cadastro no PrumoCanteiro — ${agora()}\n\n` +
    `Usuário:  ${nome}\n` +
    `Empresa:  ${empresa}\n` +
    `E-mail:   ${email}\n`
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

export function msgFaseObra(
  nomeObra: string,
  nomeCliente: string,
  faseLabel: string,
  nomeEmpresa: string
): string {
  return (
    `🏗️ *Atualização da sua obra*\n\n` +
    `Olá, ${nomeCliente}! A obra *${nomeObra}* avançou para a fase *${faseLabel}*.\n\n` +
    `Qualquer dúvida, entre em contato conosco.\n\n` +
    `_${nomeEmpresa}_`
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
