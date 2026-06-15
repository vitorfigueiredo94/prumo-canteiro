"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { MapPinned, Image as ImageIcon, Pencil, Building2, ChevronRight, FolderOpen, CheckSquare } from "lucide-react";
import { DocumentosTab } from "@/components/ui/documentos-tab";
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

const FASE_TERRENO: Record<string, string> = {
  TERRENO_PREPARACAO: "Preparação",
  TERRENO_ANALISE: "Análise Documental",
  TERRENO_PROPOSTA: "Proposta",
  TERRENO_POS_VENDA: "Pós-venda",
};

interface ChecklistItem { id: string; descricao: string; concluido: boolean; }
interface ChecklistCl { id: string; fase: string; total: number; concluidos: number; porcentagem: number; itens: ChecklistItem[]; }

function ChecklistTab({ terrenoId }: { terrenoId: string }) {
  const [data, setData] = useState<ChecklistCl[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/v1/checklist/terreno/${terrenoId}`);
    const json = await res.json();
    setData(json.checklists ?? []);
    setLoading(false);
  }, [terrenoId]);

  useEffect(() => { refresh(); }, [refresh]);

  const toggle = async (itemId: string, current: boolean) => {
    setToggling(itemId);
    await fetch(`/api/v1/checklist/item/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ concluido: !current }),
    });
    await refresh();
    setToggling(null);
  };

  if (loading) return <p style={{ textAlign: "center", padding: "40px 0", color: "var(--fg-tertiary)", fontSize: 15 }}>Carregando checklist…</p>;
  if (!data || data.length === 0) return <p style={{ textAlign: "center", padding: "40px 0", color: "var(--fg-tertiary)", fontSize: 15 }}>Nenhum checklist criado para este terreno.</p>;

  const totalGeral = data.reduce((s, cl) => s + cl.total, 0);
  const concluidosGeral = data.reduce((s, cl) => s + cl.concluidos, 0);
  const pctGeral = totalGeral === 0 ? 0 : Math.round((concluidosGeral / totalGeral) * 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 720 }}>
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "16px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-secondary)" }}>Progresso geral</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: pctGeral === 100 ? "var(--success-500)" : "var(--navy-700)" }}>{concluidosGeral}/{totalGeral} · {pctGeral}%</span>
        </div>
        <div style={{ height: 8, background: "var(--ink-100)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
          <div style={{ width: `${pctGeral}%`, height: "100%", background: pctGeral === 100 ? "var(--success-500)" : "var(--navy-700)", borderRadius: "var(--radius-full)", transition: "width 500ms" }} />
        </div>
      </div>

      {data.map((cl) => (
        <div key={cl.id} style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 14.5, fontWeight: 600, color: "var(--fg-primary)" }}>{FASE_TERRENO[cl.fase] ?? cl.fase}</span>
              <span style={{ fontSize: 12.5, color: "var(--fg-muted)" }}>{cl.concluidos}/{cl.total} · {cl.porcentagem}%</span>
            </div>
            <div style={{ height: 5, background: "var(--ink-100)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
              <div style={{ width: `${cl.porcentagem}%`, height: "100%", background: cl.porcentagem === 100 ? "var(--success-500)" : "var(--navy-500)", borderRadius: "var(--radius-full)", transition: "width 400ms" }} />
            </div>
          </div>
          <div>
            {cl.itens.map((item, idx) => (
              <label key={item.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "11px 20px", cursor: toggling === item.id ? "wait" : "pointer", borderBottom: idx < cl.itens.length - 1 ? "1px solid var(--border-subtle)" : "none", background: item.concluido ? "var(--ink-50)" : "transparent" }}>
                <input type="checkbox" checked={item.concluido} onChange={() => toggle(item.id, item.concluido)} disabled={toggling === item.id} style={{ width: 16, height: 16, marginTop: 2, accentColor: "var(--navy-700)", cursor: "pointer", flexShrink: 0 }} />
                <span style={{ fontSize: 14, color: item.concluido ? "var(--fg-muted)" : "var(--fg-primary)", textDecoration: item.concluido ? "line-through" : "none", lineHeight: 1.5 }}>{item.descricao}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

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
  const [tab, setTab] = useState<"geral" | "documentos" | "checklist">("geral");
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
          <button style={tabBtn(tab === "checklist")} onClick={() => setTab("checklist")}>
            <CheckSquare size={15} /> Checklist
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

        {tab === "checklist" && <ChecklistTab terrenoId={terreno.id} />}

        {tab === "documentos" && (
          <DocumentosTab ownerType="terreno" ownerId={terreno.id} />
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
