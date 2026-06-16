"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Plus, MapPin, ArrowRight, Building2, Search, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TerrenoForm } from "./terreno-form";
import { criarTerreno } from "./actions";
import { STATUS_TERRENO, STATUS_OBRA } from "@/lib/status";
import { fmtBRLshort, fmtDate, fmtArea } from "@/lib/format";

interface Obra {
  id: string;
  nome: string;
  status: string;
}

interface Terreno {
  id: string;
  nome: string;
  numero: string | null;
  endereco: string | null;
  cidade: string;
  area: number;
  status: string;
  aquisicao: Date | null;
  valorCompra: number | null;
  obras: Obra[];
}

interface TerrenosViewProps {
  terrenos: Terreno[];
}

const metaLbl: React.CSSProperties = {
  fontSize: 11.5,
  color: "var(--fg-tertiary)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  fontFamily: "var(--font-sans)",
};
const metaVal: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: "var(--fg-primary)",
  marginTop: 2,
  fontFamily: "var(--font-sans)",
};

export function TerrenosView({ terrenos }: TerrenosViewProps) {
  const [showNew, setShowNew] = useState(false);
  const [busca, setBusca] = useState("");

  const filtered = busca.trim()
    ? terrenos.filter(
        (t) =>
          t.nome.toLowerCase().includes(busca.toLowerCase()) ||
          t.cidade.toLowerCase().includes(busca.toLowerCase()) ||
          (t.numero?.toLowerCase().includes(busca.toLowerCase()) ?? false)
      )
    : terrenos;

  const closeNew = useCallback(() => setShowNew(false), []);

  return (
    <>
      {/* Page header */}
      <div
        style={{
          padding: "22px 32px",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg-surface)",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontFamily: "var(--font-display)",
              fontSize: 30,
              fontWeight: 500,
              color: "var(--fg-primary)",
              letterSpacing: "-0.015em",
              lineHeight: 1.1,
            }}
          >
            Terrenos
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--fg-tertiary)" }}>
            {terrenos.length} {terrenos.length === 1 ? "terreno" : "terrenos"} no banco de terras
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          style={{
            height: 40,
            padding: "0 16px",
            background: "var(--navy-700)",
            color: "#fff",
            border: "none",
            borderRadius: "var(--radius-md)",
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
          }}
        >
          <Plus size={16} />
          Novo terreno
        </button>
      </div>

      {/* Search */}
      <div style={{ padding: "16px 32px", background: "var(--bg-surface)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div style={{ position: "relative", maxWidth: 320 }}>
          <Search size={15} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--fg-muted)", pointerEvents: "none" }} />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar terreno…"
            style={{
              height: 38,
              padding: "0 12px 0 34px",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              background: "var(--bg-surface)",
              color: "var(--fg-primary)",
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              width: "100%",
              outline: "none",
            }}
            onFocus={(e) => { e.target.style.borderColor = "var(--border-focus)"; e.target.style.boxShadow = "var(--shadow-focus)"; }}
            onBlur={(e) => { e.target.style.borderColor = "var(--border-default)"; e.target.style.boxShadow = "none"; }}
          />
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "24px 32px" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 24px" }}>
            <p style={{ color: "var(--fg-tertiary)", fontSize: 15 }}>
              {busca ? "Nenhum terreno encontrado para esta busca." : "Nenhum terreno cadastrado ainda."}
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 18 }}>
            {filtered.map((t) => {
              const statusInfo = STATUS_TERRENO[t.status as keyof typeof STATUS_TERRENO] ?? STATUS_TERRENO.disponivel;

              return (
                <div
                  key={t.id}
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-lg)",
                    boxShadow: "var(--shadow-xs)",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <Link
                    href={`/terrenos/${t.id}`}
                    style={{
                      textAlign: "left",
                      background: "transparent",
                      padding: "18px 20px 14px",
                      textDecoration: "none",
                      display: "block",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 4 }}>
                      <h3 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 500, color: "var(--fg-primary)" }}>
                        {t.nome}
                      </h3>
                      <Badge label={statusInfo.label} color={statusInfo.color} bg={statusInfo.bg} dot />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--fg-tertiary)" }}>
                      <MapPin size={14} />
                      {t.numero ? `${t.numero} · ` : ""}
                      {t.cidade}
                    </div>

                    <div style={{ display: "flex", gap: 24, marginTop: 16 }}>
                      <div>
                        <div style={metaLbl}>Área</div>
                        <div style={metaVal}>{fmtArea(t.area)}</div>
                      </div>
                      {t.valorCompra != null && (
                        <div>
                          <div style={metaLbl}>Aquisição</div>
                          <div style={metaVal}>{fmtBRLshort(t.valorCompra)}</div>
                        </div>
                      )}
                      {t.aquisicao && (
                        <div>
                          <div style={metaLbl}>Desde</div>
                          <div style={metaVal}>{fmtDate(t.aquisicao)}</div>
                        </div>
                      )}
                    </div>

                    <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 14, fontSize: 13, fontWeight: 600, color: "var(--navy-700)" }}>
                      Ver detalhes e fotos <ArrowRight size={15} />
                    </div>
                  </Link>

                  {/* Obras vinculadas */}
                  <div
                    style={{
                      borderTop: "1px solid var(--border-subtle)",
                      background: "var(--ink-50)",
                      padding: "12px 20px",
                      marginTop: "auto",
                    }}
                  >
                    <div style={{ fontSize: 11.5, color: "var(--fg-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: t.obras.length ? 8 : 0 }}>
                      {t.obras.length} obra(s) neste terreno
                    </div>
                    {t.obras.map((o) => {
                      const obraStatus = STATUS_OBRA[o.status as keyof typeof STATUS_OBRA] ?? STATUS_OBRA.planejamento;
                      return (
                        <Link
                          key={o.id}
                          href={`/obras/${o.id}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 8,
                            padding: "4px 0",
                            textDecoration: "none",
                          }}
                        >
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--navy-700)", fontWeight: 600 }}>
                            <Building2 size={15} />
                            {o.nome}
                          </span>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <Badge label={obraStatus.label} color={obraStatus.color} bg={obraStatus.bg} />
                            <ChevronRight size={14} style={{ color: "var(--fg-muted)" }} />
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showNew && (
        <TerrenoForm action={criarTerreno} onClose={closeNew} />
      )}
    </>
  );
}
