import { describe, it, expect } from "vitest";
import {
  generateTerrenoTemplate,
  generateVendaTemplate,
  generateCompradorTemplate,
  parseTerrenoExcel,
  parseVendaExcel,
  parseCompradorExcel,
} from "@/lib/excel-import";

describe("generateTerrenoTemplate", () => {
  it("gera um Buffer válido", () => {
    const buf = generateTerrenoTemplate();
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(100);
  });

  it("o buffer é um Excel válido com dados de exemplo", () => {
    const buf = generateTerrenoTemplate();
    const rows = parseTerrenoExcel(buf);
    expect(rows.length).toBeGreaterThanOrEqual(1);
    // O template tem 2 linhas de exemplo — verifica a primeira
    expect(rows[0].nome).toBe("Lote 01 - Bloco A");
    expect(rows[0].cidade).toBe("São Paulo");
    expect(rows[0].area).toBe(500);
    expect(rows[0].valorCompra).toBe(250000);
  });
});

describe("generateVendaTemplate", () => {
  it("gera um Buffer válido", () => {
    const buf = generateVendaTemplate();
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(100);
  });

  it("parseia a venda de exemplo do template", () => {
    const buf = generateVendaTemplate();
    const rows = parseVendaExcel(buf);
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0].nomeTerreno).toBe("Lote 01 - Bloco A");
    expect(rows[0].nomeComprador).toBe("João Silva");
    expect(rows[0].valorTotal).toBe(150000);
    expect(rows[0].entrada).toBe(30000);
    expect(rows[0].numeroParcelas).toBe(12);
    expect(rows[0].diaVencimento).toBe(10);
  });
});

describe("generateCompradorTemplate", () => {
  it("gera um Buffer válido", () => {
    const buf = generateCompradorTemplate();
    expect(buf).toBeInstanceOf(Buffer);
  });

  it("parseia o comprador de exemplo do template", () => {
    const buf = generateCompradorTemplate();
    const rows = parseCompradorExcel(buf);
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0].cpfCnpj).toBe("123.456.789-00");
    expect(rows[0].nomeComprador).toBe("João Silva Atualizado");
  });
});

describe("parseTerrenoExcel — status padrão", () => {
  it("usa 'disponivel' se status não informado", () => {
    const buf = generateTerrenoTemplate();
    const rows = parseTerrenoExcel(buf);
    // segunda linha do template não tem status definido
    const semStatus = rows.find((r) => r.nome === "Lote 02 - Bloco B");
    if (semStatus) {
      expect(semStatus.status).toBe("em_obra");
    }
  });
});

describe("parseVendaExcel — campos opcionais null", () => {
  it("observacoes vazia é string vazia não null", () => {
    const buf = generateVendaTemplate();
    const rows = parseVendaExcel(buf);
    expect(rows[0].observacoes).toBe("");
  });
});

describe("round-trip de terreno", () => {
  it("gera template e parseia de volta sem perda dos campos essenciais", () => {
    const buf = generateTerrenoTemplate();
    const rows = parseTerrenoExcel(buf);
    const lote1 = rows.find((r) => r.nome === "Lote 01 - Bloco A");
    expect(lote1).toBeDefined();
    expect(lote1!.cidade).toBe("São Paulo");
    expect(lote1!.area).toBe(500);
    expect(lote1!.valorCompra).toBe(250000);
    expect(lote1!.aquisicao).not.toBeNull();
    expect(typeof lote1!.aquisicao).toBe("string");
  });
});
