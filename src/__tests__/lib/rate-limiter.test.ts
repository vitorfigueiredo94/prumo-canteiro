import { describe, it, expect, beforeEach } from "vitest";

// Importa via dynamic require para resetar o módulo e limpar o store entre testes
// Usamos uma chave única por suite para isolar o estado global
let counter = 0;
function uniqueKey(prefix: string) {
  return `${prefix}-${++counter}`;
}

// O rate-limiter usa um Map global em memória.
// Importamos diretamente — mas usamos chaves únicas para não ter estado compartilhado.
import { checkRateLimit, rateLimitError } from "@/lib/rate-limiter";

describe("checkRateLimit — primeira tentativa", () => {
  it("permite a primeira tentativa", () => {
    const key = uniqueKey("ip");
    const r = checkRateLimit(key, 5, 60);
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(4);
    expect(r.resetInSeconds).toBeGreaterThan(0);
  });
});

describe("checkRateLimit — acumulação de tentativas", () => {
  it("decrementa remaining a cada chamada", () => {
    const key = uniqueKey("ip");
    checkRateLimit(key, 5, 60); // 1 → remaining 4
    checkRateLimit(key, 5, 60); // 2 → remaining 3
    const r = checkRateLimit(key, 5, 60); // 3 → remaining 2
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(2);
  });

  it("bloqueia após atingir o limite", () => {
    const key = uniqueKey("ip");
    for (let i = 0; i < 3; i++) checkRateLimit(key, 3, 60);
    const r = checkRateLimit(key, 3, 60);
    expect(r.allowed).toBe(false);
    expect(r.remaining).toBe(0);
    expect(r.resetInSeconds).toBeGreaterThan(0);
  });

  it("remaining chega a 0 exatamente no último permitido", () => {
    const key = uniqueKey("ip");
    const maxAttempts = 2;
    checkRateLimit(key, maxAttempts, 60); // 1 → remaining 1
    const r = checkRateLimit(key, maxAttempts, 60); // 2 → remaining 0
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(0);
  });
});

describe("checkRateLimit — janelas independentes", () => {
  it("chaves diferentes têm janelas independentes", () => {
    const keyA = uniqueKey("a");
    const keyB = uniqueKey("b");
    for (let i = 0; i < 5; i++) checkRateLimit(keyA, 5, 60);
    const rA = checkRateLimit(keyA, 5, 60); // 6ª → bloqueado
    const rB = checkRateLimit(keyB, 5, 60); // 1ª → permitido
    expect(rA.allowed).toBe(false);
    expect(rB.allowed).toBe(true);
  });
});

describe("checkRateLimit — maxAttempts = 1", () => {
  it("bloqueia na segunda tentativa quando limite é 1", () => {
    const key = uniqueKey("strict");
    const r1 = checkRateLimit(key, 1, 60);
    const r2 = checkRateLimit(key, 1, 60);
    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(false);
  });
});

describe("rateLimitError", () => {
  it("menciona 'minuto' para 60s", () => {
    const msg = rateLimitError(60);
    expect(msg).toContain("1 minuto");
  });
  it("usa plural para múltiplos minutos", () => {
    const msg = rateLimitError(900); // 15 minutos
    expect(msg).toContain("15 minutos");
  });
  it("arredonda para cima (120s = 2 minutos)", () => {
    const msg = rateLimitError(120);
    expect(msg).toContain("2 minutos");
  });
  it("arredonda para cima (61s = 2 minutos)", () => {
    const msg = rateLimitError(61);
    expect(msg).toContain("2 minutos");
  });
  it("retorna string não vazia", () => {
    expect(rateLimitError(30)).toBeTruthy();
  });
});
