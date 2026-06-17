"use server";

import { prisma } from "@/lib/prisma";
import { hashPassword, setSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export type RegisterState = { error?: string; success?: boolean } | null;

export async function registerAction(
  _prevState: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const nome = (formData.get("nome") as string)?.trim();
  const empresa = (formData.get("empresa") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;
  const confirm = formData.get("confirm") as string;

  if (!nome || !empresa || !email || !password)
    return { error: "Preencha todos os campos obrigatórios." };

  if (password.length < 8)
    return { error: "A senha precisa ter no mínimo 8 caracteres." };

  if (password !== confirm)
    return { error: "As senhas não conferem." };

  const existing = await prisma.usuario.findUnique({ where: { email } });
  if (existing) return { error: "Este e-mail já está cadastrado." };

  const passwordHash = await hashPassword(password);

  let plano: { id: string } | null = null;
  try {
    plano = await prisma.plano.findFirst({
      where: { nome: "Profissional" },
      select: { id: true },
    });
  } catch {
    // planos table may not exist yet on older DBs — skip subscription creation
  }

  const novaEmpresa = await prisma.empresa.create({ data: { nome: empresa } });

  const novoUsuario = await prisma.usuario.create({
    data: { empresaId: novaEmpresa.id, nome, email, passwordHash },
  });

  if (plano) {
    try {
      await prisma.assinatura.create({
        data: {
          empresaId: novaEmpresa.id,
          planoId: plano.id,
          status: "trial",
          proximaCobranca: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
      });
    } catch {
      // non-critical — user can be assigned a plan later
    }
  }

  await setSession({
    userId: novoUsuario.id,
    empresaId: novaEmpresa.id,
    nome,
    email,
  });

  redirect("/dashboard");
}
