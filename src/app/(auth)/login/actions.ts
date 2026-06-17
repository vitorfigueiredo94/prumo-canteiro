"use server";

import { prisma } from "@/lib/prisma";
import { verifyPassword, setSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function loginAction(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  if (!email || !password) return "Informe seu e-mail e senha.";

  const usuario = await prisma.usuario.findUnique({
    where: { email },
    select: { id: true, empresaId: true, nome: true, passwordHash: true, superAdmin: true, bloqueado: true },
  });

  if (!usuario?.passwordHash) return "E-mail ou senha incorretos.";

  const ok = await verifyPassword(password, usuario.passwordHash);
  if (!ok) return "E-mail ou senha incorretos.";

  if (usuario.bloqueado) return "Sua conta foi suspensa. Contate o suporte.";

  await setSession({
    userId: usuario.id,
    empresaId: usuario.empresaId,
    nome: usuario.nome,
    email,
  });

  redirect(usuario.superAdmin ? "/superadmin" : "/dashboard");
}
