"use client";

import { useState, useCallback, useTransition, useEffect, Fragment, useActionState } from "react";
import Link from "next/link";
import {
  ArrowLeft, MapPin, UserRound, Calendar, Edit2, TrendingUp, Receipt, Users,
  BookOpen, AlertTriangle, CheckSquare, FolderOpen, Package, Wrench, Truck,
  HardHat, MoreHorizontal, Plus, Trash2,
} from "lucide-react";
import { DocumentosTab } from "@/components/ui/documentos-tab";
import { Badge } from "@/components/ui/badge";
import { ObraForm } from "../obra-form";
import { NotaForm } from "../../notas/nota-form";
import { editarObra, confirmarNota, excluirNota, criarNotaParaObra } from "../actions";
import { criarEntrada, excluirEntrada } from "../../diario/actions";
import { STATUS_OBRA, STATUS_NF, CATEGORIA_NF } from "@/lib/status";
import { fmtBRL, fmtDate } from "@/lib/format";

// ─── date helpers ──────────────────────────────────────────────────────────────
const MESES = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];
function fmtDiarioDate(dateStr: string | null) {
  if (!dateStr) return { day: "?", mon: "" };
  const dt = new Date(dateStr.includes("T") ? dateStr : dateStr + "T12:00:00");
  return { day: String(dt.getDate()), mon: MESES[dt.getMonth()] + "/" + String(dt.getFullYear()).slice(2) };
}

// ─── avatar helpers ────────────────────────────────────────────────────────────
const AV_COLORS = ["#1e3a5f", "#b45309", "#6d28d9", "#047857", "#b91c1c", "#0369a1"];
function avatarBg(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return AV_COLORS[h % AV_COLORS.length];
}
function avatarInitials(name: string) {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase();
}

// ─── category metadata ─────────────────────────────────────────────────────────
const CAT_META: Record<string, { label: string; Icon: React.ElementType; color: string }> = {
  material:     { label: "Material",     Icon: Package,        color: "#1e3a5f" },
  mao_obra:     { label: "Mão de obra",  Icon: HardHat,        color: "#b45309" },
  servicos:     { label: "Serviços",     Icon: Wrench,         color: "#6d28d9" },
  equipamentos: { label: "Equipamentos", Icon: Truck,          color: "#047857" },
  outros:       { label: "Outros",       Icon: MoreHorizontal, color: "#6b7280" },
};

// ─── table helpers ─────────────────────────────────────────────────────────────
const Th = ({ children, right }: { children?: React.ReactNode; right?: boolean }) => (
  <th style={{ padding: "10px 14px", fontSize: 11.5, fontWeight: 700, color: "var(--fg-tertiary)", textTransform: "uppercase" as const, letterSpacing: "0.06em", background: "var(--ink-50)", borderBottom: "1px solid var(--border-subtle)", whiteSpace: "nowrap" as const, textAlign: right ? "right" : "left" as const }}>
    {children}
  </th>
);
const Td = ({ children, right, mono }: { children?: React.ReactNode; right?: boolean; mono?: boolean }) => (
  <td style={{ padding: "12px 14px", fontSize: 14, color: "var(--fg-primary)", borderBottom: "1px solid var(--border-subtle)", verticalAlign: "middle", textAlign: right ? "right" : "left" as const, fontVariantNumeric: mono ? "tabular-nums" : undefined }}>
    {children}
  </td>
);

// ─── Diário inline form ────────────────────────────────────────────────────────
function DiarioInlineForm({ obraId, onDone }: { obraId: string; onDone: () => void }) {
  const [state, formAction] = useActionState(
    async (_prev: { error?: string } | null, fd: FormData) => {
      const r = await criarEntrada(_prev, fd);
      if (!r) onDone();
      return r;
    },
    null
  );
  const inp: React.CSSProperties = {
    height: 38, padding: "0 10px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)",
    background: "var(--bg-surface)", color: "var(--fg-primary)", fontFamily: "var(--font-sans)", fontSize: 14, width: "100%", outline: "none",
  };
  return (
    <form action={formAction} style={{ padding: "16px 20px", background: "var(--ink-50)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)", marginBottom: 16 }}>
      <input type="hidden" name="obraId" value={obraId} />
      <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12, marginBottom: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-secondary)" }}>Data</label>
          <input name="data" type="date" style={inp} defaultValue={new Date().toISOString().split("T")[0]} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-secondary)" }}>Conteúdo *</label>
          <input name="conteudo" required placeholder="Descreva o que aconteceu hoje na obra…" style={inp} />
        </div>
      </div>
      {state?.error && <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--danger-500)" }}>{state.error}</p>}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button type="button" onClick={onDone} style={{ height: 36, padding: "0 14px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "transparent", color: "var(--fg-secondary)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 13.5 }}>
          Cancelar
        </button>
        <button type="submit" style={{ height: 36, padding: "0 16px", background: "var(--navy-700)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontFamily: "var(--font-sans)", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>
          Salvar registro
        </button>
      </div>
    </form>
  );
}

// ─── interfaces ────────────────────────────────────────────────────────────────
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

// ─── checklist tab (unchanged) ─────────────────────────────────────────────────
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
  const [advancing, setAdvancing] = useState(false);

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

  const avancarFase = async () => {
    setAdvancing(true);
    await fetch(`/api/v1/checklist/obra/${obraId}/fase`, { method: "POST" });
    await refresh();
    setAdvancing(false);
  };

  if (loading) return <p style={{ textAlign: "center", padding: "40px 0", color: "var(--fg-tertiary)", fontSize: 15 }}>Carregando checklist…</p>;
  if (!data || data.length === 0) return <p style={{ textAlign: "center", padding: "40px 0", color: "var(--fg-tertiary)", fontSize: 15 }}>Nenhum checklist criado para esta obra.</p>;

  const sorted = [...data].sort((a, b) => FASE_ORDER.indexOf(a.fase) - FASE_ORDER.indexOf(b.fase));
  const clByFase: Record<string, ChecklistCl> = {};
  for (const cl of sorted) clByFase[cl.fase] = cl;

  const totalGeral = sorted.reduce((s, cl) => s + cl.total, 0);
  const concluidosGeral = sorted.reduce((s, cl) => s + cl.concluidos, 0);
  const pctGeral = totalGeral === 0 ? 0 : Math.round((concluidosGeral / totalGeral) * 100);

  const lastCreated = sorted.at(-1)!;
  const lastCreatedIdx = FASE_ORDER.indexOf(lastCreated.fase);
  const canAdvance = lastCreated.porcentagem === 100 && lastCreatedIdx < FASE_ORDER.length - 1;
  const nextFaseKey = canAdvance ? FASE_ORDER[lastCreatedIdx + 1] : null;
  const currentPhase = sorted.find((cl) => cl.porcentagem < 100) ?? lastCreated;

  const r = 44, circ = 2 * Math.PI * r;
  const dashOffset = circ - (pctGeral / 100) * circ;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
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

        <div style={{ display: "flex", alignItems: "center" }}>
          {FASE_ORDER.map((fase, i) => {
            const cl = clByFase[fase];
            const done = !!cl && cl.porcentagem === 100;
            const cur = !!cl && cl.porcentagem < 100;
            const locked = !cl;
            const label = FASE_LABELS[fase] ?? fase;
            const prevDone = i > 0 && !!clByFase[FASE_ORDER[i - 1]] && clByFase[FASE_ORDER[i - 1]].porcentagem === 100;
            return (
              <Fragment key={fase}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: done ? "#22c55e" : cur ? "#d97706" : "#f3f4f6", color: done || cur ? "#fff" : "#9ca3af", display: "flex", alignItems: "center", justifyContent: "center", fontSize: locked ? 11 : 12, fontWeight: 700, border: locked ? "2px solid #e5e7eb" : "none" }}>
                    {done ? "✓" : locked ? "○" : i + 1}
                  </div>
                  <span style={{ fontSize: 11.5, color: done ? "#16a34a" : cur ? "#d97706" : "#9ca3af", fontWeight: cur ? 600 : 400, whiteSpace: "nowrap" }}>{label}</span>
                </div>
                {i < FASE_ORDER.length - 1 && (
                  <div style={{ flex: 1, height: 2, background: prevDone || done ? "#22c55e" : "#e5e7eb", marginBottom: 22, marginLeft: 6, marginRight: 6 }} />
                )}
              </Fragment>
            );
          })}
        </div>

        {canAdvance && (
          <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <button
              onClick={avancarFase}
              disabled={advancing}
              style={{ height: 40, padding: "0 20px", background: "#d97706", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600, cursor: advancing ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", gap: 8, opacity: advancing ? 0.7 : 1 }}
            >
              {advancing ? "Abrindo próxima fase…" : `▶ Avançar para ${FASE_LABELS[nextFaseKey!]}`}
            </button>
            <span style={{ fontSize: 13, color: "var(--fg-muted)" }}>
              &quot;{FASE_LABELS[lastCreated.fase]}&quot; concluída — clique para abrir os itens da próxima etapa.
            </span>
          </div>
        )}
      </div>

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

// ─── KPI card ─────────────────────────────────────────────────────────────────
const KPI = ({ label, value, sub, danger, green }: { label: string; value: string; sub?: string; danger?: boolean; green?: boolean }) => (
  <div style={{ background: "var(--bg-surface)", border: `1px solid ${danger ? "rgba(181,54,60,0.3)" : "var(--border-subtle)"}`, borderRadius: "var(--radius-lg)", padding: "18px 22px", flex: 1, minWidth: 160 }}>
    <p style={{ margin: "0 0 6px", fontSize: 11.5, color: "var(--fg-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</p>
    <p style={{ margin: 0, fontSize: 26, fontFamily: "var(--font-display)", fontWeight: 500, color: danger ? "var(--danger-500)" : green ? "#16a34a" : "var(--fg-primary)" }}>{value}</p>
    {sub && <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--fg-tertiary)" }}>{sub}</p>}
  </div>
);

// ─── main component ────────────────────────────────────────────────────────────
export function ObraDetail({ obra, terrenos }: { obra: Obra; terrenos: Terreno[] }) {
  const [tab, setTab] = useState("financeiro");
  const [showEdit, setShowEdit] = useState(false);
  const [showNotaForm, setShowNotaForm] = useState(false);
  const [showDiarioForm, setShowDiarioForm] = useState(false);
  const [diarioEntries, setDiarioEntries] = useState(obra.diario);
  const [isPending, startTransition] = useTransition();

  useEffect(() => { setDiarioEntries(obra.diario); }, [obra.diario]);

  const TABS = [
    { k: "financeiro", l: "Financeiro", Icon: TrendingUp },
    { k: "checklist", l: "Checklist", Icon: CheckSquare },
    { k: "notas", l: obra.notas.length > 0 ? `Notas fiscais (${obra.notas.length})` : "Notas fiscais", Icon: Receipt },
    { k: "equipe", l: obra.alocacoes.length > 0 ? `Equipe (${obra.alocacoes.length})` : "Equipe", Icon: Users },
    { k: "diario", l: diarioEntries.length > 0 ? `Diário (${diarioEntries.length})` : "Diário", Icon: BookOpen },
    { k: "documentos", l: "Documentos", Icon: FolderOpen },
  ];

  const st = STATUS_OBRA[obra.status as keyof typeof STATUS_OBRA] ?? STATUS_OBRA.planejamento;

  // financial computations
  const gastoNotas = obra.notas.filter((n) => n.status === "confirmada").reduce((s, n) => s + n.valor, 0);
  const gastoFunc = obra.pagamentos.reduce((s, p) => s + p.valor, 0);
  const gastoRevisao = obra.notas.filter((n) => n.status !== "confirmada" && n.status !== "cancelada").reduce((s, n) => s + n.valor, 0);
  const realizado = gastoNotas + gastoFunc;
  const saldo = obra.orcamento - realizado;
  const estouro = saldo < 0;
  const pct = obra.orcamento > 0 ? Math.min(Math.round((realizado / obra.orcamento) * 100), 100) : 0;
  const pctRevisao = obra.orcamento > 0 ? Math.min(Math.round((gastoRevisao / obra.orcamento) * 100), 100 - pct) : 0;

  // category breakdown (confirmed NFs only)
  const catValues: Record<string, number> = {};
  obra.notas.filter((n) => n.status === "confirmada").forEach((n) => {
    catValues[n.categoria] = (catValues[n.categoria] ?? 0) + n.valor;
  });

  const editAction = useCallback((prev: any, fd: FormData) => editarObra(obra.id, prev, fd), [obra.id]);
  const closeEdit = useCallback(() => setShowEdit(false), []);

  const handleConfirmar = (notaId: string) => startTransition(() => confirmarNota(notaId, obra.id));
  const handleExcluirNota = (notaId: string) => startTransition(() => excluirNota(notaId, obra.id));
  const handleExcluirEntrada = (id: string) => {
    startTransition(async () => {
      await excluirEntrada(id);
      setDiarioEntries((prev) => prev.filter((e) => e.id !== id));
    });
  };

  return (
    <>
      {/* Topbar */}
      <div style={{ padding: "16px 32px 0", background: "var(--bg-surface)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 10 }}>
          <div>
            <Link href="/obras" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, color: "var(--fg-tertiary)", textDecoration: "none", marginBottom: 4 }}>
              <ArrowLeft size={13} /> Obras
            </Link>
            <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 500, color: "var(--fg-primary)", letterSpacing: "-0.02em", lineHeight: 1.15 }}>{obra.nome}</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 4 }}>
            <button onClick={() => { setShowNotaForm(true); setTab("notas"); }} style={{ height: 40, padding: "0 18px", background: "#1e3a5f", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 }}>
              <Receipt size={15} /> + Nova nota
            </button>
          </div>
        </div>
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

      {/* KPI cards */}
      <div style={{ padding: "20px 32px", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-surface)", display: "flex", gap: 16, flexWrap: "wrap" }}>
        <KPI label="Orçamento" value={fmtBRL(obra.orcamento)} />
        <KPI label="Realizado" value={fmtBRL(realizado)} sub={`${pct}% do previsto`} />
        <KPI label={estouro ? "Estouro" : "Saldo disponível"} value={fmtBRL(Math.abs(saldo))} danger={estouro} green={!estouro} sub={estouro ? "acima do orçamento" : undefined} />
        <KPI label="Execução física" value={`${obra.progresso}%`} sub={obra.notas.filter((n) => n.status === "pendente").length > 0 ? `${obra.notas.filter((n) => n.status === "pendente").length} nota(s) em revisão` : undefined} />
      </div>

      {/* Tabs */}
      <div style={{ padding: "0 32px", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-surface)", display: "flex", gap: 0, overflowX: "auto" }}>
        {TABS.map(({ k, l, Icon }) => {
          const on = tab === k;
          return (
            <button key={k} onClick={() => setTab(k)} style={{ height: 46, padding: "0 18px", border: "none", borderBottom: `2px solid ${on ? "var(--navy-700)" : "transparent"}`, background: "transparent", color: on ? "var(--navy-700)" : "var(--fg-tertiary)", fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: on ? 600 : 400, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7, whiteSpace: "nowrap" }}>
              <Icon size={15} /> {l}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ padding: "28px 32px" }}>

        {/* ── FINANCEIRO ── */}
        {tab === "financeiro" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
            {/* Left: Previsto × Realizado */}
            <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "22px 24px" }}>
              <p style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: "var(--fg-primary)" }}>Previsto × Realizado</p>

              {estouro && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 13px", background: "var(--danger-50)", border: "1px solid rgba(181,54,60,0.3)", borderRadius: "var(--radius-md)", color: "var(--danger-500)", fontSize: 13, marginBottom: 14 }}>
                  <AlertTriangle size={14} /> Estouro de orçamento: {fmtBRL(Math.abs(saldo))} acima do previsto
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginBottom: 8 }}>
                <span style={{ color: "var(--fg-tertiary)" }}>Consumido</span>
                <span style={{ fontWeight: 700, color: estouro ? "var(--danger-500)" : "var(--fg-primary)" }}>{pct}%</span>
              </div>
              {/* Bicolor bar: navy = confirmed+pagamentos, amber = em revisão */}
              <div style={{ height: 14, borderRadius: "var(--radius-full)", background: "var(--ink-100)", overflow: "hidden", marginBottom: 20 }}>
                <div style={{ display: "flex", height: "100%" }}>
                  <div style={{ width: `${pct}%`, background: estouro ? "var(--danger-500)" : "#1e3a5f", transition: "width 700ms" }} />
                  {pctRevisao > 0 && <div style={{ width: `${pctRevisao}%`, background: "#d97706", transition: "width 700ms" }} />}
                </div>
              </div>

              {/* Line items */}
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {[
                  { label: "Material e insumos", value: gastoNotas },
                  { label: "Mão de obra (folha)", value: gastoFunc },
                  { label: "Notas em revisão", value: gastoRevisao },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "11px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                    <span style={{ color: "var(--fg-secondary)" }}>{label}</span>
                    <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{fmtBRL(value)}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, paddingTop: 13 }}>
                  <span style={{ fontWeight: 700 }}>{estouro ? "Estouro de orçamento" : "Saldo restante"}</span>
                  <span style={{ fontWeight: 700, color: estouro ? "var(--danger-500)" : "#16a34a", fontVariantNumeric: "tabular-nums" }}>{fmtBRL(Math.abs(saldo))}</span>
                </div>
              </div>
            </div>

            {/* Right: Gasto por categoria */}
            <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "22px 24px" }}>
              <p style={{ margin: "0 0 18px", fontSize: 16, fontWeight: 600, color: "var(--fg-primary)" }}>Gasto por categoria</p>
              {Object.keys(catValues).length === 0 ? (
                <p style={{ fontSize: 14, color: "var(--fg-tertiary)" }}>Nenhuma NF confirmada ainda.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {Object.entries(catValues).sort((a, b) => b[1] - a[1]).map(([cat, val]) => {
                    const meta = CAT_META[cat] ?? CAT_META.outros;
                    const pctCat = realizado > 0 ? Math.round((val / realizado) * 100) : 0;
                    return (
                      <div key={cat}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7 }}>
                          <span style={{ width: 28, height: 28, borderRadius: 6, background: `${meta.color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <meta.Icon size={14} style={{ color: meta.color }} />
                          </span>
                          <span style={{ flex: 1, fontSize: 14, color: "var(--fg-secondary)" }}>{meta.label}</span>
                          <span style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmtBRL(val)}</span>
                          <span style={{ fontSize: 12.5, color: "var(--fg-tertiary)", minWidth: 32, textAlign: "right" }}>{pctCat}%</span>
                        </div>
                        <div style={{ height: 6, borderRadius: "var(--radius-full)", background: "var(--ink-100)" }}>
                          <div style={{ width: `${pctCat}%`, height: "100%", background: meta.color, borderRadius: "var(--radius-full)", transition: "width 600ms" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── NOTAS FISCAIS ── */}
        {tab === "notas" && (
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
              <button onClick={() => setShowNotaForm(true)} style={{ height: 40, padding: "0 18px", background: "#1e3a5f", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 }}>
                <Plus size={15} /> Nova nota fiscal
              </button>
            </div>
            {obra.notas.length === 0 ? (
              <p style={{ textAlign: "center", padding: "40px 0", color: "var(--fg-tertiary)", fontSize: 15 }}>Nenhuma NF vinculada a esta obra.</p>
            ) : (
              <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <Th>Fornecedor</Th>
                        <Th>Categoria</Th>
                        <Th>Nº</Th>
                        <Th>Emissão</Th>
                        <Th right>Valor</Th>
                        <Th>Status</Th>
                        <Th right></Th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...obra.notas].sort((a, b) => (b.emitidaEm ?? "").localeCompare(a.emitidaEm ?? "")).map((n) => {
                        const st2 = STATUS_NF[n.status as keyof typeof STATUS_NF] ?? STATUS_NF.pendente;
                        const meta = CAT_META[n.categoria] ?? CAT_META.outros;
                        const isPendente = n.status === "pendente" || n.status === "em_revisao";
                        return (
                          <tr key={n.id}>
                            <Td>
                              <div style={{ fontWeight: 600 }}>{n.fornecedor ?? "—"}</div>
                              {n.descricao && <div style={{ fontSize: 12.5, color: "var(--fg-tertiary)" }}>{n.descricao}</div>}
                            </Td>
                            <Td>
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                <meta.Icon size={14} style={{ color: meta.color }} />
                                <span style={{ fontSize: 13, color: "var(--fg-secondary)" }}>{meta.label}</span>
                              </span>
                            </Td>
                            <Td mono>{n.numero ?? "—"}</Td>
                            <Td>{fmtDate(n.emitidaEm)}</Td>
                            <Td right mono><strong>{fmtBRL(n.valor)}</strong></Td>
                            <Td><Badge label={st2.label} color={st2.color} bg={st2.bg} dot /></Td>
                            <Td right>
                              {isPendente ? (
                                <div style={{ display: "inline-flex", gap: 6 }}>
                                  <button onClick={() => handleConfirmar(n.id)} disabled={isPending} style={{ height: 32, padding: "0 12px", background: "#1e3a5f", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)", display: "inline-flex", alignItems: "center", gap: 5 }}>
                                    ✓ Confirmar
                                  </button>
                                  <button onClick={() => handleExcluirNota(n.id)} disabled={isPending} style={{ width: 32, height: 32, border: "1px solid rgba(181,54,60,0.3)", borderRadius: "var(--radius-md)", background: "var(--danger-50)", color: "var(--danger-500)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              ) : (
                                <button onClick={() => handleExcluirNota(n.id)} disabled={isPending} style={{ width: 32, height: 32, border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "transparent", color: "var(--fg-muted)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </Td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── EQUIPE ── */}
        {tab === "equipe" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
            {/* Left: Equipe alocada */}
            <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "20px 22px" }}>
              <p style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 600, color: "var(--fg-primary)" }}>Equipe alocada</p>
              {obra.alocacoes.length === 0 ? (
                <p style={{ fontSize: 14, color: "var(--fg-tertiary)", padding: "20px 0" }}>Nenhum funcionário alocado ainda.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {obra.alocacoes.map((a, i) => (
                    <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: i < obra.alocacoes.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                      <div style={{ width: 38, height: 38, borderRadius: "50%", background: avatarBg(a.funcionario.nome), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                        {avatarInitials(a.funcionario.nome)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--fg-primary)" }}>{a.funcionario.nome}</div>
                        <div style={{ fontSize: 12.5, color: "var(--fg-tertiary)" }}>{a.cargo ?? a.funcionario.cargo ?? "—"}</div>
                      </div>
                      <Link href={`/funcionarios/${a.funcionario.id}`} style={{ height: 32, padding: "0 12px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "transparent", color: "var(--fg-secondary)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 5, textDecoration: "none" }}>
                        Pagar
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Pagamentos lançados */}
            <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "20px 22px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "var(--fg-primary)" }}>Pagamentos lançados</p>
                <Link href="/funcionarios" style={{ fontSize: 13.5, fontWeight: 600, color: "var(--navy-700)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Plus size={14} /> Novo
                </Link>
              </div>
              {obra.pagamentos.length === 0 ? (
                <p style={{ fontSize: 14, color: "var(--fg-tertiary)", padding: "20px 0" }}>Nenhum pagamento registrado.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {obra.pagamentos.map((p, i) => (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "11px 0", borderBottom: i < obra.pagamentos.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-primary)" }}>{p.funcionario?.nome ?? "—"}</div>
                        <div style={{ fontSize: 12.5, color: "var(--fg-tertiary)" }}>
                          {p.descricao ? `${p.descricao} · ` : ""}{fmtDate(p.pagoEm)}
                        </div>
                      </div>
                      <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{fmtBRL(p.valor)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── DIÁRIO ── */}
        {tab === "diario" && (
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "22px 24px" }}>
            <p style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: "var(--fg-primary)" }}>Diário de obra</p>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontSize: 13.5, color: "var(--fg-tertiary)" }}>{diarioEntries.length} registro(s)</span>
              <button onClick={() => setShowDiarioForm(true)} style={{ height: 36, padding: "0 16px", background: "#1e3a5f", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontFamily: "var(--font-sans)", fontSize: 13.5, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Plus size={14} /> Novo registro
              </button>
            </div>

            {showDiarioForm && (
              <DiarioInlineForm obraId={obra.id} onDone={() => setShowDiarioForm(false)} />
            )}

            {diarioEntries.length === 0 ? (
              <p style={{ textAlign: "center", padding: "30px 0", color: "var(--fg-tertiary)", fontSize: 14 }}>Nenhum registro no diário ainda.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {[...diarioEntries].sort((a, b) => (b.data ?? "").localeCompare(a.data ?? "")).map((d, i) => {
                  const { day, mon } = fmtDiarioDate(d.data);
                  return (
                    <div key={d.id} style={{ display: "flex", gap: 16, padding: "14px 0", borderBottom: i < diarioEntries.length - 1 ? "1px solid var(--border-subtle)" : "none", alignItems: "flex-start" }}>
                      <div style={{ width: 44, textAlign: "center", flexShrink: 0 }}>
                        <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 500, color: "var(--fg-primary)", lineHeight: 1 }}>{day}</div>
                        <div style={{ fontSize: 11, color: "var(--fg-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{mon}</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 14, color: "var(--fg-secondary)", lineHeight: 1.6 }}>{d.conteudo}</p>
                        {d.fotoUrl && (
                          <a href={d.fotoUrl} target="_blank" rel="noreferrer" style={{ display: "block", marginTop: 10, borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--border-subtle)", maxWidth: 360 }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={d.fotoUrl} alt="Foto da obra" style={{ width: "100%", maxHeight: 220, objectFit: "cover", display: "block" }} />
                          </a>
                        )}
                      </div>
                      <button onClick={() => handleExcluirEntrada(d.id)} disabled={isPending} style={{ width: 30, height: 30, border: "none", background: "transparent", color: "var(--fg-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "var(--radius-md)", flexShrink: 0 }} title="Excluir registro">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── CHECKLIST ── */}
        {tab === "checklist" && <ChecklistTab obraId={obra.id} />}

        {/* ── DOCUMENTOS ── */}
        {tab === "documentos" && <DocumentosTab ownerType="obra" ownerId={obra.id} />}
      </div>

      {/* Modals */}
      {showEdit && (
        <ObraForm
          action={editAction}
          terrenos={terrenos}
          onClose={closeEdit}
          isEdit
          initial={{ id: obra.id, nome: obra.nome, terrenoId: obra.terreno?.id ?? null, orcamento: obra.orcamento, status: obra.status, inicio: obra.inicio, prazo: obra.prazo, responsavel: obra.responsavel, progresso: obra.progresso }}
        />
      )}
      {showNotaForm && (
        <NotaForm
          action={criarNotaParaObra}
          obras={[{ id: obra.id, nome: obra.nome }]}
          initial={{ id: "", obraId: obra.id, categoria: "material", valor: 0, fornecedor: null, numero: null, descricao: null, emitidaEm: null, status: "pendente" }}
          onClose={() => setShowNotaForm(false)}
        />
      )}
    </>
  );
}
