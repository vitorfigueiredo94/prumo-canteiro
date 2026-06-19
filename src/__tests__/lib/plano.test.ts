import { describe, it, expect } from "vitest";
import {
  temRecurso, dentroDoLimiteObras, dentroDoLimiteUsuarios,
  RECURSO,
} from "@/lib/plano";
import type { PlanoInfo } from "@/lib/plano";

const TRIAL: PlanoInfo = {
  planoNome: "Trial",
  limiteObras: null,
  limiteUsuarios: null,
  recursos: Object.values(RECURSO),
  status: "trial",
  isTrial: true,
};

const BASICO: PlanoInfo = {
  planoNome: "Básico",
  limiteObras: 3,
  limiteUsuarios: 2,
  recursos: [],
  status: "ativo",
  isTrial: false,
};

const PROFISSIONAL: PlanoInfo = {
  planoNome: "Profissional",
  limiteObras: 15,
  limiteUsuarios: 5,
  recursos: ["vendas", "fluxo_caixa", "diario", "relatorios"],
  status: "ativo",
  isTrial: false,
};

const CANCELADO: PlanoInfo = {
  planoNome: "Cancelado",
  limiteObras: 0,
  limiteUsuarios: 0,
  recursos: [],
  status: "cancelado",
  isTrial: false,
};

describe("temRecurso — Trial (acesso total)", () => {
  it("trial tem acesso a vendas", () => {
    expect(temRecurso(TRIAL, RECURSO.VENDAS)).toBe(true);
  });
  it("trial tem acesso a fluxo_caixa", () => {
    expect(temRecurso(TRIAL, RECURSO.FLUXO_CAIXA)).toBe(true);
  });
  it("trial tem acesso a todos os recursos", () => {
    for (const slug of Object.values(RECURSO)) {
      expect(temRecurso(TRIAL, slug)).toBe(true);
    }
  });
});

describe("temRecurso — Básico (sem recursos extras)", () => {
  it("básico não tem vendas", () => {
    expect(temRecurso(BASICO, RECURSO.VENDAS)).toBe(false);
  });
  it("básico não tem fluxo_caixa", () => {
    expect(temRecurso(BASICO, RECURSO.FLUXO_CAIXA)).toBe(false);
  });
  it("básico não tem diário", () => {
    expect(temRecurso(BASICO, RECURSO.DIARIO)).toBe(false);
  });
});

describe("temRecurso — Profissional", () => {
  it("profissional tem vendas", () => {
    expect(temRecurso(PROFISSIONAL, RECURSO.VENDAS)).toBe(true);
  });
  it("profissional tem fluxo_caixa", () => {
    expect(temRecurso(PROFISSIONAL, RECURSO.FLUXO_CAIXA)).toBe(true);
  });
  it("profissional não tem multiusuario_avancado", () => {
    expect(temRecurso(PROFISSIONAL, RECURSO.MULTIUSUARIO)).toBe(false);
  });
});

describe("temRecurso — Cancelado", () => {
  it("cancelado não tem acesso a nenhum recurso", () => {
    for (const slug of Object.values(RECURSO)) {
      expect(temRecurso(CANCELADO, slug)).toBe(false);
    }
  });
});

describe("dentroDoLimiteObras", () => {
  it("ilimitado (null) sempre permite", () => {
    expect(dentroDoLimiteObras(TRIAL, 9999)).toBe(true);
  });
  it("dentro do limite", () => {
    expect(dentroDoLimiteObras(BASICO, 2)).toBe(true);
  });
  it("exatamente no limite = não permite (já atingiu)", () => {
    expect(dentroDoLimiteObras(BASICO, 3)).toBe(false);
  });
  it("acima do limite", () => {
    expect(dentroDoLimiteObras(BASICO, 5)).toBe(false);
  });
  it("zero obras com limite 0 = não permite", () => {
    expect(dentroDoLimiteObras(CANCELADO, 0)).toBe(false);
  });
});

describe("dentroDoLimiteUsuarios", () => {
  it("ilimitado (null) sempre permite", () => {
    expect(dentroDoLimiteUsuarios(TRIAL, 9999)).toBe(true);
  });
  it("dentro do limite", () => {
    expect(dentroDoLimiteUsuarios(BASICO, 1)).toBe(true);
  });
  it("exatamente no limite = não permite", () => {
    expect(dentroDoLimiteUsuarios(BASICO, 2)).toBe(false);
  });
  it("acima do limite", () => {
    expect(dentroDoLimiteUsuarios(PROFISSIONAL, 10)).toBe(false);
  });
});

describe("RECURSO enum", () => {
  it("contém os 6 recursos esperados", () => {
    expect(Object.keys(RECURSO)).toHaveLength(6);
    expect(RECURSO.VENDAS).toBe("vendas");
    expect(RECURSO.FLUXO_CAIXA).toBe("fluxo_caixa");
    expect(RECURSO.DIARIO).toBe("diario");
    expect(RECURSO.RELATORIOS).toBe("relatorios");
    expect(RECURSO.MULTIUSUARIO).toBe("multiusuario_avancado");
    expect(RECURSO.BACKUP).toBe("backup_exportacao");
  });
});
