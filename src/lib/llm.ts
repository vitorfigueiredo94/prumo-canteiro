// ── PII sanitization ────────────────────────────────────────────────────────

const PII_PATTERNS: [RegExp, string][] = [
  [/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g, "***CPF***"],
  [/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g, "***CNPJ***"],
  [/(?:\+?55\s?)?(?:\(?\d{2}\)?[\s-]?)(?:9\s?)?\d{4}[\s-]?\d{4}/g, "***TEL***"],
  [/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, "***EMAIL***"],
  [/\b[A-ZÁÉÍÓÚÀÃÕÂÊÎÔÛÇÑ][a-záéíóúàãõâêîôûçñ]+(?:\s+[A-ZÁÉÍÓÚÀÃÕÂÊÎÔÛÇÑ][a-záéíóúàãõâêîôûçñ]+){1,4}\b/g, "***NOME***"],
];

export function stripPII(text: string): string {
  let result = text;
  for (const [pattern, placeholder] of PII_PATTERNS) {
    result = result.replace(pattern, placeholder);
  }
  return result;
}

// ── LLM Tier Router ──────────────────────────────────────────────────────────
// Tier 0: regex local (0 tokens) → Tier 1: Flash minimal → Tier 2: chamarLLM()

type LLMTask = "classify_checklist" | "classify_urgency" | "full_analysis";

const TIER0_RULES: Record<string, (text: string) => string | null> = {
  classify_checklist: (text) => {
    if (/conclu[íi]d[ao]|feito|ok\b|pronto/i.test(text)) return "concluido";
    if (/pend[ea]nte|aguardando|falta/i.test(text)) return "pendente";
    return null;
  },
  classify_urgency: (text) => {
    if (/urgent[ea]|emergên|vaza(mento)?|desaba/i.test(text)) return "critica";
    if (/atraso|prazo/i.test(text)) return "alta";
    return null;
  },
};

async function callFlashMinimal(text: string, task: LLMTask): Promise<string> {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return "sem_api_key";

  const systemMap: Record<LLMTask, string> = {
    classify_checklist: 'Responda apenas: "concluido" ou "pendente".',
    classify_urgency:   'Responda apenas: "critica", "alta" ou "normal".',
    full_analysis:      "Seja conciso.",
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemMap[task]}\n\n${stripPII(text)}` }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 16 },
      }),
      signal: AbortSignal.timeout(10_000),
    }
  );

  if (!res.ok) return "erro_llm";
  const data = await res.json();
  return (data.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim().toLowerCase();
}

export async function routeLLM(text: string, task: LLMTask): Promise<string> {
  // Tier 0 — regex, 0 tokens
  const tier0 = TIER0_RULES[task]?.(text);
  if (tier0 !== null && tier0 !== undefined) return tier0;

  // Tier 1 — Flash minimal (≤16 tokens de saída)
  if (task !== "full_analysis") return callFlashMinimal(text, task);

  // Tier 2 — chamarLLM() completo
  return chamarLLM(stripPII(text));
}

// ── Full LLM call ────────────────────────────────────────────────────────────

export async function chamarLLM(prompt: string): Promise<string> {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return [
      "PARECER DE ASSISTÊNCIA TÉCNICA\n",
      "[MODO SIMULAÇÃO — configure GEMINI_API_KEY no .env para gerar pareceres reais]\n",
      "─────────────────────────────────────────\n",
      "Com base nos dados fornecidos, a análise automática identificou o enquadramento",
      "legal aplicável. Para obter o parecer jurídico completo com citação dos artigos",
      "do Código Civil e CDC, adicione sua chave da API Gemini ao arquivo .env.local:\n",
      "GEMINI_API_KEY=sua_chave_aqui",
    ].join("\n");
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.25, maxOutputTokens: 1024 },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT",        threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH",       threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "Erro ao gerar parecer.";
}
