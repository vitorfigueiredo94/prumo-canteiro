"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Eye, EyeOff, LogIn, AlertCircle, Building2, ReceiptText, Handshake, Wallet } from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/ui/logo";
import { loginAction } from "./actions";

const BENEFICIOS = [
  { icon: Building2, text: "Obras e financeiro num só lugar" },
  { icon: ReceiptText, text: "Notas fiscais com leitura automática" },
  { icon: Handshake, text: "Vendas de terrenos e recebimentos" },
  { icon: Wallet, text: "Fluxo de caixa sempre atualizado" },
];

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
        <span className="cnt-spin" style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block" }} />
      ) : (
        <LogIn size={17} />
      )}
      {pending ? "Entrando…" : "Entrar"}
    </button>
  );
}

export function LoginForm() {
  const [error, action] = useActionState(loginAction, null);
  const [showPass, setShowPass] = useState(false);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-canvas)" }}>
      {/* Painel marca — desktop only */}
      <div
        className="hidden lg:flex"
        style={{
          width: "46%",
          maxWidth: 600,
          background: "var(--navy-800)",
          color: "#fff",
          padding: "56px 52px",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Logo + nome */}
        <div style={{ display: "flex", alignItems: "center", gap: 13, position: "relative", zIndex: 1 }}>
          <Logo size={42} />
          <div style={{ lineHeight: 1.05 }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 500 }}>
              PrumoCanteiro
            </div>
            <div style={{ fontSize: 11, color: "var(--gold-300)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Gestão de obras
            </div>
          </div>
        </div>

        {/* Headline + benefícios */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 38,
              fontWeight: 400,
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
              margin: "0 0 28px",
              color: "#fff",
            }}
          >
            Toda a sua obra<br />no prumo.
          </h1>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {BENEFICIOS.map(({ icon: Icon, text }) => (
              <div key={text} style={{ display: "flex", alignItems: "center", gap: 13, fontSize: 15, color: "rgba(255,255,255,0.88)" }}>
                <span
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: "var(--radius-md)",
                    background: "rgba(212,162,76,0.16)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--gold-300)",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={20} />
                </span>
                {text}
              </div>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.45)", position: "relative", zIndex: 1 }}>
          © 2026 PrumoCanteiro · Todos os direitos reservados
        </div>

        {/* Decoração */}
        <div style={{ position: "absolute", right: -120, bottom: -120, width: 360, height: 360, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.06)" }} />
        <div style={{ position: "absolute", right: -60, bottom: -60, width: 240, height: 240, borderRadius: "50%", border: "1px solid rgba(212,162,76,0.12)" }} />
      </div>

      {/* Formulário */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 24px",
        }}
      >
        <div style={{ width: "100%", maxWidth: 400 }}>
          {/* Logo mobile */}
          <div className="flex lg:hidden" style={{ alignItems: "center", gap: 11, marginBottom: 32, justifyContent: "center" }}>
            <Logo size={36} />
            <span style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, color: "var(--fg-primary)" }}>
              PrumoCanteiro
            </span>
          </div>

          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 30,
              fontWeight: 500,
              color: "var(--fg-primary)",
              margin: "0 0 6px",
              letterSpacing: "-0.015em",
            }}
          >
            Acessar minha conta
          </h2>
          <p style={{ fontSize: 14.5, color: "var(--fg-tertiary)", margin: "0 0 28px" }}>
            Bem-vindo de volta. Entre para gerenciar suas obras.
          </p>

          <form action={action} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label htmlFor="email" style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-secondary)", fontFamily: "var(--font-sans)" }}>
                E-mail
              </label>
              <input
                id="email"
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

            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label htmlFor="password" style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-secondary)", fontFamily: "var(--font-sans)" }}>
                  Senha
                </label>
                <a
                  href="/forgot-password"
                  style={{ fontSize: 12.5, color: "var(--navy-600)", textDecoration: "none", fontWeight: 600 }}
                >
                  Esqueci minha senha
                </a>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  id="password"
                  name="password"
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  style={{
                    height: 42,
                    padding: "0 44px 0 12px",
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
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--fg-tertiary)",
                    display: "flex",
                    padding: 4,
                  }}
                  aria-label={showPass ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
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
                {error}
              </div>
            )}

            <SubmitButton />
          </form>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              margin: "24px 0",
              color: "var(--fg-muted)",
              fontSize: 12.5,
            }}
          >
            <div style={{ flex: 1, height: 1, background: "var(--border-subtle)" }} />
            OU
            <div style={{ flex: 1, height: 1, background: "var(--border-subtle)" }} />
          </div>

          <div style={{ textAlign: "center", fontSize: 14, color: "var(--fg-tertiary)" }}>
            Ainda não tem conta?{" "}
            <a
              href="/cadastro"
              style={{ color: "var(--navy-600)", fontWeight: 700, textDecoration: "none" }}
            >
              Teste grátis por 14 dias
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
