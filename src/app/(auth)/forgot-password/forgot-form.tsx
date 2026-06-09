"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Send, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { forgotPasswordAction } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      style={{
        height: 44,
        width: "100%",
        background: pending ? "var(--navy-600)" : "var(--navy-700)",
        color: "#fff",
        border: "none",
        borderRadius: "var(--radius-md)",
        fontFamily: "var(--font-sans)",
        fontSize: 15,
        fontWeight: 600,
        cursor: pending ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        transition: "background var(--dur-fast)",
      }}
    >
      {pending ? (
        <span
          className="cnt-spin"
          style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block" }}
        />
      ) : (
        <Send size={17} />
      )}
      {pending ? "Enviando…" : "Enviar link de recuperação"}
    </button>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState(forgotPasswordAction, null);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-canvas)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 24px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 32, justifyContent: "center" }}>
          <Logo size={36} />
          <span style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, color: "var(--fg-primary)" }}>
            PrumoCanteiro
          </span>
        </div>

        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 28,
            fontWeight: 500,
            color: "var(--fg-primary)",
            margin: "0 0 6px",
            letterSpacing: "-0.015em",
          }}
        >
          Recuperar senha
        </h2>
        <p style={{ fontSize: 14.5, color: "var(--fg-tertiary)", margin: "0 0 28px" }}>
          Informe seu e-mail e enviaremos um link para redefinir sua senha.
        </p>

        {state?.success ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              padding: "24px",
              background: "var(--success-50)",
              border: "1px solid rgba(31,90,51,0.25)",
              borderRadius: "var(--radius-lg)",
              textAlign: "center",
            }}
          >
            <CheckCircle2 size={36} color="var(--success-700)" />
            <div>
              <p style={{ fontWeight: 600, color: "var(--success-700)", margin: "0 0 4px" }}>
                Link enviado!
              </p>
              <p style={{ fontSize: 14, color: "var(--fg-secondary)", margin: 0 }}>
                Verifique sua caixa de entrada e spam.
              </p>
            </div>
          </div>
        ) : (
          <form action={action} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-secondary)", fontFamily: "var(--font-sans)" }}>
                E-mail cadastrado
              </label>
              <input
                name="email"
                type="email"
                placeholder="voce@empresa.com.br"
                required
                autoComplete="email"
                style={{
                  height: 42,
                  padding: "0 12px",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-md)",
                  background: "var(--bg-surface)",
                  color: "var(--fg-primary)",
                  fontFamily: "var(--font-sans)",
                  fontSize: 14.5,
                  width: "100%",
                  outline: "none",
                }}
                onFocus={(e) => { e.target.style.borderColor = "var(--border-focus)"; e.target.style.boxShadow = "var(--shadow-focus)"; }}
                onBlur={(e) => { e.target.style.borderColor = "var(--border-default)"; e.target.style.boxShadow = "none"; }}
              />
            </div>

            {state?.error && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  color: "var(--danger-500)",
                  background: "var(--danger-50)",
                  border: "1px solid rgba(181,54,60,0.25)",
                  borderRadius: "var(--radius-md)",
                  padding: "9px 12px",
                }}
              >
                <AlertCircle size={16} />
                {state.error}
              </div>
            )}

            <SubmitButton />
          </form>
        )}

        <div style={{ textAlign: "center", marginTop: 24 }}>
          <a
            href="/login"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 14,
              color: "var(--navy-600)",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            <ArrowLeft size={15} />
            Voltar para o login
          </a>
        </div>
      </div>
    </div>
  );
}
