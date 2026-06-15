export const TIPO_CHECKLIST = {
  OBRA_INICIO: "OBRA_INICIO",
  OBRA_MEIO: "OBRA_MEIO",
  OBRA_FIM: "OBRA_FIM",
  TERRENO_PREPARACAO: "TERRENO_PREPARACAO",
  TERRENO_ANALISE: "TERRENO_ANALISE",
  TERRENO_PROPOSTA: "TERRENO_PROPOSTA",
  TERRENO_POS_VENDA: "TERRENO_POS_VENDA",
} as const;

export type TipoChecklist = keyof typeof TIPO_CHECKLIST;

export const FLUXO_OBRA: TipoChecklist[] = [
  "OBRA_INICIO",
  "OBRA_MEIO",
  "OBRA_FIM",
];

export const FLUXO_TERRENO: TipoChecklist[] = [
  "TERRENO_PREPARACAO",
  "TERRENO_ANALISE",
  "TERRENO_PROPOSTA",
  "TERRENO_POS_VENDA",
];

export const TEMPLATES = [
  {
    tipo: "OBRA_INICIO" as TipoChecklist,
    nome: "Início da Obra",
    ordem: 1,
    itens: [
      "Alvará de construção emitido",
      "Matrícula do imóvel atualizada",
      "Projetos executivos aprovados",
      "ART/RRT registrada",
      "Tapumes instalados",
      "Água provisória ligada",
      "Luz provisória ligada",
      "EPIs fornecidos a todos os trabalhadores",
      "Placa de obra afixada",
      "Locação e gabarito executados",
    ],
  },
  {
    tipo: "OBRA_MEIO" as TipoChecklist,
    nome: "Obra em Andamento",
    ordem: 2,
    itens: [
      "Validação de estacas concluída",
      "Ferragem e espaçadores conferidos",
      "Ensaio de resistência (Fck) realizado",
      "Prumo e nível verificados",
      "Teste de estanqueidade aprovado",
      "Caimento de ralos conferido",
      "Impermeabilização (lâmina d'água) aplicada",
      "Paginação de pisos e revestimentos definida",
    ],
  },
  {
    tipo: "OBRA_FIM" as TipoChecklist,
    nome: "Entrega da Obra",
    ordem: 3,
    itens: [
      "Teste de escoamento hidráulico aprovado",
      "Teste elétrico e aterramento aprovado",
      "Pintura e esquadrias finalizadas",
      "Limpeza pós-obra realizada",
      "Habite-se obtido",
      "CND INSS emitida",
      "Averbação na matrícula realizada",
      "Manual do proprietário entregue",
    ],
  },
  {
    tipo: "TERRENO_PREPARACAO" as TipoChecklist,
    nome: "Preparação para Venda",
    ordem: 1,
    itens: [
      "Demarcação e piquetes instalados",
      "Fotos e drone realizados",
      "Matrícula atualizada (verificação de ônus)",
      "IPTU em dia",
      "Certidão de zoneamento obtida",
    ],
  },
  {
    tipo: "TERRENO_ANALISE" as TipoChecklist,
    nome: "Análise Documental",
    ordem: 2,
    itens: [
      "Ficha do comprador preenchida",
      "Análise de crédito realizada",
      "Documentos do comprador verificados",
    ],
  },
  {
    tipo: "TERRENO_PROPOSTA" as TipoChecklist,
    nome: "Proposta e Contrato",
    ordem: 3,
    itens: [
      "Proposta formal enviada ao comprador",
      "Contrato de compra e venda assinado",
      "Entrada recebida e confirmada",
    ],
  },
  {
    tipo: "TERRENO_POS_VENDA" as TipoChecklist,
    nome: "Pós-Venda",
    ordem: 4,
    itens: [
      "ITBI recolhido",
      "Escritura lavrada em cartório",
      "Registro da escritura na matrícula",
    ],
  },
] as const;
