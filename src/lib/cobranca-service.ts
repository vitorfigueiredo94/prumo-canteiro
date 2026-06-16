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

export async function dispararCobranca(parcela: ParcelaInfo, tipo: TipoCobranca) {
  const telefone = parcela.venda.telefoneComprador?.replace(/\D/g, "");
  if (!telefone) {
    await logCobranca(parcela, tipo, "erro", null, "sem_telefone");
    return { ok: false, reason: "sem_telefone" };
  }

  const mensagem = MENSAGENS[tipo](parcela);

  // Payload compatível com Evolution API v2 e Z-API
  const payload = {
    number: `55${telefone}@s.whatsapp.net`,
    text: mensagem,
    options: { delay: 1500, presence: "composing", linkPreview: false },
  };

  const apiUrl      = process.env.WHATSAPP_API_URL;
  const apiKey      = process.env.WHATSAPP_API_KEY;
  const instance    = process.env.WHATSAPP_INSTANCE;

  // Se não configurado, apenas loga sem enviar
  if (!apiUrl || !apiKey || !instance) {
    await logCobranca(parcela, tipo, "pendente", payload, "whatsapp_nao_configurado");
    return { ok: false, reason: "whatsapp_nao_configurado" };
  }

  try {
    const res = await fetch(`${apiUrl}/message/sendText/${instance}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: apiKey },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
    const resposta = await res.text();
    await logCobranca(parcela, tipo, res.ok ? "enviado" : "erro", payload, resposta);
    return { ok: res.ok };
  } catch (err) {
    await logCobranca(parcela, tipo, "erro", payload, String(err));
    return { ok: false };
  }
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
