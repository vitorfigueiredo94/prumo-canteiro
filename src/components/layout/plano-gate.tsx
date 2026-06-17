import Link from "next/link";
import { Lock } from "lucide-react";

interface PlanoGateProps {
  recurso: string;
  planoNecessario: string;
  planoAtual: string;
}

export function PlanoGate({ recurso: _recurso, planoNecessario, planoAtual }: PlanoGateProps) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      minHeight: "60vh", padding: "40px 24px", textAlign: "center",
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: "50%",
        background: "var(--navy-50)", display: "flex",
        alignItems: "center", justifyContent: "center", marginBottom: 20,
      }}>
        <Lock size={28} color="var(--navy-600)" />
      </div>
      <h2 style={{
        margin: "0 0 8px", fontFamily: "var(--font-display)",
        fontSize: 26, fontWeight: 500, color: "var(--fg-primary)", letterSpacing: "-0.015em",
      }}>
        Módulo não incluído no seu plano
      </h2>
      <p style={{ margin: "0 0 6px", fontSize: 15, color: "var(--fg-secondary)", maxWidth: 420 }}>
        Este módulo está disponível a partir do plano <strong>{planoNecessario}</strong>.
        Seu plano atual é <strong>{planoAtual}</strong>.
      </p>
      <p style={{ margin: "0 0 28px", fontSize: 14, color: "var(--fg-tertiary)" }}>
        Fale com o suporte para fazer upgrade e liberar o acesso.
      </p>
      <Link
        href="/dashboard"
        style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "10px 24px", background: "var(--navy-700)", color: "#fff",
          borderRadius: "var(--radius-md)", fontSize: 14, fontWeight: 600,
          textDecoration: "none",
        }}
      >
        Voltar ao painel
      </Link>
    </div>
  );
}
