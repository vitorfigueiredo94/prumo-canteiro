export const STATUS_TERRENO = {
  disponivel: { label: "Disponível",  color: "var(--success-700)", bg: "var(--success-50)"  },
  em_obra:    { label: "Em obra",     color: "var(--warning-700)", bg: "var(--warning-50)"  },
  vendido:    { label: "Vendido",     color: "var(--fg-tertiary)", bg: "var(--ink-100)"     },
} as const;

export const STATUS_OBRA = {
  planejamento: { label: "Planejamento",  color: "var(--navy-600)",    bg: "var(--navy-50)"    },
  em_andamento: { label: "Em andamento",  color: "var(--success-700)", bg: "var(--success-50)" },
  parada:       { label: "Parada",        color: "var(--danger-500)",  bg: "var(--danger-50)"  },
  concluida:    { label: "Concluída",     color: "var(--fg-tertiary)", bg: "var(--ink-100)"    },
} as const;

export const STATUS_FUNCIONARIO = {
  ativo:   { label: "Ativo",   color: "var(--success-700)", bg: "var(--success-50)" },
  inativo: { label: "Inativo", color: "var(--fg-tertiary)", bg: "var(--ink-100)"    },
} as const;

export const STATUS_NF = {
  confirmada: { label: "Confirmada",  color: "var(--success-700)", bg: "var(--success-50)" },
  em_revisao: { label: "Em revisão",  color: "var(--warning-700)", bg: "var(--warning-50)" },
} as const;

export const CATEGORIA_NF = {
  material:     "Material",
  mao_obra:     "Mão de obra",
  servicos:     "Serviços",
  equipamentos: "Equipamentos",
  outros:       "Outros",
} as const;
