import { prisma } from "./prisma";
import { fmtBRL } from "./format";

export type TipoCobranca = "lembrete_amigavel" | "aviso_atraso" | "notificacao_extrajudicial";

interface ParcelaInfo {
  id: string;
  numero: number;
  valor: number;
  vencimento: Date | null;
  venda: {
    id: string;
    empresaId: string;
    nomeComprador: string;
    telefoneComprador: string | null;
  };
}

const MENSAGENS: Record<TipoCobranca, (p: ParcelaInfo) => string> = {
  lembrete_amigavel: (p) =>
    `Olá, ${p.venda.nomeComprador.split(" ")[0]}! 👋 Passando para lembrar que sua parcela nº ${p.numero} ` +
    `no valor de *${fmtBRL(p.valor)}* vence em *5 dias*. ` +
    `Caso já tenha realizado o pagamento, desconsidere. Qualquer dúvida, estamos à disposição! 🏗️`,

  aviso_atraso: (p) =>
    `⚠️ *Aviso de atraso* — ${p.venda.nomeComprador.split(" ")[0]}, ` +
    `a parcela nº ${p.numero} (${fmtBRL(p.valor)}) venceu ontem e ainda consta em aberto. ` +
    `Regularize o quanto antes para evitar encargos de mora. Entre em contato conosco.`,

  notificacao_extrajudicial: (p) =>
    `📋 *NOTIFICAÇÃO EXTRAJUDICIAL* — ${p.venda.nomeComprador}\n\n` +
    `Sua parcela nº ${p.numero} encontra-se em atraso há 30 dias ` +
    `(valor: ${fmtBRL(p.valor)}). Nos termos do contrato, fica V.Sa. ` +
    `*notificado extrajudicialmente* para quitação do débito no prazo de *72 horas*, ` +
    `sob pena de protesto em Cartório de Títulos e Documentos e ação judicial.\n\n` +
    `Uma notificação formal foi gerada e será enviada ao seu endereço.`,
};

async function enviarWhatsApp(
  telefone: string,
  mensagem: string,
  accessToken: string,
  phoneNumberId: string,
): Promise<{ ok: boolean; resposta: string }> {
  const payload = {
    messaging_product: "whatsapp",
    to: `55${telefone}`,
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
    return { ok: res.ok, resposta: await res.text() };
  } catch (err) {
    return { ok: false, resposta: String(err) };
  }
}

export async function dispararCobranca(parcela: ParcelaInfo, tipo: TipoCobranca) {
  const telefone = parcela.venda.telefoneComprador?.replace(/\D/g, "");
  if (!telefone) {
    await logCobranca(parcela, tipo, "erro", null, "sem_telefone");
    return { ok: false, reason: "sem_telefone" };
  }

  const mensagem = MENSAGENS[tipo](parcela);

  const accessToken   = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  // Se não configurado, apenas loga sem enviar
  if (!accessToken || !phoneNumberId) {
    await logCobranca(parcela, tipo, "pendente", null, "whatsapp_nao_configurado");
    return { ok: false, reason: "whatsapp_nao_configurado" };
  }

  // Envia para o comprador
  const { ok, resposta } = await enviarWhatsApp(telefone, mensagem, accessToken, phoneNumberId);
  await logCobranca(parcela, tipo, ok ? "enviado" : "erro", { to: telefone }, resposta);

  // Notifica o gestor da empresa (número cadastrado no perfil)
  try {
    const empresa = await prisma.empresa.findUnique({
      where: { id: parcela.venda.empresaId },
      select: { telefoneGestor: true },
    });
    const telGestor = empresa?.telefoneGestor?.replace(/\D/g, "");
    if (telGestor) {
      const tipoLabel: Record<TipoCobranca, string> = {
        lembrete_amigavel: "Lembrete",
        aviso_atraso: "Aviso de atraso",
        notificacao_extrajudicial: "Notificação extrajudicial",
      };
      const aviso =
        `📋 *PrumoCanteiro — Cobrança disparada*\n\n` +
        `Comprador: ${parcela.venda.nomeComprador}\n` +
        `Parcela: Nº ${parcela.numero} · ${fmtBRL(parcela.valor)}\n` +
        `Tipo: ${tipoLabel[tipo]}\n` +
        `Status envio: ${ok ? "✅ Enviado" : "❌ Falhou"}\n\n` +
        `_Mensagem enviada:_\n${mensagem}`;
      await enviarWhatsApp(telGestor, aviso, accessToken, phoneNumberId);
    }
  } catch {
    // notificação do gestor é best-effort — não bloqueia a cobrança
  }

  return { ok };
}

async function logCobranca(
  parcela: ParcelaInfo,
  tipo: TipoCobranca,
  status: string,
  payload: unknown,
  resposta: string | null
) {
  await prisma.cobrancaLog.create({
    data: {
      empresaId: parcela.venda.empresaId,
      parcelaId: parcela.id,
      tipo,
      status,
      payload: payload ? JSON.stringify(payload) : null,
      resposta,
    },
  });
}
