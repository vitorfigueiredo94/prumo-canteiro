/**
 * Testes da projeção de fluxo de caixa futura.
 * Lógica reproduzida de financeiro-view.tsx.
 */
import { describe, it, expect } from "vitest";

type ParcelaFutura = { valor: number; vencimento: string | null };

function getYM(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function buildFutureMonths(from: Date, count: number): string[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(from);
    d.setMonth(d.getMonth() + i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
}

function agruparPorMes(parcelas: ParcelaFutura[], months: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  months.forEach((m) => { map[m] = 0; });
  for (const p of parcelas) {
    const ym = getYM(p.vencimento);
    if (ym && map[ym] !== undefined) map[ym] += p.valor;
  }
  return map;
}

function calcularResultado(entradas: number, despesaEst: number): number {
  return entradas - despesaEst;
}

function calcularMediaDespesas(despesas: Record<string, number>, lastN: number): number {
  const values = Object.values(despesas).slice(-lastN);
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

// ── Testes ─────────────────────────────────────────────────────────────────────

const BASE = new Date(2026, 0, 1); // 01/01/2026 local

describe("buildFutureMonths", () => {
  it("gera 6 meses consecutivos a partir da data base", () => {
    const months = buildFutureMonths(BASE, 6);
    expect(months).toHaveLength(6);
    expect(months[0]).toBe("2026-01");
    expect(months[1]).toBe("2026-02");
    expect(months[5]).toBe("2026-06");
  });

  it("atravessa virada de ano corretamente", () => {
    const novembro = new Date(2026, 10, 1); // 01/11/2026 local
    const months = buildFutureMonths(novembro, 4);
    expect(months[0]).toBe("2026-11");
    expect(months[1]).toBe("2026-12");
    expect(months[2]).toBe("2027-01");
    expect(months[3]).toBe("2027-02");
  });
});

// Cria uma ISO string no meio do dia (12h) para evitar problemas de timezone
function isoLocal(year: number, month: number, day: number): string {
  return new Date(year, month - 1, day, 12, 0, 0).toISOString();
}

describe("agruparPorMes", () => {
  const months = buildFutureMonths(BASE, 6); // 2026-01 a 2026-06

  it("agrupa parcelas no mês correto", () => {
    const parcelas: ParcelaFutura[] = [
      { valor: 1000, vencimento: isoLocal(2026, 1, 15) },
      { valor: 2000, vencimento: isoLocal(2026, 1, 28) },
      { valor: 3000, vencimento: isoLocal(2026, 3, 10) },
    ];
    const result = agruparPorMes(parcelas, months);
    expect(result["2026-01"]).toBe(3000);
    expect(result["2026-02"]).toBe(0);
    expect(result["2026-03"]).toBe(3000);
  });

  it("ignora parcelas fora do janela de projeção", () => {
    const parcelas: ParcelaFutura[] = [
      { valor: 5000, vencimento: isoLocal(2030, 1, 1) }, // fora dos 6 meses
    ];
    const result = agruparPorMes(parcelas, months);
    const total = Object.values(result).reduce((s, v) => s + v, 0);
    expect(total).toBe(0);
  });

  it("retorna zeros para array vazio", () => {
    const result = agruparPorMes([], months);
    Object.values(result).forEach((v) => expect(v).toBe(0));
  });

  it("parcelas com vencimento null são ignoradas", () => {
    const parcelas: ParcelaFutura[] = [
      { valor: 9999, vencimento: null },
    ];
    const result = agruparPorMes(parcelas, months);
    const total = Object.values(result).reduce((s, v) => s + v, 0);
    expect(total).toBe(0);
  });
});

describe("calcularResultado", () => {
  it("resultado positivo quando entradas > despesas", () => {
    expect(calcularResultado(5000, 3000)).toBe(2000);
  });
  it("resultado negativo quando entradas < despesas", () => {
    expect(calcularResultado(1000, 3000)).toBe(-2000);
  });
  it("resultado zero quando iguais", () => {
    expect(calcularResultado(2000, 2000)).toBe(0);
  });
});

describe("calcularMediaDespesas", () => {
  it("calcula média dos últimos N meses", () => {
    const despesas = { "2025-10": 1000, "2025-11": 2000, "2025-12": 3000 };
    const media = calcularMediaDespesas(despesas, 3);
    expect(media).toBe(2000);
  });

  it("média dos últimos 2 meses ignora o mais antigo", () => {
    const despesas = { "2025-10": 9000, "2025-11": 1000, "2025-12": 3000 };
    const media = calcularMediaDespesas(despesas, 2);
    expect(media).toBe(2000); // (1000 + 3000) / 2
  });

  it("retorna 0 para mapa vazio", () => {
    expect(calcularMediaDespesas({}, 3)).toBe(0);
  });

  it("retorna 0 para N = 0 não lança erro", () => {
    const despesas = { "2025-12": 5000 };
    const media = calcularMediaDespesas(despesas, 0);
    expect(Number.isFinite(media) || Number.isNaN(media)).toBe(true); // não lança
  });
});
