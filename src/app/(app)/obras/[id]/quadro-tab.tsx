"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { fmtBRL } from "@/lib/format";

interface Tarefa {
  id: string;
  titulo: string;
  categoria: string | null;
  status: string;
  responsavel: string | null;
  custo: number | null;
  ordem: number;
}

interface ObraLite {
  id: string;
  nome: string;
  endereco: string | null;
  cidade: string | null;
  cep: string | null;
}

const COLUNAS: { key: string; label: string; cor: string }[] = [
  { key: "a_fazer",     label: "A fazer",      cor: "#64748b" },
  { key: "em_execucao", label: "Em execução",  cor: "#d97706" },
  { key: "concluido",   label: "Concluído",    cor: "#16a34a" },
];

// Etapas comuns de obra — sugestões de um clique
const SUGESTOES = [
  "Fundação", "Alvenaria", "Estrutura", "Reboco", "Piso", "Revestimento",
  "Hidráulica", "Elétrica", "Iluminação", "Forro", "Esquadrias", "Pintura",
  "Telhado", "Impermeabilização", "Acabamento", "Limpeza final",
];

// cor estável por categoria (hash simples)
const CAT_CORES = ["#1e3a5f", "#b45309", "#6d28d9", "#047857", "#b91c1c", "#0369a1", "#be185d"];
function catCor(cat: string) {
  let h = 0;
  for (const c of cat) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return CAT_CORES[h % CAT_CORES.length];
}

export function QuadroTab({ obra }: { obra: ObraLite }) {
  const [tarefas, setTarefas] = useState<Tarefa[] | null>(null);
  const [novoTitulo, setNovoTitulo] = useState<Record<string, string>>({});
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const res = await fetch(`/api/v1/obras/${obra.id}/tarefas`);
    const json = await res.json();
    setTarefas(json.tarefas ?? []);
  }, [obra.id]);

  useEffect(() => { carregar(); }, [carregar]);

  async function adicionar(status: string, tituloArg?: string) {
    const titulo = (tituloArg ?? novoTitulo[status] ?? "").trim();
    if (!titulo) return;
    if (!tituloArg) setNovoTitulo((p) => ({ ...p, [status]: "" }));
    const res = await fetch(`/api/v1/obras/${obra.id}/tarefas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo, status }),
    });
    const json = await res.json();
    if (json.tarefa) setTarefas((prev) => [...(prev ?? []), json.tarefa]);
  }

  async function mover(id: string, status: string) {
    setTarefas((prev) => (prev ?? []).map((t) => (t.id === id ? { ...t, status } : t)));
    await fetch(`/api/v1/obras/${obra.id}/tarefas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  async function remover(id: string) {
    setTarefas((prev) => (prev ?? []).filter((t) => t.id !== id));
    await fetch(`/api/v1/obras/${obra.id}/tarefas/${id}`, { method: "DELETE" });
  }

  function avisarWhatsApp(t: Tarefa) {
    const endParts = [obra.endereco, obra.cep, obra.cidade].filter(Boolean);
    const mapsLink = endParts.length > 0 ? `https://maps.google.com/?q=${encodeURIComponent(endParts.join(", "))}` : null;
    const linhas = [
      `🏗️ *${obra.nome}*`, ``,
      `📋 *Tarefa:* ${t.titulo}`,
      t.categoria ? `🏷️ *Etapa:* ${t.categoria}` : null,
      endParts.length > 0 ? `📍 *Endereço:* ${endParts.join(", ")}` : null,
      mapsLink ? `🗺️ ${mapsLink}` : null,
    ].filter((l) => l !== null);
    // sem número → o WhatsApp deixa escolher o contato
    window.open(`https://wa.me/?text=${encodeURIComponent(linhas.join("\n"))}`, "_blank", "noopener,noreferrer");
  }

  if (tarefas === null) {
    return <p style={{ textAlign: "center", padding: "40px 0", color: "var(--fg-tertiary)", fontSize: 15 }}>Carregando quadro…</p>;
  }

  const usados = new Set(tarefas.map((t) => t.titulo.trim().toLowerCase()));
  const sugestoesDisp = SUGESTOES.filter((s) => !usados.has(s.toLowerCase()));

  return (
    <div>
      <p style={{ margin: "0 0 16px", fontSize: 13.5, color: "var(--fg-tertiary)" }}>
        Arraste as tarefas entre as colunas conforme a obra avança. {tarefas.length} tarefa(s).
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, alignItems: "start" }}>
        {COLUNAS.map((col) => {
          const cards = tarefas.filter((t) => t.status === col.key);
          const totalCol = cards.reduce((s, c) => s + (c.custo ?? 0), 0);
          return (
            <div
              key={col.key}
              onDragOver={(e) => { e.preventDefault(); setDragOver(col.key); }}
              onDragLeave={() => setDragOver((c) => (c === col.key ? null : c))}
              onDrop={() => { if (dragId) mover(dragId, col.key); setDragId(null); setDragOver(null); }}
              style={{
                background: dragOver === col.key ? "var(--ink-100)" : "var(--ink-50)",
                border: `1px solid ${dragOver === col.key ? col.cor : "var(--border-subtle)"}`,
                borderRadius: "var(--radius-lg)", padding: 12, minHeight: 200, transition: "background 120ms",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, padding: "0 4px" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13.5, fontWeight: 700, color: "var(--fg-secondary)" }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: col.cor }} />
                  {col.label}
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-muted)", background: "var(--bg-surface)", borderRadius: 20, padding: "1px 8px" }}>{cards.length}</span>
                </span>
                {totalCol > 0 && <span style={{ fontSize: 11.5, color: "var(--fg-muted)" }}>{fmtBRL(totalCol)}</span>}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {cards.map((t) => (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={() => setDragId(t.id)}
                    onDragEnd={() => { setDragId(null); setDragOver(null); }}
                    style={{
                      background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)",
                      padding: "10px 12px", cursor: "grab", boxShadow: "var(--shadow-xs)",
                      opacity: dragId === t.id ? 0.5 : 1,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <GripVertical size={14} style={{ color: "var(--fg-muted)", marginTop: 2, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {t.categoria && (
                          <span style={{ display: "inline-block", fontSize: 10, fontWeight: 700, color: "#fff", background: catCor(t.categoria), padding: "1px 7px", borderRadius: 20, marginBottom: 5 }}>{t.categoria}</span>
                        )}
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--fg-primary)", lineHeight: 1.35 }}>{t.titulo}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
                          {t.responsavel && <span style={{ fontSize: 11.5, color: "var(--fg-tertiary)" }}>👷 {t.responsavel}</span>}
                          {t.custo != null && t.custo > 0 && <span style={{ fontSize: 11.5, color: "var(--fg-tertiary)" }}>{fmtBRL(t.custo)}</span>}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 4, marginTop: 8 }}>
                      <button onClick={() => avisarWhatsApp(t)} title="Avisar no WhatsApp" style={{ height: 26, padding: "0 9px", border: "1px solid #25d366", borderRadius: "var(--radius-md)", background: "transparent", color: "#25d366", cursor: "pointer", fontSize: 11.5, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>📲 Avisar</button>
                      <button onClick={() => remover(t.id)} title="Remover" style={{ width: 26, height: 26, border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "transparent", color: "#dc2626", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Trash2 size={12} /></button>
                    </div>
                  </div>
                ))}

                {/* Adicionar tarefa */}
                <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                  <input
                    value={novoTitulo[col.key] ?? ""}
                    onChange={(e) => setNovoTitulo((p) => ({ ...p, [col.key]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter") adicionar(col.key); }}
                    placeholder="+ Nova tarefa…"
                    style={{ flex: 1, height: 34, padding: "0 10px", border: "1px dashed var(--border-default)", borderRadius: "var(--radius-md)", background: "transparent", color: "var(--fg-primary)", fontFamily: "var(--font-sans)", fontSize: 13, outline: "none" }}
                  />
                  <button onClick={() => adicionar(col.key)} disabled={!(novoTitulo[col.key] ?? "").trim()} style={{ width: 34, height: 34, border: "none", borderRadius: "var(--radius-md)", background: "#1e3a5f", color: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", opacity: (novoTitulo[col.key] ?? "").trim() ? 1 : 0.5 }}><Plus size={16} /></button>
                </div>

                {/* Sugestões padrão (só na coluna "A fazer") */}
                {col.key === "a_fazer" && sugestoesDisp.length > 0 && (
                  <div style={{ marginTop: 4 }}>
                    <div style={{ fontSize: 10.5, color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, marginBottom: 6 }}>Etapas comuns — toque para adicionar</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {sugestoesDisp.map((s) => (
                        <button
                          key={s}
                          onClick={() => adicionar("a_fazer", s)}
                          style={{ padding: "4px 10px", border: "1px dashed var(--border-default)", borderRadius: "var(--radius-full)", background: "transparent", color: "var(--fg-secondary)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 3 }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--navy-600)"; (e.currentTarget as HTMLElement).style.color = "var(--navy-700)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-default)"; (e.currentTarget as HTMLElement).style.color = "var(--fg-secondary)"; }}
                        >
                          + {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
