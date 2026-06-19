import { prisma } from "@/lib/prisma";

// Slugs de recursos — o superadmin cadastra esses valores no campo "Recursos" de cada plano.
// Básico:        recursos: []
// Profissional:  recursos: ["vendas","fluxo_caixa","diario","relatorios"]
// Empresarial:   recursos: ["vendas","fluxo_caixa","diario","relatorios","multiusuario_avancado","backup_exportacao"]
export const RECURSO = {
  VENDAS:               "vendas",
  FLUXO_CAIXA:          "fluxo_caixa",
  DIARIO:               "diario",
  RELATORIOS:           "relatorios",
  MULTIUSUARIO:         "multiusuario_avancado",
  BACKUP:               "backup_exportacao",
} as const;

export type RecursoSlug = (typeof RECURSO)[keyof typeof RECURSO];

export interface PlanoInfo {
  planoNome: string;
  limiteObras: number | null;       // null = ilimitado
  limiteUsuarios: number | null;    // null = ilimitado
  recursos: string[];               // slugs incluídos no plano
  status: string;                   // trial | ativo | inadimplente | cancelado | trial_expirado
  isTrial: boolean;
  trialExpirado: boolean;
}

const TRIAL_INFO: PlanoInfo = {
  planoNome: "Trial",
  limiteObras: null,
  limiteUsuarios: null,
  recursos: Object.values(RECURSO),
  status: "trial",
  isTrial: true,
  trialExpirado: false,
};

export async function getPlanoEmpresa(empresaId: string): Promise<PlanoInfo> {
  try {
    const assinatura = await prisma.assinatura.findUnique({
      where: { empresaId },
      include: { plano: true },
    });

    if (!assinatura) return TRIAL_INFO;

    if (assinatura.status === "trial_expirado") {
      return {
        planoNome: "Trial expirado",
        limiteObras: 0,
        limiteUsuarios: 0,
        recursos: [],
        status: "trial_expirado",
        isTrial: false,
        trialExpirado: true,
      };
    }

    if (assinatura.status === "cancelado") {
      return {
        planoNome: "Cancelado",
        limiteObras: 0,
        limiteUsuarios: 0,
        recursos: [],
        status: "cancelado",
        isTrial: false,
        trialExpirado: false,
      };
    }

    const plano = assinatura.plano;
    let recursos: string[] = [];
    try { recursos = JSON.parse(plano.recursos); } catch {}

    return {
      planoNome: plano.nome,
      limiteObras: plano.limiteObras,
      limiteUsuarios: plano.limiteUsuarios,
      recursos,
      status: assinatura.status,
      isTrial: assinatura.status === "trial",
      trialExpirado: false,
    };
  } catch {
    return TRIAL_INFO;
  }
}

export function temRecurso(plano: PlanoInfo, recurso: RecursoSlug): boolean {
  if (plano.isTrial) return true;
  if (plano.status === "cancelado" || plano.trialExpirado) return false;
  return plano.recursos.includes(recurso);
}

export function dentroDoLimiteObras(plano: PlanoInfo, atual: number): boolean {
  if (plano.limiteObras === null) return true;
  return atual < plano.limiteObras;
}

export function dentroDoLimiteUsuarios(plano: PlanoInfo, atual: number): boolean {
  if (plano.limiteUsuarios === null) return true;
  return atual < plano.limiteUsuarios;
}
