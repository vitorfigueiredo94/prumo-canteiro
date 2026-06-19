/**
 * Testes das regras de negócio de inadimplência.
 *
 * A regra do domínio: Parcela.status NUNCA é "atrasada".
 * Atraso = status "aberta" + vencimento < hoje.
 * Faixas: 1–15d | 16–30d | 31–60d | +60d.
 */
import { describe, it, expect } from "vitest";

// ── Lógica copiada de financeiro-view.tsx (regra de negócio pura) ──────────

type ParcelaVencida = {
  id: string;
  valor: number;
  vencimento: string | null;
  numero: number;
  nomeComprador: string;
};

function diasAtraso(vencimento: string | null, hoje: Date = new Date()): number {
  if (!vencimento) return 0;
  return Math.max(0, Math.floor((hoje.getTime() - new Date(vencimento).getTime()) / 86_400_000));
}

type BucketKey = "1-15" | "16-30" | "31-60" | "+60";

function classificarBucket(dias: number): BucketKey {
  if (dias <= 15) return "1-15";
  if (dias <= 30) return "16-30";
  if (dias <= 60) return "31-60";
  return "+60";
}

function calcularBuckets(parcelas: ParcelaVencida[], hoje: Date) {
  const buckets: Record<BucketKey, { count: number; valor: number }> = {
    "1-15":  { count: 0, valor: 0 },
    "16-30": { count: 0, valor: 0 },
    "31-60": { count: 0, valor: 0 },
    "+60":   { count: 0, valor: 0 },
  };
  for (const p of parcelas) {
    const d = diasAtraso(p.vencimento, hoje);
    const key = classificarBucket(d);
    buckets[key].count++;
    buckets[key].valor += p.valor;
  }
  return buckets;
}

function calcularTaxaInadimplencia(totalVencido: number, totalPago: number): number {
  const total = totalVencido + totalPago;
  return total > 0 ? (totalVencido / total) * 100 : 0;
}

function rankDevedores(parcelas: ParcelaVencida[]) {
  const map: Record<string, { valor: number; parcelas: number }> = {};
  for (const p of parcelas) {
    if (!map[p.nomeComprador]) map[p.nomeComprador] = { valor: 0, parcelas: 0 };
    map[p.nomeComprador].valor += p.valor;
    map[p.nomeComprador].parcelas++;
  }
  return Object.entries(map).sort((a, b) => b[1].valor - a[1].valor);
}

// ── Fixtures ─────────────────────────────────────────────────────────────────

const HOJE = new Date("2026-06-19T12:00:00.000Z");

function dataDiasAtras(dias: number): string {
  const d = new Date(HOJE);
  d.setDate(d.getDate() - dias);
  return d.toISOString();
}

const PARCELAS: ParcelaVencida[] = [
  { id: "1", valor: 1000, vencimento: dataDiasAtras(5),  numero: 1, nomeComprador: "Ana" },
  { id: "2", valor: 2000, vencimento: dataDiasAtras(20), numero: 2, nomeComprador: "Bruno" },
  { id: "3", valor: 3000, vencimento: dataDiasAtras(45), numero: 3, nomeComprador: "Ana" },
  { id: "4", valor: 5000, vencimento: dataDiasAtras(90), numero: 1, nomeComprador: "Carlos" },
  { id: "5", valor: 1500, vencimento: dataDiasAtras(12), numero: 4, nomeComprador: "Ana" },
];

// ── Testes ───────────────────────────────────────────────────────────────────

describe("diasAtraso", () => {
  it("retorna 0 para vencimento null", () => {
    expect(diasAtraso(null, HOJE)).toBe(0);
  });
  it("retorna 5 para vencimento 5 dias atrás", () => {
    expect(diasAtraso(dataDiasAtras(5), HOJE)).toBe(5);
  });
  it("retorna 0 para vencimento hoje (não está atrasado)", () => {
    expect(diasAtraso(HOJE.toISOString(), HOJE)).toBe(0);
  });
  it("não retorna negativo para datas futuras", () => {
    const futuro = new Date(HOJE);
    futuro.setDate(futuro.getDate() + 10);
    expect(diasAtraso(futuro.toISOString(), HOJE)).toBe(0);
  });
});

describe("classificarBucket", () => {
  it("1 dia → 1-15", ()  => expect(classificarBucket(1)).toBe("1-15"));
  it("15 dias → 1-15", () => expect(classificarBucket(15)).toBe("1-15"));
  it("16 dias → 16-30", () => expect(classificarBucket(16)).toBe("16-30"));
  it("30 dias → 16-30", () => expect(classificarBucket(30)).toBe("16-30"));
  it("31 dias → 31-60", () => expect(classificarBucket(31)).toBe("31-60"));
  it("60 dias → 31-60", () => expect(classificarBucket(60)).toBe("31-60"));
  it("61 dias → +60",   () => expect(classificarBucket(61)).toBe("+60"));
  it("200 dias → +60",  () => expect(classificarBucket(200)).toBe("+60"));
});

describe("calcularBuckets", () => {
  it("distribui corretamente nas faixas", () => {
    const b = calcularBuckets(PARCELAS, HOJE);
    // 5d (Ana) e 12d (Ana) → 1-15 (2 parcelas, R$ 2.500)
    expect(b["1-15"].count).toBe(2);
    expect(b["1-15"].valor).toBe(2500);
    // 20d (Bruno) → 16-30
    expect(b["16-30"].count).toBe(1);
    expect(b["16-30"].valor).toBe(2000);
    // 45d (Ana) → 31-60
    expect(b["31-60"].count).toBe(1);
    expect(b["31-60"].valor).toBe(3000);
    // 90d (Carlos) → +60
    expect(b["+60"].count).toBe(1);
    expect(b["+60"].valor).toBe(5000);
  });

  it("retorna zeros para carteira limpa", () => {
    const b = calcularBuckets([], HOJE);
    expect(b["1-15"].count).toBe(0);
    expect(b["+60"].valor).toBe(0);
  });

  it("valor total é soma de todas as faixas", () => {
    const b = calcularBuckets(PARCELAS, HOJE);
    const total = Object.values(b).reduce((s, v) => s + v.valor, 0);
    const expected = PARCELAS.reduce((s, p) => s + p.valor, 0);
    expect(total).toBe(expected);
  });
});

describe("calcularTaxaInadimplencia", () => {
  it("retorna 0% quando não há inadimplência", () => {
    expect(calcularTaxaInadimplencia(0, 10000)).toBe(0);
  });
  it("retorna 100% quando nada foi pago", () => {
    expect(calcularTaxaInadimplencia(5000, 0)).toBe(100);
  });
  it("retorna 50% para valores iguais", () => {
    expect(calcularTaxaInadimplencia(5000, 5000)).toBe(50);
  });
  it("retorna 0% quando tudo é zero (sem divisão por zero)", () => {
    expect(calcularTaxaInadimplencia(0, 0)).toBe(0);
  });
  it("calcula corretamente ~33%", () => {
    const taxa = calcularTaxaInadimplencia(3000, 6000);
    expect(taxa).toBeCloseTo(33.33, 1);
  });
});

describe("rankDevedores", () => {
  it("ordena por valor decrescente", () => {
    const rank = rankDevedores(PARCELAS);
    // Ana: 1000+3000+1500 = 5500
    // Carlos: 5000
    // Bruno: 2000
    expect(rank[0][0]).toBe("Ana");
    expect(rank[0][1].valor).toBe(5500);
    expect(rank[1][0]).toBe("Carlos");
    expect(rank[1][1].valor).toBe(5000);
    expect(rank[2][0]).toBe("Bruno");
  });

  it("conta parcelas por devedor", () => {
    const rank = rankDevedores(PARCELAS);
    const ana = rank.find(([nome]) => nome === "Ana");
    expect(ana![1].parcelas).toBe(3);
    const carlos = rank.find(([nome]) => nome === "Carlos");
    expect(carlos![1].parcelas).toBe(1);
  });

  it("retorna array vazio para carteira limpa", () => {
    expect(rankDevedores([])).toHaveLength(0);
  });
});
