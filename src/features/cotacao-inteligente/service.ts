import { prisma } from "@/lib/prisma";
import { assertSafeUrl, SsrfBlockedError } from "@/lib/ssrf-guard";
import path from "path";
import fs from "fs/promises";

export interface InsumoExtraido {
  descricao: string;
  qtd?: number;
  unidade?: string;
  valor?: number;
}

export async function extrairInsumosDosPdf(file: File): Promise<InsumoExtraido[]> {
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    // pdf-parse v1: exports a function directly (no .default)
    const pdfParseModule = await import("pdf-parse");
    const pdfParse = (pdfParseModule as unknown as { default?: Function }).default ?? pdfParseModule;
    const data = await (pdfParse as Function)(buffer);
    const linhas = data.text.split("\n").filter((l: string) => l.trim().length > 3);

    const regex = /(\d+[,.]?\d*)\s*(un|kg|m²|m³|m|pç|cj|l|lt|sc|vb)/i;
    const insumos: InsumoExtraido[] = [];

    for (const linha of linhas) {
      const m = linha.match(regex);
      if (m) {
        insumos.push({
          descricao: linha.replace(m[0], "").trim().substring(0, 120),
          qtd: parseFloat(m[1].replace(",", ".")),
          unidade: m[2].toLowerCase(),
        });
      }
    }

    return insumos.length > 0
      ? insumos
      : [{ descricao: "Conteúdo do PDF (ver anexo)", qtd: 1, unidade: "vb" }];
  } catch {
    return [{ descricao: "Falha ao extrair PDF", qtd: 1, unidade: "vb" }];
  }
}

export async function salvarPdfCotacao(file: File): Promise<string> {
  const uploadsDir = path.resolve(process.cwd(), "public/uploads/cotacoes");
  await fs.mkdir(uploadsDir, { recursive: true });
  const fileName = `${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, "_")}`;
  await fs.writeFile(path.join(uploadsDir, fileName), Buffer.from(await file.arrayBuffer()));
  return `/uploads/cotacoes/${fileName}`;
}

export async function criarCotacao(
  empresaId: string,
  nome: string,
  insumos: InsumoExtraido[],
  pdfUrl?: string,
  obraId?: string,
  webhookUrl?: string
) {
  const cotacao = await prisma.cotacaoInsumo.create({
    data: { empresaId, nome, obraId, pdfUrl, insumos: JSON.stringify(insumos), webhookUrl },
  });

  if (webhookUrl) {
    // Valida SSRF antes de disparar — lança SsrfBlockedError se URL for privada
    await assertSafeUrl(webhookUrl);
    dispararWebhook(cotacao.id, webhookUrl, {
      cotacaoId: cotacao.id,
      empresaId,
      nome,
      insumos,
    }).catch(() => {});
  }

  return cotacao;
}

async function dispararWebhook(cotacaoId: string, url: string, payload: unknown) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
    const resposta = (await res.text()).substring(0, 500);
    await prisma.cotacaoInsumo.update({
      where: { id: cotacaoId },
      data: { webhookStatus: res.ok ? "enviado" : "erro", webhookResposta: resposta },
    });
  } catch (e) {
    await prisma.cotacaoInsumo.update({
      where: { id: cotacaoId },
      data: { webhookStatus: "erro", webhookResposta: String(e).substring(0, 200) },
    });
  }
}

export async function buscarCotacao(empresaId: string, id: string) {
  const c = await prisma.cotacaoInsumo.findFirst({ where: { id, empresaId } });
  if (!c) return null;
  return { ...c, insumos: JSON.parse(c.insumos) };
}
