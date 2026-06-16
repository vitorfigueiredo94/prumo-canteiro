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
