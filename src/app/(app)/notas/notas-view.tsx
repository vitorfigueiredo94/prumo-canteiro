"use client";

import { useState, useCallback, useTransition } from "react";
import Link from "next/link";
import { Plus, Search, Check, X, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { NotaForm } from "./nota-form";
import { criarNota, editarNota, atualizarStatusNota, excluirNota } from "./actions";
import { STATUS_NF, CATEGORIA_NF } from "@/lib/status";
import { fmtBRL, fmtDate } from "@/lib/format";
import type { NotaFormState } from "./actions";

interface ObraLite { id: string; nome: string; }
interface Nota {
  id: string; numero: string | null; categoria: string; valor: number; status: string;
  fornecedor: string | null; descricao: string | null; emitidaEm: string | null;
  obra: ObraLite;
}

const STATUS_FILTER = [
  { k: "todos", l: "Todas" },
  { k: "pendente", l: "Pendentes" },
  { k: "em_revisao", l: "Em revisão" },
  { k: "confirmada", l: "Confirmadas" },
  { k: "cancelada", l: "Canceladas" },
];

export function NotasView({ notas, obras }: { notas: Nota[]; obras: ObraLite[] }) {
  const [filtro, setFiltro] = useState("todos");
  const [obraFiltro, setObraFiltro] = useState("");
  const [busca, setBusca] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Nota | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = notas
    .filter((n) => !obraFiltro || n.obra.id === obraFiltro)
    .filter((n) => filtro === "todos" || n.status === filtro)
    .filter((n) => !busca.trim() || (n.fornecedor ?? "").toLowerCase().includes(busca.toLowerCase()) || n.obra.nome.toLowerCase().includes(busca.toLowerCase()) || (n.numero ?? "").includes(busca));

  const totalConfirmado = notas.filter((n) => n.status === "confirmada").reduce((s, n) => s + n.valor, 0);
  const totalRevisao = notas.filter((n) => n.status === "em_revisao").reduce((s, n) => s + n.valor, 0);

  const closeNew = useCallback(() => setShowNew(false), []);
  const closeEdit = useCallback(() => setEditing(null), []);

  const editAction = useCallback(
    (id: string) => (prev: NotaFormState, fd: FormData) => editarNota(id, prev, fd),
    []
  );

  const handleConfirmar = (id: string) => startTransition(() => atualizarStatusNota(id, "confirmada"));
  const handleCancelar = (id: string) => startTransition(() => atualizarStatusNota(id, "cancelada"));
  const handleExcluir = (id: string) => startTransition(() => excluirNota(id));

  return (
    <>
      {/* Header */}
      <div className="px-4 md:px-8 py-5" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-surface)" }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 500, color: "var(--fg-primary)", letterSpacing: "-0.015em", lineHeight: 1.1 }}>Notas Fiscais</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--fg-tertiary)" }}>{notas.length} nota{notas.length !== 1 ? "s" : ""} no total</p>
        </div>
        <button onClick={() => setShowNew(true)} style={{ height: 40, padding: "0 16px", background: "var(--navy-700)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 }}>
          <Plus size={16} /> Lançar NF
        </button>
      </div>

      {/* Content */}
      <div className="px-4 md:px-8 py-6">
        {/* KPI cards */}
        <div className="grid grid-cols-2 md:[grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]" style={{ gap: 16, marginBottom: 24 }}>
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "16px 20px", boxShadow: "var(--shadow-xs)" }}>
            <div style={{ fontSize: 11.5, color: "var(--fg-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Notas confirmadas</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 400, color: "var(--fg-primary)", letterSpacing: "-0.02em", marginTop: 4 }}>{notas.filter((n) => n.status === "confirmada").length}</div>
            <div style={{ fontSize: 12.5, color: "var(--fg-tertiary)", marginTop: 2 }}>{fmtBRL(totalConfirmado)} lançados</div>
          </div>
          <div style={{ background: "var(--bg-surface)", border: `1px solid ${totalRevisao ? "var(--warning-200,#fde68a)" : "var(--border-subtle)"}`, borderRadius: "var(--radius-lg)", padding: "16px 20px", boxShadow: "var(--shadow-xs)" }}>
            <div style={{ fontSize: 11.5, color: "var(--fg-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Em revisão</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 400, color: totalRevisao ? "var(--warning-700)" : "var(--fg-primary)", letterSpacing: "-0.02em", marginTop: 4 }}>{notas.filter((n) => n.status === "em_revisao").length}</div>
            <div style={{ fontSize: 12.5, color: "var(--fg-tertiary)", marginTop: 2 }}>{fmtBRL(totalRevisao)} a confirmar</div>
          </div>
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "16px 20px", boxShadow: "var(--shadow-xs)" }}>
            <div style={{ fontSize: 11.5, color: "var(--fg-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Total de notas</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 400, color: "var(--fg-primary)", letterSpacing: "-0.02em", marginTop: 4 }}>{notas.length}</div>
            <div style={{ fontSize: 12.5, color: "var(--fg-tertiary)", marginTop: 2 }}>todas as obras</div>
          </div>
        </div>

        {/* Filtros + busca */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <select value={obraFiltro} onChange={(e) => setObraFiltro(e.target.value)} style={{ height: 38, padding: "0 12px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-surface)", color: obraFiltro ? "var(--fg-primary)" : "var(--fg-muted)", fontFamily: "var(--font-sans)", fontSize: 14, cursor: "pointer", outline: "none", minWidth: 200 }}>
              <option value="">Todas as obras</option>
              {obras.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
            </select>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {STATUS_FILTER.map((f) => {
                const on = filtro === f.k;
                return (
                  <button key={f.k} onClick={() => setFiltro(f.k)} style={{ padding: "7px 14px", borderRadius: "var(--radius-full)", fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)", border: `1px solid ${on ? "var(--navy-600)" : "var(--border-default)"}`, background: on ? "var(--navy-700)" : "var(--bg-surface)", color: on ? "#fff" : "var(--fg-secondary)" }}>
                    {f.l}
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ position: "relative" }}>
            <Search size={15} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--fg-muted)", pointerEvents: "none" }} />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar NF…" style={{ height: 38, padding: "0 12px 0 34px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-surface)", color: "var(--fg-primary)", fontFamily: "var(--font-sans)", fontSize: 14, width: 240, outline: "none" }} onFocus={(e) => { e.target.style.borderColor = "var(--border-focus)"; e.target.style.boxShadow = "var(--shadow-focus)"; }} onBlur={(e) => { e.target.style.borderColor = "var(--border-default)"; e.target.style.boxShadow = "none"; }} />
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <p style={{ textAlign: "center", padding: "60px 0", color: "var(--fg-tertiary)", fontSize: 15 }}>Nenhuma nota encontrada.</p>
        ) : (
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-xs)", overflow: "hidden" }}>
            {/* Mobile (< md): cartões empilhados */}
            <div className="md:hidden" style={{ display: "flex", flexDirection: "column" }}>
              {filtered.map((n, i, arr) => {
                const st = STATUS_NF[n.status as keyof typeof STATUS_NF] ?? STATUS_NF.pendente;
                const cat = CATEGORIA_NF[n.categoria as keyof typeof CATEGORIA_NF]?.label ?? n.categoria;
                const canConfirm = n.status === "pendente" || n.status === "em_revisao";
                const canCancel = n.status !== "cancelada";
                return (
                  <div key={n.id} style={{ padding: "14px 16px", borderBottom: i < arr.length - 1 ? "1px solid var(--border-subtle)" : "none", display: "flex", flexDirection: "column", gap: 9 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 600, color: "var(--fg-primary)", fontSize: 14.5 }}>{n.fornecedor ?? "—"}</p>
                        {n.numero && <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--fg-muted)" }}>NF-e {n.numero}</p>}
                      </div>
                      <span style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 500, color: "var(--fg-primary)", whiteSpace: "nowrap" }}>{fmtBRL(n.valor)}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", fontSize: 13, color: "var(--fg-tertiary)" }}>
                      <Link href={`/obras/${n.obra.id}`} style={{ color: "var(--navy-700)", textDecoration: "none", fontWeight: 600 }}>{n.obra.nome}</Link>
                      <span>{cat}</span>
                      {n.emitidaEm && <span>{fmtDate(n.emitidaEm)}</span>}
                      <Badge label={st.label} color={st.color} bg={st.bg} />
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button title="Ver/editar" onClick={() => setEditing(n)} style={{ flex: 1, height: 44, border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-surface)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, color: "var(--fg-secondary)", fontFamily: "var(--font-sans)", fontSize: 13.5 }}><Eye size={15} /> Detalhes</button>
                      {canConfirm && <button title="Confirmar" disabled={isPending} onClick={() => handleConfirmar(n.id)} style={{ width: 44, height: 44, border: "1px solid rgba(47,125,74,0.4)", borderRadius: "var(--radius-md)", background: "var(--success-50)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--success-500)", flexShrink: 0 }}><Check size={16} /></button>}
                      {canCancel && <button title="Cancelar" disabled={isPending} onClick={() => handleCancelar(n.id)} style={{ width: 44, height: 44, border: "1px solid rgba(181,54,60,0.3)", borderRadius: "var(--radius-md)", background: "var(--danger-50)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--danger-500)", flexShrink: 0 }}><X size={16} /></button>}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Desktop (>= md): tabela */}
            <div className="hidden md:block" style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-sans)", fontSize: 14 }}>
                <thead>
                  <tr>
                    {["Fornecedor", "Obra", "Categoria", "Emissão", "Valor", "Situação", ""].map((h) => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11.5, fontWeight: 700, color: "var(--fg-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", background: "var(--ink-50)", borderBottom: "1px solid var(--border-subtle)", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((n) => {
                    const st = STATUS_NF[n.status as keyof typeof STATUS_NF] ?? STATUS_NF.pendente;
                    const cat = CATEGORIA_NF[n.categoria as keyof typeof CATEGORIA_NF]?.label ?? n.categoria;
                    const canConfirm = n.status === "pendente" || n.status === "em_revisao";
                    const canCancel = n.status !== "cancelada";

                    return (
                      <tr key={n.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        <td style={{ padding: "13px 14px" }}>
                          <p style={{ margin: 0, fontWeight: 600, color: "var(--fg-primary)", fontSize: 14.5 }}>{n.fornecedor ?? "—"}</p>
                          {n.numero && <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--fg-muted)" }}>NF-e {n.numero}</p>}
                        </td>
                        <td style={{ padding: "13px 14px" }}>
                          <Link href={`/obras/${n.obra.id}`} style={{ color: "var(--navy-700)", textDecoration: "none", fontWeight: 600, fontSize: 14 }}>{n.obra.nome}</Link>
                        </td>
                        <td style={{ padding: "13px 14px", color: "var(--fg-tertiary)", fontSize: 14 }}>{cat}</td>
                        <td style={{ padding: "13px 14px", color: "var(--fg-tertiary)", fontSize: 14, whiteSpace: "nowrap" }}>{fmtDate(n.emitidaEm)}</td>
                        <td style={{ padding: "13px 14px", fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 500, color: "var(--fg-primary)", whiteSpace: "nowrap" }}>{fmtBRL(n.valor)}</td>
                        <td style={{ padding: "13px 14px" }}><Badge label={st.label} color={st.color} bg={st.bg} /></td>
                        <td style={{ padding: "13px 14px" }}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button title="Editar" onClick={() => setEditing(n)} style={{ width: 30, height: 30, border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-surface)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--fg-tertiary)" }}><Eye size={14} /></button>
                            {canConfirm && <button title="Confirmar" disabled={isPending} onClick={() => handleConfirmar(n.id)} style={{ width: 30, height: 30, border: "1px solid rgba(47,125,74,0.4)", borderRadius: "var(--radius-md)", background: "var(--success-50)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--success-500)" }}><Check size={14} /></button>}
                            {canCancel && <button title="Cancelar" disabled={isPending} onClick={() => handleCancelar(n.id)} style={{ width: 30, height: 30, border: "1px solid rgba(181,54,60,0.3)", borderRadius: "var(--radius-md)", background: "var(--danger-50)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--danger-500)" }}><X size={14} /></button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showNew && <NotaForm action={criarNota} obras={obras} onClose={closeNew} />}
      {editing && <NotaForm action={editAction(editing.id)} obras={obras} onClose={closeEdit} isEdit initial={{ id: editing.id, obraId: editing.obra.id, categoria: editing.categoria, valor: editing.valor, fornecedor: editing.fornecedor, numero: editing.numero, descricao: editing.descricao, emitidaEm: editing.emitidaEm, status: editing.status }} />}
    </>
  );
}
