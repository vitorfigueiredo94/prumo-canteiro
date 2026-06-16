import type { GarantiaCheck } from "./garantia-service";

interface PromptParams {
  nomeComprador: string;
  componenteNome: string;
  baseLegal: string;
  descricaoDefeito: string;
  dataEntregaChaves: string;
  dataAbertura: string;
  garantia: GarantiaCheck;
}

export function buildGarantiaPrompt(p: PromptParams): string {
  const fmt = (d: Date) => d.toLocaleDateString("pt-BR");
  const { status, dataFimLegal, dataFimContratual } = p.garantia;

  const decisaoTextoMap: Record<string, string> = {
    no_prazo:           "ACEITE — item dentro do prazo de garantia legal",
    somente_contratual: "ACEITE — item dentro do prazo de garantia contratual (prazo legal expirado)",
    fora_garantia:      "NEGATIVA — todos os prazos de garantia foram esgotados",
  };
  const decisaoTexto = decisaoTextoMap[status];

  return `Você é assessor jurídico especializado em Direito do Consumidor e Direito da Construção Civil.
Gere um PARECER TÉCNICO-JURÍDICO formal para o chamado de assistência técnica abaixo.

DADOS DO CHAMADO:
• Comprador: ${p.nomeComprador}
• Componente/Sistema: ${p.componenteNome}
• Descrição do defeito: ${p.descricaoDefeito}
• Data de entrega das chaves: ${p.dataEntregaChaves}
• Data de abertura do chamado: ${p.dataAbertura}
• Fim da garantia legal (${p.baseLegal}): ${fmt(dataFimLegal)}
• Fim da garantia contratual: ${fmt(dataFimContratual)}
• DECISÃO CALCULADA: ${decisaoTexto}

INSTRUÇÃO DE REDAÇÃO:
${status === "fora_garantia"
    ? `Redija uma NEGATIVA FORMAL. Cite que os prazos de garantia legal (${p.baseLegal}) e contratual foram esgotados nas datas indicadas. Mencione que o consumidor pode contratar reparos por conta própria. Tom: formal, técnico, respeitoso.`
    : `Redija um ACEITE DO CHAMADO. Informe que o item está dentro do prazo de garantia ${status === "no_prazo" ? "legal (" + p.baseLegal + ")" : "contratual"}. Informe que uma equipe técnica realizará vistoria em até 5 dias úteis. Tom: formal e prestativo.`
}

FORMATO OBRIGATÓRIO DE SAÍDA:
1. Cabeçalho: "PARECER DE ASSISTÊNCIA TÉCNICA"
2. Referências legais (art. do CDC / CC / NBR)
3. Fundamentação (2 parágrafos)
4. Decisão objetiva (1 parágrafo)
5. Assinatura: "Departamento Técnico"

Responda em português formal. Máximo 350 palavras. Não invente fatos além dos fornecidos.`;
}
