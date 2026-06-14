import { prisma } from "@/lib/prisma";

interface ObraContexto {
  nome: string;
  progresso: number;
  prazo: Date | null;
  orcamento: number;
  gastoAtual: number;
  entradasRecentes: string[];
}

async function coletarContexto(empresaId: string, obraId: string): Promise<ObraContexto> {
  const [obra, notas, entradas] = await Promise.all([
    prisma.obra.findFirst({ where: { id: obraId, empresaId } }),
    prisma.notaFiscal.aggregate({ where: { obraId, empresaId }, _sum: { valor: true } }),
    prisma.diarioObra.findMany({
      where: { obraId, empresaId },
      orderBy: { data: "desc" },
      take: 10,
      select: { conteudo: true, data: true, clima: true },
    }),
  ]);

  if (!obra) throw new Error("Obra não encontrada");

  return {
    nome: obra.nome,
    progresso: obra.progresso,
    prazo: obra.prazo,
    orcamento: Number(obra.orcamento),
    gastoAtual: Number(notas._sum.valor ?? 0),
    entradasRecentes: entradas.map(
      (e) =>
        `${e.data?.toISOString().slice(0, 10) ?? "s/data"} (${e.clima ?? "s/clima"}): ${e.conteudo.substring(0, 150)}`
    ),
  };
}

async function chamarGemini(prompt: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return JSON.stringify({
      riscoPct: 25,
      diasAtraso: 0,
      fatores: ["Configure GEMINI_API_KEY para análise real"],
      recomendacoes: ["Adicione GEMINI_API_KEY ao arquivo .env"],
    });
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      signal: AbortSignal.timeout(20_000),
    }
  );

  if (!res.ok) throw new Error(`Gemini retornou ${res.status}`);
  const json = (await res.json()) as { candidates: Array<{ content: { parts: Array<{ text: string }> } }> };
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
}

export async function gerarPredicao(empresaId: string, obraId: string) {
  const ctx = await coletarContexto(empresaId, obraId);

  const diasRestantes = ctx.prazo
    ? Math.ceil((ctx.prazo.getTime() - Date.now()) / 86_400_000)
    : null;
  const gastoPct = ctx.orcamento > 0 ? ((ctx.gastoAtual / ctx.orcamento) * 100).toFixed(1) : "0";

  const prompt = `Você é especialista em gestão de obras. Analise e retorne SOMENTE JSON válido:
{"riscoPct":<0-100>,"diasAtraso":<0-365>,"fatores":["..."],"recomendacoes":["..."]}

OBRA: "${ctx.nome}"
- Progresso: ${ctx.progresso}%
- Dias até prazo: ${diasRestantes ?? "sem prazo definido"}
- Orçamento: R$ ${ctx.orcamento.toFixed(2)} | Gasto: R$ ${ctx.gastoAtual.toFixed(2)} (${gastoPct}%)
- Diário (últimas 10 entradas):
${ctx.entradasRecentes.join("\n") || "Nenhuma entrada no diário"}`;

  let riscoPct = 0;
  let diasAtraso = 0;
  let fatores: string[] = [];
  let recomendacoes: string[] = [];

  try {
    const raw = await chamarGemini(prompt);
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      const p = JSON.parse(match[0]) as Record<string, unknown>;
      riscoPct = Math.min(100, Math.max(0, Number(p.riscoPct ?? 0)));
      diasAtraso = Math.max(0, Number(p.diasAtraso ?? 0));
      fatores = Array.isArray(p.fatores) ? (p.fatores as string[]) : [];
      recomendacoes = Array.isArray(p.recomendacoes) ? (p.recomendacoes as string[]) : [];
    }
  } catch { /* usa defaults zerados */ }

  const predicao = await prisma.predicaoAtraso.create({
    data: {
      empresaId,
      obraId,
      riscoPct,
      diasAtraso,
      fatores: JSON.stringify(fatores),
      recomendacoes: JSON.stringify(recomendacoes),
    },
  });

  return {
    ...predicao,
    fatores,
    recomendacoes,
  };
}

export async function ultimaPredicao(empresaId: string, obraId: string) {
  const p = await prisma.predicaoAtraso.findFirst({
    where: { empresaId, obraId },
    orderBy: { criadoEm: "desc" },
  });
  if (!p) return null;
  return { ...p, fatores: JSON.parse(p.fatores), recomendacoes: JSON.parse(p.recomendacoes) };
}
