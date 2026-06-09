import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <div style={{ padding: "32px" }}>
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 30,
            fontWeight: 500,
            color: "var(--fg-primary)",
            margin: "0 0 4px",
            letterSpacing: "-0.015em",
          }}
        >
          Visão geral
        </h1>
        <p style={{ fontSize: 14, color: "var(--fg-tertiary)", margin: 0 }}>
          Bem-vindo ao PrumoCanteiro.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        {[
          { label: "Obras ativas", value: "—", color: "var(--navy-700)" },
          { label: "Orçamento total", value: "—", color: "var(--gold-600)" },
          { label: "Funcionários ativos", value: "—", color: "var(--success-700)" },
          { label: "Parcelas a receber", value: "—", color: "var(--info-500)" },
        ].map((kpi) => (
          <div
            key={kpi.label}
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-lg)",
              padding: "20px 24px",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--fg-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              {kpi.label}
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 400, color: kpi.color }}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 32,
          padding: "24px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <p style={{ fontSize: 14, color: "var(--fg-tertiary)", margin: 0, textAlign: "center" }}>
          Dashboard completo será implementado na Etapa 10. Use o menu lateral para navegar pelos módulos.
        </p>
      </div>
    </div>
  );
}
