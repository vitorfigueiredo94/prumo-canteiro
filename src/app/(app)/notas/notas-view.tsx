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
  const [busca, setBusca] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Nota | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = notas
    .filter((n) => filtro === "todos" || n.status === filtro)
    .filter((n) => !busca.trim() || (n.fornecedor ?? "").toLowerCase().includes(busca.toLowerCase()) || n.obra.nome.toLowerCase().includes(busca.toLowerCase()) || (n.numero ?? "").includes(busca));

  const totalConfirmado = notas.filter((n) => n.status === "confirmada").reduce((s, n) => s + n.valor, 0);
  const totalPendente = notas.filter((n) => n.status === "pendente").reduce((s, n) => s + n.valor, 0);

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
      <div style={{ padding: "22px 32px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-surface)" }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 500, color: "var(--fg-primary)", letterSpacing: "-0.015em", lineHeight: 1.1 }}>Notas Fiscais</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--fg-tertiary)" }}>
            Confirmado: <strong style={{ color: "var(--fg-secondary)" }}>{fmtBRL(totalConfirmado)}</strong>
            &nbsp;· Pendente: <strong style={{ color: "var(--warning-700)" }}>{fmtBRL(totalPendente)}</strong>
          </p>
        </div>
        <button onClick={() => setShowNew(true)} style={{ height: 40, padding: "0 16px", background: "var(--navy-700)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 }}>
          <Plus size={16} /> Lançar NF
        </button>
      </div>

      {/* Filtros + busca */}
      <div style={{ padding: "12px 32px", background: "var(--bg-surface)", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {STATUS_FILTER.map((f) => {
            const on = filtro === f.k;
            return (
              <button key={f.k} onClick={() => setFiltro(f.k)} style={{ padding: "7px 14px", borderRadius: "var(--radius-full)", fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)", border: `1px solid ${on ? "var(--navy-600)" : "var(--border-default)"}`, background: on ? "var(--navy-700)" : "var(--bg-surface)", color: on ? "#fff" : "var(--fg-secondary)" }}>
                {f.l}
              </button>
            );
          })}
        </div>
        <div style={{ position: "relative" }}>
          <Search size={15} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--fg-muted)", pointerEvents: "none" }} />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar NF…" style={{ height: 38, padding: "0 12px 0 34px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-surface)", color: "var(--fg-primary)", fontFamily: "var(--font-sans)", fontSize: 14, width: 260, outline: "none" }} onFocus={(e) => { e.target.style.borderColor = "var(--border-focus)"; e.target.style.boxShadow = "var(--shadow-focus)"; }} onBlur={(e) => { e.target.style.borderColor = "var(--border-default)"; e.target.style.boxShadow = "none"; }} />
        </div>
      </div>

      {/* Table */}
      <div style={{ padding: "24px 32px", overflowX: "auto" }}>
        {filtered.length === 0 ? (
          <p style={{ textAlign: "center", padding: "60px 0", color: "var(--fg-tertiary)", fontSize: 15 }}>Nenhuma nota encontrada.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-sans)", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border-subtle)" }}>
                {["Fornecedor", "Obra", "Categoria", "Emissão", "Valor", "Situação", "Ações"].map((h) => (
                  <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
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
                  <tr key={n.id} style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-surface)" }}>
                    <td style={{ padding: "12px 12px" }}>
                      <p style={{ margin: 0, fontWeight: 500, color: "var(--fg-primary)" }}>{n.fornecedor ?? "—"}</p>
                      {n.numero && <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--fg-muted)" }}>NF-e {n.numero}</p>}
                    </td>
                    <td style={{ padding: "12px 12px" }}>
                      <Link href={`/obras/${n.obra.id}`} style={{ color: "var(--navy-700)", textDecoration: "none", fontWeight: 500 }}>{n.obra.nome}</Link>
                    </td>
                    <td style={{ padding: "12px 12px", color: "var(--fg-tertiary)" }}>{cat}</td>
                    <td style={{ padding: "12px 12px", color: "var(--fg-tertiary)" }}>{fmtDate(n.emitidaEm)}</td>
                    <td style={{ padding: "12px 12px", fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 500, color: "var(--fg-primary)" }}>{fmtBRL(n.valor)}</td>
                    <td style={{ padding: "12px 12px" }}><Badge label={st.label} color={st.color} bg={st.bg} /></td>
                    <td style={{ padding: "12px 12px" }}>
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
        )}
      </div>

      {showNew && <NotaForm action={criarNota} obras={obras} onClose={closeNew} />}
      {editing && <NotaForm action={editAction(editing.id)} obras={obras} onClose={closeEdit} isEdit initial={{ id: editing.id, obraId: editing.obra.id, categoria: editing.categoria, valor: editing.valor, fornecedor: editing.fornecedor, numero: editing.numero, descricao: editing.descricao, emitidaEm: editing.emitidaEm, status: editing.status }} />}
    </>
  );
}
