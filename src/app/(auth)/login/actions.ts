"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function loginAction(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;

  if (!email || !password) return "Informe seu e-mail e senha.";

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.message.includes("Invalid login credentials"))
      return "E-mail ou senha incorretos.";
    return error.message;
  }

  redirect("/dashboard");
}
