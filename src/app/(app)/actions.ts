"use server";

import { clearSession, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}

export async function salvarTelefoneGestor(telefone: string): Promise<{ ok: boolean }> {
  const session = await getSession();
  if (!session) return { ok: false };
  const limpo = telefone.replace(/\D/g, "");
  await prisma.empresa.update({
    where: { id: session.empresaId },
    data: { telefoneGestor: limpo || null },
  });
  return { ok: true };
}

export async function salvarLogoEmpresa(dataUrl: string | null): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Não autenticado" };
  // Valida tamanho: base64 ~1.33× o tamanho real; limite 400 KB → ~533 KB em base64
  if (dataUrl && dataUrl.length > 560_000) return { ok: false, error: "Imagem muito grande (máx. 400 KB)" };
  await prisma.empresa.update({
    where: { id: session.empresaId },
    data: { logoEmpresa: dataUrl },
  });
  return { ok: true };
}
