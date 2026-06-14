import { XMLParser } from "fast-xml-parser";
import { prisma } from "@/lib/prisma";

export interface ItemNFe {
  descricao: string;
  ncm?: string;
  cfop?: string;
  unidade?: string;
  qtd: number;
  valorUnit: number;
  valorTotal: number;
}

export interface NFeParseResult {
  chaveNFe?: string;
  emitente?: string;
  cnpjEmitente?: string;
  valorTotal: number;
  dataEmissao?: string;
  itens: ItemNFe[];
}

export function parseNFeXml(xml: string): NFeParseResult {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
  const doc = parser.parse(xml);

  const infNFe =
    doc?.nfeProc?.NFe?.infNFe ??
    doc?.NFe?.infNFe ??
    doc?.infNFe;

  if (!infNFe) throw new Error("XML não reconhecido como NF-e válida");

  const emit = infNFe.emit ?? {};
  const total = infNFe.total?.ICMSTot ?? {};
  const chave = infNFe["@_Id"]?.replace(/^NFe/, "") ?? undefined;

  const dets = Array.isArray(infNFe.det)
    ? infNFe.det
    : infNFe.det
    ? [infNFe.det]
    : [];

  const itens: ItemNFe[] = dets.map((det: Record<string, unknown>) => {
    const prod = (det.prod ?? {}) as Record<string, unknown>;
    return {
      descricao: String(prod.xProd ?? ""),
      ncm: prod.NCM ? String(prod.NCM) : undefined,
      cfop: prod.CFOP ? String(prod.CFOP) : undefined,
      unidade: prod.uCom ? String(prod.uCom) : undefined,
      qtd: Number(prod.qCom ?? 0),
      valorUnit: Number(prod.vUnCom ?? 0),
      valorTotal: Number(prod.vProd ?? 0),
    };
  });

  return {
    chaveNFe: chave,
    emitente: emit.xNome ? String(emit.xNome) : undefined,
    cnpjEmitente: emit.CNPJ ? String(emit.CNPJ) : undefined,
    valorTotal: Number(total.vNF ?? 0),
    dataEmissao: infNFe.ide?.dhEmi ?? infNFe.ide?.dEmi,
    itens,
  };
}

export interface RegraRateio {
  obraId: string;
  percentual: number;
}

export interface ResultadoRateio {
  obraId: string;
  percentual: number;
  valor: number;
  itens: Array<ItemNFe & { valorRateado: number }>;
}

export function calcularRateio(
  valorTotal: number,
  itens: ItemNFe[],
  regras: RegraRateio[]
): ResultadoRateio[] {
  const soma = regras.reduce((acc, r) => acc + r.percentual, 0);
  if (Math.abs(soma - 100) > 0.01) throw new Error("Percentuais devem somar 100%");

  return regras.map((r) => ({
    obraId: r.obraId,
    percentual: r.percentual,
    valor: parseFloat(((valorTotal * r.percentual) / 100).toFixed(2)),
    itens: itens.map((i) => ({
      ...i,
      valorRateado: parseFloat(((i.valorTotal * r.percentual) / 100).toFixed(2)),
    })),
  }));
}

export async function salvarRateio(
  empresaId: string,
  parsed: NFeParseResult,
  regras: RegraRateio[],
  resultado: ResultadoRateio[],
  notaId?: string
) {
  return prisma.rateioNFe.create({
    data: {
      empresaId,
      notaId,
      chaveNFe: parsed.chaveNFe,
      emitente: parsed.emitente,
      valorTotal: parsed.valorTotal,
      itens: JSON.stringify(parsed.itens),
      regras: JSON.stringify(regras),
      rateioResult: JSON.stringify(resultado),
    },
  });
}
