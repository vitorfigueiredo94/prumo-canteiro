import { lookup } from "dns/promises";

export class SsrfBlockedError extends Error {
  readonly status = 422;
  constructor(reason: string) {
    super(`SSRF_BLOCKED: ${reason}`);
    this.name = "SsrfBlockedError";
  }
}

const PRIVATE_IP_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./,
  /^0\./,
  /^::1$/,
  /^fc[0-9a-f]{2}:/i,
  /^fd[0-9a-f]{2}:/i,
];

const BLOCKED_HOSTNAMES = new Set([
  "localhost", "ip6-localhost", "ip6-loopback",
  "metadata.google.internal", "metadata.goog",
]);

function isPrivateIp(ip: string): boolean {
  return PRIVATE_IP_RANGES.some((re) => re.test(ip));
}

export async function assertSafeUrl(rawUrl: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new SsrfBlockedError("URL inválida");
  }

  if (parsed.protocol !== "https:") {
    throw new SsrfBlockedError("Apenas URLs HTTPS são permitidas");
  }

  const hostname = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new SsrfBlockedError(`Hostname bloqueado: ${hostname}`);
  }

  // Bloqueia IPs literais privados na URL
  if (isPrivateIp(hostname)) {
    throw new SsrfBlockedError(`IP privado não permitido: ${hostname}`);
  }

  // Resolve DNS e verifica o IP resultante (previne DNS rebinding)
  try {
    const result = await lookup(hostname);
    if (isPrivateIp(result.address)) {
      throw new SsrfBlockedError(`IP resolvido é privado: ${result.address}`);
    }
  } catch (e) {
    if (e instanceof SsrfBlockedError) throw e;
    throw new SsrfBlockedError(`Falha ao resolver hostname: ${hostname}`);
  }
}
