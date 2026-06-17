"use server";

import { prisma } from "@/lib/prisma";
import { verifyPassword, setSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { checkRateLimit, rateLimitError } from "@/lib/rate-limiter";

export async function loginAction(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  if (!email || !password) return "Informe seu e-mail e senha.";

  // Rate limit: 10 tentativas por IP a cada 15 minutos
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const rl = checkRateLimit(`login:${ip}`, 10, 15 * 60);
  if (!rl.allowed) return rateLimitError(rl.resetInSeconds);

  let usuario;
  try {
    usuario = await prisma.usuario.findUnique({
      where: { email },
      select: { id: true, empresaId: true, nome: true, passwordHash: true, superAdmin: true, bloqueado: true },
    });
  } catch {
    // bloqueado pode não existir em DBs antes da migração v0.9
    usuario = await prisma.usuario.findUnique({
      where: { email },
      select: { id: true, empresaId: true, nome: true, passwordHash: true, superAdmin: true },
    });
  }

  if (!usuario?.passwordHash) return "E-mail ou senha incorretos.";

  const ok = await verifyPassword(password, usuario.passwordHash);
  if (!ok) return "E-mail ou senha incorretos.";

  if ("bloqueado" in usuario && usuario.bloqueado) return "Sua conta foi suspensa. Contate o suporte.";

  await setSession({
    userId: usuario.id,
    empresaId: usuario.empresaId,
    nome: usuario.nome,
    email,
  });

  redirect(usuario.superAdmin ? "/superadmin" : "/dashboard");
}
