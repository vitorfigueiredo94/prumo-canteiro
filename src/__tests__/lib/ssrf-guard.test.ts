import { describe, it, expect, vi, beforeEach } from "vitest";
import { assertSafeUrl, SsrfBlockedError } from "@/lib/ssrf-guard";

// Mocka dns/promises para evitar lookups reais durante os testes
vi.mock("dns/promises", () => ({
  lookup: vi.fn(async (hostname: string) => {
    // Simula resolução de DNS: retorna IP público por padrão
    const privateHosts: Record<string, string> = {
      "evil-internal.example": "10.0.0.1",
      "rebind.example": "192.168.1.1",
      "loopback.example": "127.0.0.1",
    };
    if (privateHosts[hostname]) {
      return { address: privateHosts[hostname], family: 4 };
    }
    // DNS fail para hostname inválido
    if (hostname === "nonexistent-xyz-999.invalid") {
      throw new Error("ENOTFOUND");
    }
    return { address: "93.184.216.34", family: 4 }; // example.com
  }),
}));

describe("assertSafeUrl — bloqueia HTTP", () => {
  it("rejeita URL HTTP", async () => {
    await expect(assertSafeUrl("http://example.com/api")).rejects.toThrow(SsrfBlockedError);
    await expect(assertSafeUrl("http://example.com/api")).rejects.toThrow(/HTTPS/i);
  });
});

describe("assertSafeUrl — bloqueia URLs inválidas", () => {
  it("rejeita string que não é URL", async () => {
    await expect(assertSafeUrl("nao-e-url")).rejects.toThrow(SsrfBlockedError);
  });
  it("rejeita string vazia", async () => {
    await expect(assertSafeUrl("")).rejects.toThrow(SsrfBlockedError);
  });
});

describe("assertSafeUrl — bloqueia hostnames especiais", () => {
  it("rejeita localhost", async () => {
    await expect(assertSafeUrl("https://localhost/api")).rejects.toThrow(SsrfBlockedError);
  });
  it("rejeita metadata.google.internal", async () => {
    await expect(assertSafeUrl("https://metadata.google.internal/")).rejects.toThrow(SsrfBlockedError);
  });
});

describe("assertSafeUrl — bloqueia IPs privados literais", () => {
  it("rejeita 127.0.0.1 (loopback)", async () => {
    await expect(assertSafeUrl("https://127.0.0.1/path")).rejects.toThrow(SsrfBlockedError);
  });
  it("rejeita 10.0.0.1 (RFC1918 classe A)", async () => {
    await expect(assertSafeUrl("https://10.0.0.1/path")).rejects.toThrow(SsrfBlockedError);
  });
  it("rejeita 192.168.1.1 (RFC1918 classe C)", async () => {
    await expect(assertSafeUrl("https://192.168.1.1/path")).rejects.toThrow(SsrfBlockedError);
  });
  it("rejeita 172.16.0.1 (RFC1918 classe B)", async () => {
    await expect(assertSafeUrl("https://172.16.0.1/path")).rejects.toThrow(SsrfBlockedError);
  });
  it("rejeita 169.254.1.1 (link-local)", async () => {
    await expect(assertSafeUrl("https://169.254.1.1/path")).rejects.toThrow(SsrfBlockedError);
  });
  it("rejeita 0.0.0.0", async () => {
    await expect(assertSafeUrl("https://0.0.0.0/path")).rejects.toThrow(SsrfBlockedError);
  });
});

describe("assertSafeUrl — bloqueia via DNS rebinding", () => {
  it("rejeita domínio que resolve para IP privado", async () => {
    await expect(assertSafeUrl("https://evil-internal.example/api")).rejects.toThrow(SsrfBlockedError);
  });
  it("rejeita domínio que resolve para 192.168.x.x", async () => {
    await expect(assertSafeUrl("https://rebind.example/api")).rejects.toThrow(SsrfBlockedError);
  });
  it("rejeita quando DNS falha (não resolve)", async () => {
    await expect(assertSafeUrl("https://nonexistent-xyz-999.invalid/api")).rejects.toThrow(SsrfBlockedError);
  });
});

describe("assertSafeUrl — permite URLs públicas legítimas", () => {
  it("aceita example.com HTTPS", async () => {
    await expect(assertSafeUrl("https://example.com/api")).resolves.toBeUndefined();
  });
  it("aceita graph.facebook.com (Meta Cloud API)", async () => {
    await expect(assertSafeUrl("https://graph.facebook.com/v20.0/messages")).resolves.toBeUndefined();
  });
});

describe("SsrfBlockedError", () => {
  it("tem status 422", () => {
    const e = new SsrfBlockedError("test");
    expect(e.status).toBe(422);
    expect(e.name).toBe("SsrfBlockedError");
    expect(e.message).toContain("SSRF_BLOCKED");
  });
});
