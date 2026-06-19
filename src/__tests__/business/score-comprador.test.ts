/**
 * Testes do score interno do comprador.
 * Fórmula (do Obsidian MOC):
 *   score = Math.max(0, Math.round((noPrazo.length / vencidas.length) * 100) - emAtraso.length * 8)
 *
 * Classificações:
 *   ≥ 85 → Excelente (verde)
 *   ≥ 70 → Bom (âmbar)
 *   ≥ 50 → Regular (laranja)
 *   < 50 → Crítico (vermelho)
 */
import { describe, it, expect } from "vitest";

// ── Lógica extraída do terreno-detail.tsx (reproduzida aqui como regra pura) ─

function calcularScore(noPrazo: unknown[], emAtraso: unknown[]): number {
  const vencidas = [...noPrazo, ...emAtraso];
  if (vencidas.length === 0) return 100; // sem parcelas = score máximo
  return Math.max(
    0,
    Math.round((noPrazo.length / vencidas.length) * 100) - emAtraso.length * 8
  );
}

type Classificacao = "Excelente" | "Bom" | "Regular" | "Crítico";

function classificarScore(score: number): Classificacao {
  if (score >= 85) return "Excelente";
  if (score >= 70) return "Bom";
  if (score >= 50) return "Regular";
  return "Crítico";
}

// ── Helpers para criar arrays de parcelas fictícias ───────────────────────────
const p = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i }));

// ── Testes ───────────────────────────────────────────────────────────────────

describe("calcularScore — casos extremos", () => {
  it("sem parcelas = 100", () => {
    expect(calcularScore([], [])).toBe(100);
  });
  it("todas em dia, sem atraso = 100", () => {
    expect(calcularScore(p(10), [])).toBe(100);
  });
  it("nenhuma em dia (todas atrasadas) → muito baixo ou zero", () => {
    const score = calcularScore([], p(5));
    expect(score).toBe(0); // 0/5 * 100 - 5*8 = 0-40 → max(0, -40) = 0
  });
});

describe("calcularScore — cenários típicos", () => {
  it("comprador excelente: 9/10 em dia, 1 atrasada", () => {
    // 9/10 * 100 = 90 - 1*8 = 82 → Bom (não Excelente por causa da penalidade)
    const score = calcularScore(p(9), p(1));
    expect(score).toBe(82);
    expect(classificarScore(score)).toBe("Bom");
  });

  it("comprador excelente: 10/10 em dia, 0 atrasada = 100", () => {
    const score = calcularScore(p(10), []);
    expect(score).toBe(100);
    expect(classificarScore(score)).toBe("Excelente");
  });

  it("comprador regular: 6/10 em dia, 4 atrasadas", () => {
    // 6/10 * 100 = 60 - 4*8 = 60 - 32 = 28 → Crítico
    const score = calcularScore(p(6), p(4));
    expect(score).toBe(28);
    expect(classificarScore(score)).toBe("Crítico");
  });

  it("score nunca fica negativo", () => {
    const score = calcularScore([], p(50));
    expect(score).toBeGreaterThanOrEqual(0);
  });
});

describe("calcularScore — mais casos de fronteira", () => {
  it("8/10 em dia, 2 atrasadas = 64", () => {
    // 8/10 * 100 = 80 - 2*8 = 80 - 16 = 64 → Regular
    const score = calcularScore(p(8), p(2));
    expect(score).toBe(64);
    expect(classificarScore(score)).toBe("Regular");
  });

  it("5/5 em dia, 0 atrasada = 100", () => {
    const score = calcularScore(p(5), []);
    expect(score).toBe(100);
  });

  it("1/1 em dia, 0 atrasada = 100", () => {
    expect(calcularScore(p(1), [])).toBe(100);
  });
});

describe("classificarScore", () => {
  it("100 → Excelente", () => expect(classificarScore(100)).toBe("Excelente"));
  it("85 → Excelente (limite)", () => expect(classificarScore(85)).toBe("Excelente"));
  it("84 → Bom (fronteira)", () => expect(classificarScore(84)).toBe("Bom"));
  it("70 → Bom (limite)", () => expect(classificarScore(70)).toBe("Bom"));
  it("69 → Regular (fronteira)", () => expect(classificarScore(69)).toBe("Regular"));
  it("50 → Regular (limite)", () => expect(classificarScore(50)).toBe("Regular"));
  it("49 → Crítico (fronteira)", () => expect(classificarScore(49)).toBe("Crítico"));
  it("0 → Crítico", () => expect(classificarScore(0)).toBe("Crítico"));
});
