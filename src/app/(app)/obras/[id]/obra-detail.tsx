"use client";

import { useState, useCallback, useTransition, useEffect, Fragment } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, UserRound, Calendar, Edit2, TrendingUp, Receipt, Users, BookOpen, AlertTriangle, CheckSquare, FolderOpen } from "lucide-react";
import { DocumentosTab } from "@/components/ui/documentos-tab";
import { Badge } from "@/components/ui/badge";
import { ObraForm } from "../obra-form";
import { editarObra, confirmarNota, excluirNota } from "../actions";
import { STATUS_OBRA, STATUS_NF, CATEGORIA_NF } from "@/lib/status";
import { fmtBRL, fmtDate } from "@/lib/format";

interface Terreno { id: string; nome: string; cidade: string; }

interface Nota {
  id: string; numero: string | null; categoria: string; valor: number; status: string;
  fornecedor: string | null; descricao: string | null; emitidaEm: string | null;
  funcionario: { id: string; nome: string } | null;
}

interface Pagamento {
  id: string; valor: number; descricao: string | null; pagoEm: string | null;
  funcionario: { id: string; nome: string } | null;
}

interface Alocacao {
  id: string; cargo: string | null; inicio: string | null; fim: string | null;
  funcionario: { id: string; nome: string; cargo: string | null };
}

interface DiarioEntry {
  id: string; data: string | null; conteudo: string; autor: string | null; fotoUrl: string | null;
}

interface Obra {
  id: string; nome: string; status: string; orcamento: number; progresso: number;
  inicio: string | null; prazo: string | null; responsavel: string | null;
  terreno: (Terreno & { numero: string | null }) | null;
  notas: Nota[]; pagamentos: Pagamento[]; alocacoes: Alocacao[]; diario: DiarioEntry[];
}

// TABS are computed dynamically inside ObraDetail to show counts

const FASE_ORDER = ["OBRA_INICIO", "OBRA_MEIO", "OBRA_FIM"];
const FASE_LABELS: Record<string, string> = {
  OBRA_INICIO: "Início da obra",
  OBRA_MEIO: "Execução (meio)",
  OBRA_FIM: "Entrega (fim)",
};

interface ChecklistItem { id: string; descricao: string; concluido: boolean; observacao: string | null; }
interface ChecklistCl { id: string; fase: string; total: number; concluidos: number; porcentagem: number; itens: ChecklistItem[]; }

function ChecklistTab({ obraId }: { obraId: string }) {
  const [data, setData] = useState<ChecklistCl[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/v1/checklist/obra/${obraId}`);
    const json = await res.json();
    setData(json.checklists ?? []);
    setLoading(false);
  }, [obraId]);

  useEffect(() => { refresh(); }, [refresh]);

  const toggle = async (itemId: string, current: boolean) => {
    setToggling(itemId);
    await fetch(`/api/v1/checklist/item/${itemId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ concluido: !current }) });
    await refresh();
    setToggling(null);
  };

  const reabrir = async (cl: ChecklistCl) => {
    for (const item of cl.itens.filter((i) => i.concluido)) {
      await fetch(`/api/v1/checklist/item/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ concluido: false }) });
    }
    await refresh();
  };

  if (loading) return <p style={{ textAlign: "center", padding: "40px 0", color: "var(--fg-tertiary)", fontSize: 15 }}>Carregando checklist…</p>;
  if (!data || data.length === 0) return <p style={{ textAlign: "center", padding: "40px 0", color: "var(--fg-tertiary)", fontSize: 15 }}>Nenhum checklist criado para esta obra.</p>;

  const sorted = [...data].sort((a, b) => FASE_ORDER.indexOf(a.fase) - FASE_ORDER.indexOf(b.fase));
  const totalGeral = sorted.reduce((s, cl) => s + cl.total, 0);
  const concluidosGeral = sorted.reduce((s, cl) => s + cl.concluidos, 0);
  const pctGeral = totalGeral === 0 ? 0 : Math.round((concluidosGeral / totalGeral) * 100);
  const currentIdx = sorted.findIndex((cl) => cl.porcentagem < 100);
  const currentPhase = currentIdx >= 0 ? sorted[currentIdx] : sorted[sorted.length - 1];
  const r = 44, circ = 2 * Math.PI * r;
  const dashOffset = circ - (pctGeral / 100) * circ;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header card */}
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "24px 28px" }}>
        <h2 style={{ margin: "0 0 22px", fontSize: 17, fontWeight: 600, color: "var(--fg-primary)" }}>Checklist da obra</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 28, marginBottom: 28 }}>
          <svg width={100} height={100} viewBox="0 0 100 100" style={{ flexShrink: 0 }}>
            <circle cx={50} cy={50} r={r} fill="none" stroke="var(--ink-100)" strokeWidth={10} />
            <circle cx={50} cy={50} r={r} fill="none" stroke={pctGeral === 100 ? "#22c55e" : "#1e3a5f"} strokeWidth={10}
              strokeDasharray={circ} strokeDashoffset={dashOffset} strokeLinecap="round"
              transform="rotate(-90 50 50)" style={{ transition: "stroke-dashoffset 600ms" }} />
            <text x={50} y={51} dominantBaseline="middle" textAnchor="middle" fontSize={20} fontWeight={700} fontFamily="sans-serif" fill="#1a1f2e">{pctGeral}%</text>
          </svg>
          <div>
            <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--fg-muted)", textTransform: "uppercase" }}>Fase atual</p>
            <p style={{ margin: "0 0 6px", fontSize: 21, fontFamily: "var(--font-display)", fontWeight: 500, color: "var(--fg-primary)", display: "flex", alignItems: "center", gap: 8 }}>
              🔑 {FASE_LABELS[currentPhase?.fase ?? ""] ?? currentPhase?.fase}
            </p>
            <p style={{ margin: 0, fontSize: 13, color: "var(--fg-tertiary)" }}>{concluidosGeral} de {totalGeral} itens concluídos · Ciclo de vida da obra</p>
          </div>
        </div>
        {/* Phase stepper */}
        <div style={{ display: "flex", alignItems: "center" }}>
          {sorted.map((cl, i) => {
            const done = cl.porcentagem === 100;
            const cur = i === (currentIdx >= 0 ? currentIdx : sorted.length - 1);
            const label = FASE_LABELS[cl.fase] ?? cl.fase;
            return (
              <Fragment key={cl.id}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: done ? "#22c55e" : cur ? "#d97706" : "#e5e7eb", color: done || cur ? "#fff" : "#9ca3af", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, border: done || cur ? "none" : "2px solid #d1d5db" }}>
                    {done ? "✓" : i + 1}
                  </div>
                  <span style={{ fontSize: 11.5, color: done ? "#16a34a" : cur ? "#d97706" : "#9ca3af", fontWeight: cur ? 600 : 400, whiteSpace: "nowrap" }}>{label}</span>
                </div>
                {i < sorted.length - 1 && <div style={{ flex: 1, height: 2, background: done ? "#22c55e" : "#e5e7eb", marginBottom: 22, marginLeft: 6, marginRight: 6 }} />}
              </Fragment>
            );
          })}
        </div>
      </div>

      {/* Info banner */}
      {currentIdx > 0 && currentIdx < sorted.length && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: "var(--radius-md)", fontSize: 13.5, color: "#92400e" }}>
          <span style={{ fontSize: 16 }}>ℹ️</span>
          <span><strong>{FASE_LABELS[sorted[currentIdx - 1].fase]}</strong> concluída. Avance para <strong>{FASE_LABELS[currentPhase.fase]}</strong> marcando os itens abaixo.</span>
        </div>
      )}

      {/* Phase sections */}
      {sorted.map((cl) => (
        <div key={cl.id} style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 12 }}>
              {cl.porcentagem === 100 && (
                <div style={{ width: 24, height: 24, borderRadius: 4, background: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ color: "#fff", fontSize: 13, fontWeight: 700, lineHeight: 1 }}>✓</span>
                </div>
              )}
              <div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--fg-primary)" }}>{FASE_LABELS[cl.fase] ?? cl.fase}</p>
                <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--fg-muted)" }}>{cl.concluidos}/{cl.total} concluídos</p>
              </div>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: cl.porcentagem === 100 ? "#16a34a" : "#1e3a5f" }}>{cl.porcentagem}%</span>
            {cl.porcentagem === 100 && (
              <button onClick={() => reabrir(cl)} style={{ height: 30, padding: "0 12px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-surface)", color: "var(--fg-secondary)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 12.5 }}>Reabrir</button>
            )}
          </div>
          <div style={{ height: 4, background: "var(--ink-100)" }}>
            <div style={{ width: `${cl.porcentagem}%`, height: "100%", background: cl.porcentagem === 100 ? "#22c55e" : "#1e3a5f", transition: "width 400ms" }} />
          </div>
          {cl.itens.map((item) => (
            <div key={item.id} onClick={() => toggle(item.id, item.concluido)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 20px", borderTop: "1px solid var(--border-subtle)", cursor: toggling === item.id ? "wait" : "pointer" }}>
              <div style={{ width: 20, height: 20, borderRadius: 4, flexShrink: 0, background: item.concluido ? "#1e3a5f" : "transparent", border: `2px solid ${item.concluido ? "#1e3a5f" : "var(--border-default)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {item.concluido && <span style={{ color: "#fff", fontSize: 11, fontWeight: 700, lineHeight: 1 }}>✓</span>}
              </div>
              <span style={{ fontSize: 14, color: item.concluido ? "var(--fg-muted)" : "var(--fg-primary)", textDecoration: item.concluido ? "line-through" : "none", lineHeight: 1.5 }}>{item.descricao}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

const KPI = ({ label, value, sub, danger, green }: { label: string; value: string; sub?: string; danger?: boolean; green?: boolean }) => (
  <div style={{ background: "var(--bg-surface)", border: `1px solid ${danger ? "rgba(181,54,60,0.3)" : "var(--border-subtle)"}`, borderRadius: "var(--radius-lg)", padding: "18px 22px", flex: 1, minWidth: 160 }}>
    <p style={{ margin: "0 0 6px", fontSize: 11.5, color: "var(--fg-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</p>
    <p style={{ margin: 0, fontSize: 26, fontFamily: "var(--font-display)", fontWeight: 500, color: danger ? "var(--danger-500)" : green ? "#16a34a" : "var(--fg-primary)" }}>{value}</p>
    {sub && <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--fg-tertiary)" }}>{sub}</p>}
  </div>
);

export function ObraDetail({ obra, terrenos }: { obra: Obra; terrenos: Terreno[] }) {
  const [tab, setTab] = useState("financeiro");
  const [showEdit, setShowEdit] = useState(false);
  const [isPending, startTransition] = useTransition();

  const TABS = [
    { k: "financeiro", l: "Financeiro", Icon: TrendingUp },
    { k: "checklist", l: "Checklist", Icon: CheckSquare },
    { k: "notas", l: obra.notas.length > 0 ? `Notas fiscais (${obra.notas.length})` : "Notas fiscais", Icon: Receipt },
    { k: "equipe", l: obra.alocacoes.length > 0 ? `Equipe (${obra.alocacoes.length})` : "Equipe", Icon: Users },
    { k: "diario", l: "Diário", Icon: BookOpen },
    { k: "documentos", l: "Documentos", Icon: FolderOpen },
  ];

  const st = STATUS_OBRA[obra.status as keyof typeof STATUS_OBRA] ?? STATUS_OBRA.planejamento;

  const gastoNotas = obra.notas.filter((n) => n.status === "confirmada").reduce((s, n) => s + n.valor, 0);
  const gastoFunc = obra.pagamentos.reduce((s, p) => s + p.valor, 0);
  const realizado = gastoNotas + gastoFunc;
  const saldo = obra.orcamento - realizado;
  const estouro = saldo < 0;
  const pct = obra.orcamento > 0 ? Math.min(Math.round((realizado / obra.orcamento) * 100), 100) : 0;

  const porCategoria: Record<string, number> = {};
  obra.notas.filter((n) => n.status === "confirmada").forEach((n) => {
    porCategoria[n.categoria] = (porCategoria[n.categoria] ?? 0) + n.valor;
  });

  const editAction = useCallback(
    (prev: any, fd: FormData) => editarObra(obra.id, prev, fd),
    [obra.id]
  );

  const closeEdit = useCallback(() => setShowEdit(false), []);

  const handleConfirmar = (notaId: string) =>
    startTransition(() => confirmarNota(notaId, obra.id));

  const handleExcluir = (notaId: string) =>
    startTransition(() => excluirNota(notaId, obra.id));

  return (
    <>
      {/* Topbar */}
      <div style={{ padding: "16px 32px 0", background: "var(--bg-surface)", borderBottom: "1px solid var(--border-subtle)" }}>
        {/* Row 1: breadcrumb + title + Nova nota */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 10 }}>
          <div>
            <Link href="/obras" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, color: "var(--fg-tertiary)", textDecoration: "none", marginBottom: 4 }}>
              <ArrowLeft size={13} /> Obras
            </Link>
            <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 500, color: "var(--fg-primary)", letterSpacing: "-0.02em", lineHeight: 1.15 }}>{obra.nome}</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 4 }}>
            <button onClick={() => setTab("notas")} style={{ height: 40, padding: "0 18px", background: "#1e3a5f", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 }}>
              <Receipt size={15} /> + Nova nota
            </button>
          </div>
        </div>
        {/* Row 2: status + metadata + Editar/Relatório */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, paddingBottom: 14, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 18, fontSize: 13.5, color: "var(--fg-tertiary)", flexWrap: "wrap", alignItems: "center" }}>
            <Badge label={st.label} color={st.color} bg={st.bg} dot />
            {obra.terreno ? (
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}><MapPin size={13} /><Link href={`/terrenos/${obra.terreno.id}`} style={{ color: "var(--navy-700)", textDecoration: "none" }}>{obra.terreno.nome}</Link> · {obra.terreno.cidade}</span>
            ) : (
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}><MapPin size={13} />Sem terreno vinculado</span>
            )}
            {obra.responsavel && <span style={{ display: "flex", alignItems: "center", gap: 5 }}><UserRound size={13} />{obra.responsavel}</span>}
            {(obra.inicio || obra.prazo) && <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Calendar size={13} />{fmtDate(obra.inicio)} → {fmtDate(obra.prazo)}</span>}
          </div>
          <button onClick={() => setShowEdit(true)} style={{ height: 34, padding: "0 13px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-surface)", color: "var(--fg-secondary)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Edit2 size={13} /> Editar obra
          </button>
        </div>
      </div>

      {/* KPI cards — always visible */}
      <div style={{ padding: "20px 32px", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-surface)", display: "flex", gap: 16, flexWrap: "wrap" }}>
        <KPI label="Orçamento" value={fmtBRL(obra.orcamento)} />
        <KPI label="Realizado" value={fmtBRL(realizado)} sub={`${pct}% do previsto`} />
        <KPI label={estouro ? "Estouro" : "Saldo disponível"} value={fmtBRL(Math.abs(saldo))} danger={estouro} green={!estouro} sub={estouro ? "acima do orçamento" : undefined} />
        <KPI label="Execução física" value={`${obra.progresso}%`} sub={obra.notas.filter((n) => n.status === "pendente").length > 0 ? `${obra.notas.filter((n) => n.status === "pendente").length} nota(s) em revisão` : undefined} />
      </div>

      {/* Tabs */}
      <div style={{ padding: "0 32px", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-surface)", display: "flex", gap: 0 }}>
        {TABS.map(({ k, l, Icon }) => {
          const on = tab === k;
          return (
            <button key={k} onClick={() => setTab(k)} style={{ height: 46, padding: "0 18px", border: "none", borderBottom: `2px solid ${on ? "var(--navy-700)" : "transparent"}`, background: "transparent", color: on ? "var(--navy-700)" : "var(--fg-tertiary)", fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: on ? 600 : 400, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 }}>
              <Icon size={15} /> {l}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ padding: "28px 32px" }}>
        {/* ── FINANCEIRO ── */}
        {tab === "financeiro" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {estouro && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "var(--danger-50)", border: "1px solid rgba(181,54,60,0.3)", borderRadius: "var(--radius-md)", color: "var(--danger-500)", fontSize: 13.5 }}>
                <AlertTriangle size={16} /> <strong>Estouro de orçamento:</strong> {fmtBRL(Math.abs(saldo))} acima do previsto
              </div>
            )}

            {/* Budget bar */}
            <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "20px 24px" }}>
              <p style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600, color: "var(--fg-secondary)" }}>Execução orçamentária</p>
              <div style={{ height: 12, borderRadius: "var(--radius-full)", background: "var(--ink-100)", overflow: "hidden", marginBottom: 8 }}>
                <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: estouro ? "var(--danger-500)" : pct > 80 ? "var(--gold-500)" : "var(--navy-700)", borderRadius: "var(--radius-full)", transition: "width 700ms" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--fg-tertiary)" }}>
                <span>NF confirmadas: {fmtBRL(gastoNotas)}</span>
                <span>Pagamentos: {fmtBRL(gastoFunc)}</span>
              </div>
            </div>

            {/* Por categoria */}
            {Object.keys(porCategoria).length > 0 && (
              <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "20px 24px" }}>
                <p style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 600, color: "var(--fg-secondary)" }}>Gastos por categoria (NFs confirmadas)</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {Object.entries(porCategoria).sort((a, b) => b[1] - a[1]).map(([cat, val]) => {
                    const catLabel = CATEGORIA_NF[cat as keyof typeof CATEGORIA_NF]?.label ?? cat;
                    const pctCat = realizado > 0 ? Math.round((val / realizado) * 100) : 0;
                    return (
                      <div key={cat}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--fg-secondary)", marginBottom: 4 }}>
                          <span>{catLabel}</span>
                          <span>{fmtBRL(val)} ({pctCat}%)</span>
                        </div>
                        <div style={{ height: 6, borderRadius: "var(--radius-full)", background: "var(--ink-100)" }}>
                          <div style={{ width: `${pctCat}%`, height: "100%", background: "var(--navy-500)", borderRadius: "var(--radius-full)" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── NOTAS FISCAIS ── */}
        {tab === "notas" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {obra.notas.length === 0 ? (
              <p style={{ textAlign: "center", padding: "40px 0", color: "var(--fg-tertiary)", fontSize: 15 }}>Nenhuma NF vinculada a esta obra.</p>
            ) : (
              obra.notas.map((n) => {
                const st2 = STATUS_NF[n.status as keyof typeof STATUS_NF] ?? STATUS_NF.pendente;
                const catLabel = CATEGORIA_NF[n.categoria as keyof typeof CATEGORIA_NF]?.label ?? n.categoria;
                return (
                  <div key={n.id} style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: "14px 18px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                        <Badge label={st2.label} color={st2.color} bg={st2.bg} />
                        <span style={{ fontSize: 13, color: "var(--fg-tertiary)" }}>{catLabel}</span>
                        {n.numero && <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>NF-e {n.numero}</span>}
                      </div>
                      <p style={{ margin: 0, fontSize: 14, color: "var(--fg-primary)", fontWeight: 500 }}>{n.fornecedor ?? "Fornecedor não informado"}</p>
                      {n.descricao && <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--fg-tertiary)" }}>{n.descricao}</p>}
                      <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--fg-muted)" }}>{fmtDate(n.emitidaEm)}</p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ margin: "0 0 8px", fontSize: 20, fontFamily: "var(--font-display)", fontWeight: 500, color: "var(--fg-primary)" }}>{fmtBRL(n.valor)}</p>
                      {n.status === "pendente" && (
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                          <button onClick={() => handleConfirmar(n.id)} disabled={isPending} style={{ height: 30, padding: "0 12px", background: "var(--success-500)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                            Confirmar
                          </button>
                          <button onClick={() => handleExcluir(n.id)} disabled={isPending} style={{ height: 30, padding: "0 12px", background: "var(--danger-50)", color: "var(--danger-500)", border: "1px solid rgba(181,54,60,0.3)", borderRadius: "var(--radius-md)", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                            Excluir
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── EQUIPE ── */}
        {tab === "equipe" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {obra.alocacoes.length > 0 && (
              <div>
                <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 600, color: "var(--fg-secondary)" }}>Alocações</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {obra.alocacoes.map((a) => (
                    <div key={a.id} style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <p style={{ margin: 0, fontSize: 14.5, fontWeight: 500, color: "var(--fg-primary)" }}>{a.funcionario.nome}</p>
                        <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--fg-tertiary)" }}>{a.cargo ?? a.funcionario.cargo ?? "—"}</p>
                      </div>
                      <p style={{ margin: 0, fontSize: 13, color: "var(--fg-muted)" }}>{fmtDate(a.inicio)} → {a.fim ? fmtDate(a.fim) : "em andamento"}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {obra.pagamentos.length > 0 && (
              <div>
                <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 600, color: "var(--fg-secondary)" }}>Pagamentos a funcionários</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {obra.pagamentos.map((p) => (
                    <div key={p.id} style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <p style={{ margin: 0, fontSize: 14.5, fontWeight: 500, color: "var(--fg-primary)" }}>{p.funcionario?.nome ?? "—"}</p>
                        {p.descricao && <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--fg-tertiary)" }}>{p.descricao}</p>}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ margin: "0 0 2px", fontSize: 16, fontFamily: "var(--font-display)", color: "var(--fg-primary)" }}>{fmtBRL(p.valor)}</p>
                        <p style={{ margin: 0, fontSize: 12, color: "var(--fg-muted)" }}>{fmtDate(p.pagoEm)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {obra.alocacoes.length === 0 && obra.pagamentos.length === 0 && (
              <p style={{ textAlign: "center", padding: "40px 0", color: "var(--fg-tertiary)", fontSize: 15 }}>Nenhum funcionário alocado ainda.</p>
            )}
          </div>
        )}

        {/* ── DIÁRIO ── */}
        {tab === "diario" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {obra.diario.length === 0 ? (
              <p style={{ textAlign: "center", padding: "40px 0", color: "var(--fg-tertiary)", fontSize: 15 }}>Nenhum registro no diário ainda.</p>
            ) : (
              obra.diario.map((d) => (
                <div key={d.id} style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: "16px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13, color: "var(--fg-muted)" }}>
                    <span>{fmtDate(d.data)}</span>
                    {d.autor && <span>{d.autor}</span>}
                  </div>
                  <p style={{ margin: 0, fontSize: 14.5, color: "var(--fg-primary)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{d.conteudo}</p>
                  {d.fotoUrl && (
                    <a href={d.fotoUrl} target="_blank" rel="noreferrer" style={{ display: "block", marginTop: 12, borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--border-subtle)", maxWidth: 440 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={d.fotoUrl} alt="Foto da obra" style={{ width: "100%", maxHeight: 260, objectFit: "cover", display: "block" }} />
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ── CHECKLIST ── */}
        {tab === "checklist" && <ChecklistTab obraId={obra.id} />}

        {/* ── DOCUMENTOS ── */}
        {tab === "documentos" && <DocumentosTab ownerType="obra" ownerId={obra.id} />}
      </div>

      {showEdit && (
        <ObraForm
          action={editAction}
          terrenos={terrenos}
          onClose={closeEdit}
          isEdit
          initial={{ id: obra.id, nome: obra.nome, terrenoId: obra.terreno?.id ?? null, orcamento: obra.orcamento, status: obra.status, inicio: obra.inicio, prazo: obra.prazo, responsavel: obra.responsavel, progresso: obra.progresso }}
        />
      )}
    </>
  );
}
