export function fmtBRL(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function fmtBRLshort(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (n >= 1_000) return `R$ ${(n / 1_000).toFixed(0)} mil`;
  return fmtBRL(n);
}

export function fmtDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  return d.toLocaleDateString("pt-BR");
}

export function fmtArea(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return `${n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} m²`;
}

export function fmtPercent(value: number): string {
  return `${value}%`;
}
