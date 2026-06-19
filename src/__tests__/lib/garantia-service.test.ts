import { describe, it, expect } from "vitest";
import { calcularGarantia, COMPONENTES_PADRAO } from "@/lib/garantia-service";

function makeDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

const MARCO = makeDate(2024, 1, 1); // 01/01/2024

describe("calcularGarantia — dentro da garantia legal", () => {
  it("abertura no mesmo dia do marco = no_prazo", () => {
    const r = calcularGarantia(MARCO, MARCO, 12, 24);
    expect(r.status).toBe("no_prazo");
    expect(r.emGarantiaLegal).toBe(true);
    expect(r.emGarantiaContratual).toBe(true);
  });

  it("abertura 11 meses depois do marco, prazo legal 12 meses = no_prazo", () => {
    const abertura = makeDate(2024, 12, 1);
    const r = calcularGarantia(MARCO, abertura, 12, 24);
    expect(r.status).toBe("no_prazo");
    expect(r.emGarantiaLegal).toBe(true);
  });
});

describe("calcularGarantia — somente garantia contratual", () => {
  it("fora do prazo legal mas dentro do contratual", () => {
    // marco 01/01/2024, legal 12m → fim legal 01/01/2025
    // abertura em 02/01/2025 = fora do legal (1 dia depois)
    // contratual 24m → fim 01/01/2026 = ainda dentro
    const abertura = makeDate(2025, 1, 2);
    const r = calcularGarantia(MARCO, abertura, 12, 24);
    expect(r.status).toBe("somente_contratual");
    expect(r.emGarantiaLegal).toBe(false);
    expect(r.emGarantiaContratual).toBe(true);
  });
});

describe("calcularGarantia — fora de garantia", () => {
  it("abertura após fim de ambos os prazos", () => {
    // marco 01/01/2024, legal 12m, contratual 24m
    // abertura em 02/01/2026 = fora de ambos
    const abertura = makeDate(2026, 1, 2);
    const r = calcularGarantia(MARCO, abertura, 12, 24);
    expect(r.status).toBe("fora_garantia");
    expect(r.emGarantiaLegal).toBe(false);
    expect(r.emGarantiaContratual).toBe(false);
  });
});

describe("calcularGarantia — campos calculados", () => {
  it("dataFimLegal é marco + prazoLegalMeses", () => {
    const r = calcularGarantia(MARCO, MARCO, 60, 60);
    const esperado = new Date(2024, 0, 1);
    esperado.setMonth(esperado.getMonth() + 60);
    expect(r.dataFimLegal.getFullYear()).toBe(esperado.getFullYear());
  });

  it("diasRestantesLegal positivo quando em garantia", () => {
    const abertura = makeDate(2024, 6, 1); // 6 meses depois
    const r = calcularGarantia(MARCO, abertura, 12, 24);
    expect(r.diasRestantesLegal).toBeGreaterThan(0);
    expect(r.diasRestantesContratual).toBeGreaterThan(0);
  });

  it("diasRestantesLegal negativo quando fora da legal", () => {
    const abertura = makeDate(2025, 3, 1);
    const r = calcularGarantia(MARCO, abertura, 12, 24);
    expect(r.diasRestantesLegal).toBeLessThan(0);
    expect(r.diasRestantesContratual).toBeGreaterThan(0);
  });
});

describe("COMPONENTES_PADRAO", () => {
  it("tem 11 componentes", () => {
    expect(COMPONENTES_PADRAO).toHaveLength(11);
  });

  it("estrutura/fundação tem prazo legal de 60 meses (CC art. 618)", () => {
    const estrutura = COMPONENTES_PADRAO.find((c) => c.codigo === "estrutura");
    expect(estrutura).toBeDefined();
    expect(estrutura!.prazoLegalMeses).toBe(60);
    expect(estrutura!.baseLegal).toContain("618");
  });

  it("vício aparente (CDC) tem prazo de 3 meses", () => {
    const vicio = COMPONENTES_PADRAO.find((c) => c.codigo === "vicio_aparente");
    expect(vicio).toBeDefined();
    expect(vicio!.prazoLegalMeses).toBe(3);
    expect(vicio!.baseLegal).toContain("CDC");
  });

  it("todos os componentes têm código e nome definidos", () => {
    for (const c of COMPONENTES_PADRAO) {
      expect(c.codigo).toBeTruthy();
      expect(c.nome).toBeTruthy();
      expect(c.prazoLegalMeses).toBeGreaterThan(0);
      expect(c.prazoContratMeses).toBeGreaterThan(0);
    }
  });

  it("impermeabilização tem 60 meses como NBR/CC", () => {
    const imp = COMPONENTES_PADRAO.find((c) => c.codigo === "impermeabilizacao");
    expect(imp!.prazoLegalMeses).toBe(60);
  });

  it("pintura e acabamento têm 12 meses", () => {
    const pintura = COMPONENTES_PADRAO.find((c) => c.codigo === "pintura");
    const acabamento = COMPONENTES_PADRAO.find((c) => c.codigo === "acabamento");
    expect(pintura!.prazoLegalMeses).toBe(12);
    expect(acabamento!.prazoLegalMeses).toBe(12);
  });
});
