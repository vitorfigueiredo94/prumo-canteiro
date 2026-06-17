import * as XLSX from "xlsx";

// ── Helpers ───────────────────────────────────────────────────────────────────

function str(v: unknown): string {
  return String(v ?? "").trim();
}

function num(v: unknown): number | null {
  if (v === "" || v === null || v === undefined) return null;
  if (typeof v === "number") return isNaN(v) ? null : v;
  let clean = str(v).replace(/[R$\s]/g, "");
  if (!clean) return null;
  if (clean.includes(",") && clean.includes(".")) {
    clean = clean.replace(/\./g, "").replace(",", ".");
  } else if (clean.includes(",")) {
    clean = clean.replace(",", ".");
  }
  const n = Number(clean);
  return isNaN(n) ? null : n;
}

function parseDate(v: unknown): string | null {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v.toISOString();
  const s = str(v);
  if (!s) return null;
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) {
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function readFirstSheet(buffer: Buffer): Record<string, unknown>[] {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) throw new Error("Planilha vazia");
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
}

// ── Template generators ───────────────────────────────────────────────────────

export function generateTerrenoTemplate(): Buffer {
  const wb = XLSX.utils.book_new();
  const rows = [
    ["nome *", "cidade *", "area (m²) *", "status", "endereco", "numero", "valorCompra (R$)", "aquisicao (DD/MM/AAAA)"],
    ["Lote 01 - Bloco A", "São Paulo", 500, "disponivel", "Rua das Flores, 100", "01", 250000, "15/06/2024"],
    ["Lote 02 - Bloco B", "Campinas", 320, "em_obra", "", "", "", ""],
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 26 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 30 }, { wch: 10 }, { wch: 20 }, { wch: 24 }];
  XLSX.utils.book_append_sheet(wb, ws, "Terrenos");
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

export function generateVendaTemplate(): Buffer {
  const wb = XLSX.utils.book_new();
  const rows = [
    [
      "nomeTerreno *", "nomeComprador *", "cpfCnpj", "telefone", "email",
      "valorTotal (R$) *", "entrada (R$)", "numeroParcelas", "diaVencimento (1-28)",
      "dataContrato (DD/MM/AAAA)", "observacoes",
    ],
    [
      "Lote 01 - Bloco A", "João Silva", "123.456.789-00", "(11) 91234-5678", "joao@email.com",
      150000, 30000, 12, 10, "01/06/2024", "",
    ],
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [
    { wch: 26 }, { wch: 24 }, { wch: 18 }, { wch: 18 }, { wch: 24 },
    { wch: 18 }, { wch: 15 }, { wch: 16 }, { wch: 20 }, { wch: 26 }, { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Vendas");
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

export function generateCompradorTemplate(): Buffer {
  const wb = XLSX.utils.book_new();
  const rows = [
    ["cpfCnpj *", "nomeComprador", "telefone", "email"],
    ["123.456.789-00", "João Silva Atualizado", "(11) 99876-5432", "joao.novo@email.com"],
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 20 }, { wch: 30 }, { wch: 20 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, ws, "Compradores");
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

// ── Parsers ───────────────────────────────────────────────────────────────────

export interface TerrenoRow {
  nome: string;
  cidade: string;
  area: number | null;
  status: string;
  endereco: string;
  numero: string;
  valorCompra: number | null;
  aquisicao: string | null;
}

export function parseTerrenoExcel(buffer: Buffer): TerrenoRow[] {
  return readFirstSheet(buffer).map((row) => ({
    nome: str(row["nome *"] ?? row["nome"]),
    cidade: str(row["cidade *"] ?? row["cidade"]),
    area: num(row["area (m²) *"] ?? row["area (m²)"] ?? row["area"]),
    status: str(row["status"]) || "disponivel",
    endereco: str(row["endereco"]),
    numero: str(row["numero"]),
    valorCompra: num(row["valorCompra (R$)"] ?? row["valorCompra"]),
    aquisicao: parseDate(row["aquisicao (DD/MM/AAAA)"] ?? row["aquisicao"]),
  }));
}

export interface VendaRow {
  nomeTerreno: string;
  nomeComprador: string;
  cpfCnpj: string;
  telefone: string;
  email: string;
  valorTotal: number | null;
  entrada: number | null;
  numeroParcelas: number | null;
  diaVencimento: number | null;
  dataContrato: string | null;
  observacoes: string;
}

export function parseVendaExcel(buffer: Buffer): VendaRow[] {
  return readFirstSheet(buffer).map((row) => ({
    nomeTerreno: str(row["nomeTerreno *"] ?? row["nomeTerreno"]),
    nomeComprador: str(row["nomeComprador *"] ?? row["nomeComprador"]),
    cpfCnpj: str(row["cpfCnpj"]),
    telefone: str(row["telefone"]),
    email: str(row["email"]),
    valorTotal: num(row["valorTotal (R$) *"] ?? row["valorTotal (R$)"] ?? row["valorTotal"]),
    entrada: num(row["entrada (R$)"] ?? row["entrada"]),
    numeroParcelas: num(row["numeroParcelas"]),
    diaVencimento: num(row["diaVencimento (1-28)"] ?? row["diaVencimento"]),
    dataContrato: parseDate(row["dataContrato (DD/MM/AAAA)"] ?? row["dataContrato"]),
    observacoes: str(row["observacoes"]),
  }));
}

export interface CompradorRow {
  cpfCnpj: string;
  nomeComprador: string;
  telefone: string;
  email: string;
}

export function parseCompradorExcel(buffer: Buffer): CompradorRow[] {
  return readFirstSheet(buffer).map((row) => ({
    cpfCnpj: str(row["cpfCnpj *"] ?? row["cpfCnpj"]),
    nomeComprador: str(row["nomeComprador"]),
    telefone: str(row["telefone"]),
    email: str(row["email"]),
  }));
}
