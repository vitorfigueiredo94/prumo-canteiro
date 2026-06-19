import { describe, it, expect } from "vitest";
import { fmtBRL, fmtBRLshort, fmtDate, fmtArea, fmtPercent } from "@/lib/format";

describe("fmtBRL", () => {
  it("formata zero", () => {
    expect(fmtBRL(0)).toMatch(/R\$\s*0/);
  });
  it("formata valor positivo", () => {
    const r = fmtBRL(1500.5);
    expect(r).toContain("1.500");
    expect(r).toContain("50");
  });
  it("aceita string numérica", () => {
    expect(fmtBRL("2500")).toContain("2.500");
  });
  it("retorna zero para null", () => {
    expect(fmtBRL(null)).toMatch(/R\$\s*0/);
  });
  it("retorna zero para undefined", () => {
    expect(fmtBRL(undefined)).toMatch(/R\$\s*0/);
  });
});

describe("fmtBRLshort", () => {
  it("valores abaixo de 1000 usa formato completo", () => {
    expect(fmtBRLshort(500)).toMatch(/R\$/);
  });
  it("valores entre 1000 e 999999 usa 'mil'", () => {
    expect(fmtBRLshort(1000)).toContain("mil");
    expect(fmtBRLshort(250_000)).toContain("250 mil");
    expect(fmtBRLshort(999_000)).toContain("999 mil");
  });
  it("1 milhão usa 'M'", () => {
    expect(fmtBRLshort(1_000_000)).toContain("1,0M");
  });
  it("1.5 milhões", () => {
    expect(fmtBRLshort(1_500_000)).toContain("1,5M");
  });
  it("10 milhões", () => {
    expect(fmtBRLshort(10_000_000)).toContain("10,0M");
  });
  it("retorna zero para null", () => {
    expect(fmtBRLshort(null)).toMatch(/R\$\s*0/);
  });
});

describe("fmtDate", () => {
  it("retorna '—' para null", () => {
    expect(fmtDate(null)).toBe("—");
  });
  it("retorna '—' para undefined", () => {
    expect(fmtDate(undefined)).toBe("—");
  });
  it("formata uma data string ISO", () => {
    const result = fmtDate("2025-06-15T00:00:00.000Z");
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(result).toContain("2025");
  });
  it("formata um objeto Date", () => {
    const d = new Date(2025, 0, 1); // 1 Jan 2025
    const result = fmtDate(d);
    expect(result).toContain("2025");
    expect(result).toMatch(/01\/01\/2025/);
  });
});

describe("fmtArea", () => {
  it("formata area em m²", () => {
    expect(fmtArea(500)).toContain("m²");
    expect(fmtArea(500)).toContain("500");
  });
  it("retorna zero para null", () => {
    expect(fmtArea(null)).toContain("0");
    expect(fmtArea(null)).toContain("m²");
  });
  it("formata decimais", () => {
    const r = fmtArea(125.5);
    expect(r).toContain("125");
    expect(r).toContain("m²");
  });
});

describe("fmtPercent", () => {
  it("adiciona %", () => {
    expect(fmtPercent(75)).toBe("75%");
    expect(fmtPercent(0)).toBe("0%");
    expect(fmtPercent(100)).toBe("100%");
  });
});
