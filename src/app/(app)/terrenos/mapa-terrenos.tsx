"use client";

// Mapa geral dos terrenos — lista à esquerda, mapa do Google à direita.
// Clicar num terreno mostra a localização dele no embed do Google Maps
// (endereço em texto, sem geocoding nem chave de API).

import { useState } from "react";

interface TerrenoMapa {
  id: string;
  nome: string;
  endereco: string | null;
  cidade: string;
  cep: string | null;
  status: string;
}

const STATUS_LABEL: Record<string, { label: string; bg: string; color: string }> = {
  disponivel: { label: "Disponível", bg: "#dcfce7", color: "#166534" },
  em_obra:    { label: "Em obra",    bg: "#fef3c7", color: "#92400e" },
  vendido:    { label: "Vendido",    bg: "#f1f5f9", color: "#475569" },
};

function queryDe(t: TerrenoMapa): string {
  return [t.endereco, t.cidade, t.cep].filter(Boolean).join(", ") || t.nome;
}

export function MapaTerrenos({ terrenos }: { terrenos: TerrenoMapa[] }) {
  const [selId, setSelId] = useState<string | null>(terrenos[0]?.id ?? null);

  if (terrenos.length === 0) {
    return (
      <p style={{ textAlign: "center", padding: "40px 0", fontSize: 15, color: "var(--fg-tertiary)" }}>
        Nenhum terreno cadastrado ainda.
      </p>
    );
  }

  const sel = terrenos.find((t) => t.id === selId) ?? terrenos[0];
  const query = queryDe(sel);
  const embedSrc = `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
  const linkSrc = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(200px, 280px) 1fr", gap: 16, alignItems: "start" }}>
      {/* Lista de terrenos */}
      <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", overflow: "hidden", maxHeight: 520, overflowY: "auto", background: "var(--bg-surface)" }}>
        {terrenos.map((t, i) => {
          const s = STATUS_LABEL[t.status] ?? STATUS_LABEL.disponivel;
          const active = t.id === sel.id;
          return (
            <button
              key={t.id}
              onClick={() => setSelId(t.id)}
              style={{
                display: "block", width: "100%", textAlign: "left", cursor: "pointer",
                padding: "12px 14px",
                border: "none",
                borderBottom: i < terrenos.length - 1 ? "1px solid var(--border-subtle)" : "none",
                borderLeft: `3px solid ${active ? "var(--navy-700)" : "transparent"}`,
                background: active ? "var(--ink-50)" : "transparent",
                fontFamily: "var(--font-sans)",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-primary)", marginBottom: 3 }}>{t.nome}</div>
              <div style={{ fontSize: 12, color: "var(--fg-tertiary)", marginBottom: 6 }}>{t.cidade}</div>
              <span style={{ display: "inline-block", padding: "1px 8px", borderRadius: 20, fontSize: 10.5, fontWeight: 700, background: s.bg, color: s.color }}>{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* Mapa do Google do terreno selecionado */}
      <div>
        <iframe
          title={`Mapa — ${sel.nome}`}
          src={embedSrc}
          width="100%"
          height={520}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          style={{ border: 0, borderRadius: "var(--radius-lg)", display: "block", background: "var(--ink-50)" }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: "var(--fg-secondary)" }}>
            <strong>{sel.nome}</strong> — {query}
          </span>
          <a
            href={linkSrc}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, color: "var(--navy-700)", fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}
          >
            🗺️ Abrir no Google Maps →
          </a>
        </div>
      </div>
    </div>
  );
}
