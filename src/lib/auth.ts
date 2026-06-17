import { cookies } from "next/headers";
import { scrypt, randomBytes, timingSafeEqual, createHmac } from "crypto";
import { promisify } from "util";
import { redirect } from "next/navigation";

const scryptAsync = promisify(scrypt);

const SECRET = (() => {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      "[auth] SESSION_SECRET não definida ou muito curta (<32 chars). Configure no .env da VM."
    );
  }
  return s;
})();
const COOKIE = "prumo_sess";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 dias

// ── Senha ───────────────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const key = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${key.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  try {
    const [salt, key] = stored.split(":");
    const derived = (await scryptAsync(password, salt, 64)) as Buffer;
    return timingSafeEqual(derived, Buffer.from(key, "hex"));
  } catch {
    return false;
  }
}

// ── Sessão (cookie HMAC-SHA256) ──────────────────────────────────────────────

export interface Session {
  userId: string;
  empresaId: string;
  nome: string;
  email: string;
}

function sign(data: Session): string {
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  const sig = createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

function verify(token: string): Session | null {
  try {
    const dot = token.lastIndexOf(".");
    if (dot === -1) return null;
    const payload = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const expected = createHmac("sha256", SECRET)
      .update(payload)
      .digest("base64url");
    if (sig !== expected) return null;
    return JSON.parse(Buffer.from(payload, "base64url").toString()) as Session;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  return token ? verify(token) : null;
}

export async function setSession(session: Session): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE, sign(session), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

// ── Helper usado em Server Actions ───────────────────────────────────────────

export async function getEmpresaId(): Promise<string> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session.empresaId;
}
