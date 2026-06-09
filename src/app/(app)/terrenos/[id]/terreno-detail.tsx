"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { MapPinned, Image as ImageIcon, Pencil, Building2, ChevronRight, FolderOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TerrenoForm } from "../terreno-form";
import { editarTerreno } from "../actions";
import { STATUS_TERRENO, STATUS_OBRA } from "@/lib/status";
import { fmtBRL, fmtDate, fmtArea } from "@/lib/format";

interface Obra {
  id: string;
  nome: string;
  status: string;
  orcamento: number;
  progresso: number;
  inicio: string | null;
  prazo: string | null;
}

interface Venda {
  id: string;
  comprador: string;
  valorTotal: number;
  dataVenda: string;
}

interface Terreno {
  id: string;
  nome: string;
  numero: string | null;
  endereco: string | null;
  cidade: string;
  area: number;
  status: string;
  aquisicao: string | null;
  valorCompra: number | null;
  obras: Obra[];
  vendas: Venda[];
}

const tabBtn = (active: boolean): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  padding: "10px 14px",
  background: "transparent",
  border: "none",
  borderBottom: `2px solid ${active ? "var(--navy-700)" : "transparent"}`,
  color: active ? "var(--fg-primary)" : "var(--fg-tertiary)",
  fontSize: 14,
  fontWeight: active ? 700 : 500,
  cursor: "pointer",
  fontFamily: "var(--font-sans)",
  whiteSpace: "nowrap",
  marginBottom: -1,
});

function DetGrid({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "var(--ink-50)", borderRadius: "var(--radius-md)", padding: "12px 14px" }}>
      <div style={{ fontSize: 11, color: "var(--fg-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg-primary)", fontFamily: "var(--font-sans)" }}>
        {value}
      </div>
    </div>
  );
}

export function TerrenoDetail({ terreno }: { terreno: Terreno }) {
  const [tab, setTab] = useState<"geral" | "documentos">("geral");
  const [editing, setEditing] = useState(false);

  const statusInfo = STATUS_TERRENO[terreno.status as keyof typeof STATUS_TERRENO] ?? STATUS_TERRENO.disponivel;
  const venda = terreno.vendas[0];

  const closeEdit = useCallback(() => setEditing(false), []);
  const editAction = useCallback(
    (_prev: any, fd: FormData) => editarTerreno(terreno.id, _prev, fd),
    [terreno.id]
  );

  return (
    <>
      {/* Page header */}
      <div
        style={{
          padding: "22px 32px",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg-surface)",
        }}
      >
        <Link
          href="/terrenos"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontSize: 13,
            color: "var(--fg-tertiary)",
            textDecoration: "none",
            marginBottom: 6,
          }}
        >
          ← Terrenos
        </Link>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 500, color: "var(--fg-primary)", letterSpacing: "-0.015em", lineHeight: 1.1 }}>
              {terreno.nome}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
              <Badge label={statusInfo.label} color={statusInfo.color} bg={statusInfo.bg} dot />
              <span style={{ fontSize: 13, color: "var(--fg-tertiary)" }}>
                {terreno.numero ? `${terreno.numero} · ` : ""}
                {terreno.cidade}
              </span>
            </div>
          </div>
          <button
            onClick={() => setEditing(true)}
            style={{
              height: 36,
              padding: "0 14px",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              background: "transparent",
              color: "var(--fg-secondary)",
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
              fontSize: 13.5,
              fontWeight: 500,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Pencil size={14} />
            Editar
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border-subtle)", marginTop: 18, marginBottom: -23 }}>
          <button style={tabBtn(tab === "geral")} onClick={() => setTab("geral")}>
            <MapPinned size={15} /> Visão geral
          </button>
          <button style={tabBtn(tab === "documentos")} onClick={() => setTab("documentos")}>
            <FolderOpen size={15} /> Documentos
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "28px 32px" }}>
        {tab === "geral" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 720 }}>
            {/* Dados gerais */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
              <DetGrid label="Numeração / matrícula" value={terreno.numero ?? "—"} />
              <DetGrid label="Área" value={fmtArea(terreno.area)} />
              <DetGrid label="Endereço" value={terreno.endereco ?? "—"} />
              <DetGrid label="Cidade" value={terreno.cidade} />
              <DetGrid label="Valor de aquisição" value={terreno.valorCompra ? fmtBRL(terreno.valorCompra) : "—"} />
              <DetGrid label="Adquirido em" value={terreno.aquisicao ? fmtDate(terreno.aquisicao) : "—"} />
            </div>

            {/* Venda */}
            {venda && (
              <div style={{ padding: "14px 16px", background: "var(--gold-50)", border: "1px solid var(--gold-200)", borderRadius: "var(--radius-md)" }}>
                <div style={{ fontSize: 11, color: "var(--gold-600)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginBottom: 4 }}>
                  Venda registrada
                </div>
                <div style={{ fontSize: 14, color: "var(--fg-secondary)" }}>
                  Vendido para <strong style={{ color: "var(--fg-primary)" }}>{venda.comprador}</strong> em {fmtDate(venda.dataVenda)} — {fmtBRL(venda.valorTotal)}
                </div>
              </div>
            )}

            {/* Obras */}
            <div>
              <div style={{ fontSize: 11, color: "var(--fg-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginBottom: 10 }}>
                Obras neste terreno ({terreno.obras.length})
              </div>
              {terreno.obras.length === 0 ? (
                <p style={{ fontSize: 13.5, color: "var(--fg-tertiary)" }}>Nenhuma obra vinculada a este terreno.</p>
              ) : (
                <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                  {terreno.obras.map((o, i) => {
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
                          padding: "12px 14px",
                          textDecoration: "none",
                          borderBottom: i < terreno.obras.length - 1 ? "1px solid var(--border-subtle)" : "none",
                          background: "var(--bg-surface)",
                        }}
                      >
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 9, fontSize: 14, color: "var(--navy-700)", fontWeight: 600 }}>
                          <Building2 size={16} />
                          {o.nome}
                        </span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                          <Badge label={obraStatus.label} color={obraStatus.color} bg={obraStatus.bg} />
                          <ChevronRight size={15} style={{ color: "var(--fg-muted)" }} />
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "documentos" && (
          <div style={{ maxWidth: 720 }}>
            <div
              style={{
                width: "100%",
                border: "2px dashed var(--border-default)",
                borderRadius: "var(--radius-lg)",
                background: "var(--ink-50)",
                padding: "40px 24px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                textAlign: "center",
              }}
            >
              <span style={{ width: 46, height: 46, borderRadius: "var(--radius-lg)", background: "var(--navy-50)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--navy-600)" }}>
                <FolderOpen size={24} />
              </span>
              <p style={{ fontSize: 14.5, fontWeight: 600, color: "var(--fg-primary)", margin: 0 }}>Upload de documentos</p>
              <p style={{ fontSize: 13, color: "var(--fg-tertiary)", margin: 0 }}>
                Upload para Supabase Storage será ativado na Etapa 7.
              </p>
            </div>
          </div>
        )}
      </div>

      {editing && (
        <TerrenoForm
          action={editAction}
          onClose={closeEdit}
          initial={terreno as any}
          isEdit
        />
      )}
    </>
  );
}
