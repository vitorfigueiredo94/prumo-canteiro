"use server";

type State = { error?: string; success?: boolean } | null;

export async function forgotPasswordAction(
  _prevState: State,
  formData: FormData
): Promise<State> {
  const email = (formData.get("email") as string)?.trim();
  if (!email) return { error: "Informe seu e-mail." };

  // Recuperação de senha por e-mail não está disponível nesta versão local.
  // Entre em contato com o administrador para redefinir sua senha.
  return { success: true };
}
