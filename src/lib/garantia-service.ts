export type GarantiaStatus = "no_prazo" | "somente_contratual" | "fora_garantia";

export interface GarantiaCheck {
  status: GarantiaStatus;
  emGarantiaLegal: boolean;
  emGarantiaContratual: boolean;
  dataFimLegal: Date;
  dataFimContratual: Date;
  diasRestantesLegal: number;
  diasRestantesContratual: number;
}

function addMeses(d: Date, meses: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() + meses);
  return r;
}

export function calcularGarantia(
  dataMarco: Date,
  dataAbertura: Date,
  prazoLegalMeses: number,
  prazoContratMeses: number
): GarantiaCheck {
  const fimLegal   = addMeses(dataMarco, prazoLegalMeses);
  const fimContrat = addMeses(dataMarco, prazoContratMeses);
  const MS_DIA = 86_400_000;

  const emLegal   = dataAbertura <= fimLegal;
  const emContrat = dataAbertura <= fimContrat;

  return {
    status: emLegal ? "no_prazo" : emContrat ? "somente_contratual" : "fora_garantia",
    emGarantiaLegal: emLegal,
    emGarantiaContratual: emContrat,
    dataFimLegal: fimLegal,
    dataFimContratual: fimContrat,
    diasRestantesLegal:      Math.ceil((fimLegal.getTime()   - dataAbertura.getTime()) / MS_DIA),
    diasRestantesContratual: Math.ceil((fimContrat.getTime() - dataAbertura.getTime()) / MS_DIA),
  };
}

// Componentes padrão NBR 15575 + CC + CDC
export const COMPONENTES_PADRAO = [
  { codigo: "estrutura",             nome: "Estrutura / Fundação",            prazoLegalMeses: 60,  prazoContratMeses: 60,  marcoInicial: "entrega_chaves", baseLegal: "CC art. 618" },
  { codigo: "impermeabilizacao",     nome: "Impermeabilização",               prazoLegalMeses: 60,  prazoContratMeses: 60,  marcoInicial: "entrega_chaves", baseLegal: "CC art. 618" },
  { codigo: "instalacoes_eletricas", nome: "Instalações Elétricas",           prazoLegalMeses: 24,  prazoContratMeses: 36,  marcoInicial: "entrega_chaves", baseLegal: "NBR 15575" },
  { codigo: "instalacoes_hidro",     nome: "Instalações Hidrossanitárias",    prazoLegalMeses: 24,  prazoContratMeses: 36,  marcoInicial: "entrega_chaves", baseLegal: "NBR 15575" },
  { codigo: "cobertura",             nome: "Cobertura / Telhado",             prazoLegalMeses: 60,  prazoContratMeses: 60,  marcoInicial: "entrega_chaves", baseLegal: "CC art. 618" },
  { codigo: "vedacoes",              nome: "Vedações / Alvenaria",            prazoLegalMeses: 36,  prazoContratMeses: 36,  marcoInicial: "entrega_chaves", baseLegal: "NBR 15575" },
  { codigo: "esquadrias",            nome: "Esquadrias (portas e janelas)",   prazoLegalMeses: 24,  prazoContratMeses: 24,  marcoInicial: "entrega_chaves", baseLegal: "NBR 15575" },
  { codigo: "acabamento",            nome: "Revestimentos e Acabamento",      prazoLegalMeses: 12,  prazoContratMeses: 12,  marcoInicial: "entrega_chaves", baseLegal: "NBR 15575" },
  { codigo: "pintura",               nome: "Pintura",                         prazoLegalMeses: 12,  prazoContratMeses: 12,  marcoInicial: "entrega_chaves", baseLegal: "NBR 15575" },
  { codigo: "vicio_aparente",        nome: "Vício Aparente (CDC)",            prazoLegalMeses:  3,  prazoContratMeses:  3,  marcoInicial: "entrega_chaves", baseLegal: "CDC art. 26, II" },
  { codigo: "vicio_oculto",          nome: "Vício Oculto (CDC)",              prazoLegalMeses: 60,  prazoContratMeses: 60,  marcoInicial: "entrega_chaves", baseLegal: "CDC art. 27" },
] as const;
