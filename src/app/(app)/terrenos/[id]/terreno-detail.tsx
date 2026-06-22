"use client";

import { useState, useCallback, useEffect, Fragment } from "react";
import Link from "next/link";
import { MapPinned, Pencil, Building2, ChevronRight, FolderOpen, CheckSquare, User, Phone, Mail, CreditCard, TrendingUp, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { DocumentosTab } from "@/components/ui/documentos-tab";
import { Badge } from "@/components/ui/badge";
import { TerrenoForm } from "../terreno-form";
import { MapaTerreno } from "./mapa-terreno";
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

interface ParcelaLite {
  id: string; numero: number; valor: number;
  vencimento: string | null; pagoEm: string | null; status: string;
}

interface Venda {
  id: string;
  nomeComprador: string;
  cpfCnpjComprador: string | null;
  telefoneComprador: string | null;
  emailComprador: string | null;
  valorTotal: number;
  entrada: number;
  numeroParcelas: number;
  diaVencimento: number;
  dataContrato: string | null;
  parcelas: ParcelaLite[];
}

interface Terreno {
  id: string;
  nome: string;
  numero: string | null;
  endereco: string | null;
  cidade: string;
  cep: string | null;
  area: number;
  status: string;
  aquisicao: string | null;
  valorCompra: number | null;
  lat: number | null;
  lng: number | null;
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

const FASE_TERRENO_ORDER = ["TERRENO_PREPARACAO", "TERRENO_ANALISE", "TERRENO_PROPOSTA", "TERRENO_POS_VENDA"];
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
  const [advancing, setAdvancing] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");

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

  const avancarFase = async () => {
    setAdvancing(true);
    await fetch(`/api/v1/checklist/terreno/${terrenoId}/fase`, { method: "POST" });
    await refresh();
    setAdvancing(false);
  };

  const saveDescricao = async (itemId: string) => {
    const val = editVal.trim();
    setEditing(null);
    if (!val) return;
    await fetch(`/api/v1/checklist/item/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ descricao: val }),
    });
    await refresh();
  };

  if (loading) return <p style={{ textAlign: "center", padding: "40px 0", color: "var(--fg-tertiary)", fontSize: 15 }}>Carregando checklist…</p>;
  if (!data || data.length === 0) return <p style={{ textAlign: "center", padding: "40px 0", color: "var(--fg-tertiary)", fontSize: 15 }}>Nenhum checklist criado para este terreno.</p>;

  const sorted = [...data].sort((a, b) => FASE_TERRENO_ORDER.indexOf(a.fase) - FASE_TERRENO_ORDER.indexOf(b.fase));
  const clByFase: Record<string, ChecklistCl> = {};
  for (const cl of sorted) clByFase[cl.fase] = cl;

  const totalGeral = sorted.reduce((s, cl) => s + cl.total, 0);
  const concluidosGeral = sorted.reduce((s, cl) => s + cl.concluidos, 0);
  const pctGeral = totalGeral === 0 ? 0 : Math.round((concluidosGeral / totalGeral) * 100);

  const lastCreated = sorted.at(-1)!;
  const lastCreatedIdx = FASE_TERRENO_ORDER.indexOf(lastCreated.fase);
  const canAdvance = lastCreated.porcentagem === 100 && lastCreatedIdx < FASE_TERRENO_ORDER.length - 1;
  const nextFaseKey = canAdvance ? FASE_TERRENO_ORDER[lastCreatedIdx + 1] : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 720 }}>
      {/* Header com stepper */}
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "20px 24px" }}>
        {/* Barra de progresso geral */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-secondary)" }}>Progresso geral</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: pctGeral === 100 ? "#16a34a" : "var(--navy-700)" }}>{concluidosGeral}/{totalGeral} · {pctGeral}%</span>
        </div>
        <div style={{ height: 8, background: "var(--ink-100)", borderRadius: "var(--radius-full)", overflow: "hidden", marginBottom: 24 }}>
          <div style={{ width: `${pctGeral}%`, height: "100%", background: pctGeral === 100 ? "#22c55e" : "var(--navy-700)", borderRadius: "var(--radius-full)", transition: "width 500ms" }} />
        </div>

        {/* Stepper — always shows all 4 phases */}
        <div style={{ display: "flex", alignItems: "center" }}>
          {FASE_TERRENO_ORDER.map((fase, i) => {
            const cl = clByFase[fase];
            const done = !!cl && cl.porcentagem === 100;
            const cur = !!cl && cl.porcentagem < 100;
            const locked = !cl;
            const label = FASE_TERRENO[fase] ?? fase;
            const prevDone = i > 0 && !!clByFase[FASE_TERRENO_ORDER[i - 1]] && clByFase[FASE_TERRENO_ORDER[i - 1]].porcentagem === 100;
            return (
              <Fragment key={fase}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: done ? "#22c55e" : cur ? "#d97706" : "#f3f4f6", color: done || cur ? "#fff" : "#9ca3af", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, border: locked ? "2px solid #e5e7eb" : "none" }}>
                    {done ? "✓" : locked ? "○" : i + 1}
                  </div>
                  <span style={{ fontSize: 10.5, color: done ? "#16a34a" : cur ? "#d97706" : "#9ca3af", fontWeight: cur ? 600 : 400, whiteSpace: "nowrap", textAlign: "center" }}>{label}</span>
                </div>
                {i < FASE_TERRENO_ORDER.length - 1 && (
                  <div style={{ flex: 1, height: 2, background: prevDone || done ? "#22c55e" : "#e5e7eb", marginBottom: 22, marginLeft: 4, marginRight: 4 }} />
                )}
              </Fragment>
            );
          })}
        </div>

        {/* Advance button */}
        {canAdvance && (
          <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <button
              onClick={avancarFase}
              disabled={advancing}
              style={{ height: 38, padding: "0 18px", background: "#d97706", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontFamily: "var(--font-sans)", fontSize: 13.5, fontWeight: 600, cursor: advancing ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", gap: 7, opacity: advancing ? 0.7 : 1 }}
            >
              {advancing ? "Abrindo próxima fase…" : `▶ Avançar para ${FASE_TERRENO[nextFaseKey!]}`}
            </button>
            <span style={{ fontSize: 13, color: "var(--fg-muted)" }}>
              &quot;{FASE_TERRENO[lastCreated.fase]}&quot; concluída — clique para abrir a próxima etapa.
            </span>
          </div>
        )}
      </div>

      {/* Phase sections — only created phases */}
      {sorted.map((cl) => (
        <div key={cl.id} style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 14.5, fontWeight: 600, color: "var(--fg-primary)" }}>{FASE_TERRENO[cl.fase] ?? cl.fase}</span>
              <span style={{ fontSize: 12.5, color: cl.porcentagem === 100 ? "#16a34a" : "var(--fg-muted)", fontWeight: cl.porcentagem === 100 ? 700 : 400 }}>{cl.concluidos}/{cl.total} · {cl.porcentagem}%</span>
            </div>
            <div style={{ height: 5, background: "var(--ink-100)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
              <div style={{ width: `${cl.porcentagem}%`, height: "100%", background: cl.porcentagem === 100 ? "#22c55e" : "var(--navy-500)", borderRadius: "var(--radius-full)", transition: "width 400ms" }} />
            </div>
          </div>
          <div>
            {cl.itens.map((item, idx) => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 20px", borderBottom: idx < cl.itens.length - 1 ? "1px solid var(--border-subtle)" : "none", background: item.concluido ? "var(--ink-50)" : "transparent" }}>
                <input type="checkbox" checked={item.concluido} onChange={() => { if (editing !== item.id) toggle(item.id, item.concluido); }} disabled={toggling === item.id} style={{ width: 16, height: 16, accentColor: "var(--navy-700)", cursor: "pointer", flexShrink: 0 }} />
                {editing === item.id ? (
                  <input
                    autoFocus
                    value={editVal}
                    onChange={(e) => setEditVal(e.target.value)}
                    onBlur={() => saveDescricao(item.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.currentTarget.blur(); }
                      if (e.key === "Escape") { setEditing(null); }
                    }}
                    style={{ flex: 1, height: 28, padding: "0 8px", border: "1px solid var(--border-focus)", borderRadius: "var(--radius-md)", background: "var(--bg-surface)", color: "var(--fg-primary)", fontFamily: "var(--font-sans)", fontSize: 14, outline: "none" }}
                  />
                ) : (
                  <span style={{ flex: 1, fontSize: 14, color: item.concluido ? "var(--fg-muted)" : "var(--fg-primary)", textDecoration: item.concluido ? "line-through" : "none", lineHeight: 1.5 }}>{item.descricao}</span>
                )}
                <button
                  onClick={() => { setEditing(item.id); setEditVal(item.descricao); }}
                  title="Editar descrição"
                  style={{ width: 26, height: 26, border: "none", background: "transparent", color: "var(--fg-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "var(--radius-md)", flexShrink: 0, opacity: editing === item.id ? 1 : 0.4 }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
                  onMouseLeave={(e) => { if (editing !== item.id) (e.currentTarget as HTMLButtonElement).style.opacity = "0.4"; }}
                >
                  <Pencil size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function CompradorTab({ venda: v }: { venda: Venda }) {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);

  const vencidas   = v.parcelas.filter(p => p.vencimento && new Date(p.vencimento) <= hoje);
  const pagas      = v.parcelas.filter(p => p.status === "paga");
  const pagasNoPrazo = pagas.filter(p => p.pagoEm && p.vencimento && new Date(p.pagoEm) <= new Date(p.vencimento));
  const pagasComAtraso = pagas.filter(p => p.pagoEm && p.vencimento && new Date(p.pagoEm) > new Date(p.vencimento));
  const emAtraso   = vencidas.filter(p => p.status !== "paga");
  const futuras    = v.parcelas.filter(p => p.vencimento && new Date(p.vencimento) > hoje && p.status !== "paga");

  const totalPago  = pagas.reduce((s, p) => s + p.valor, 0) + v.entrada;
  const pct        = v.valorTotal > 0 ? Math.min(Math.round((totalPago / v.valorTotal) * 100), 100) : 0;
  const proxima    = futuras[0] ?? null;

  const score = vencidas.length === 0
    ? null
    : Math.max(0, Math.round((pagasNoPrazo.length / vencidas.length) * 100) - emAtraso.length * 8);

  const scoreLabel = score === null ? { l: "Sem histórico", c: "var(--fg-muted)" }
    : score >= 85 ? { l: "Excelente", c: "#16a34a" }
    : score >= 70 ? { l: "Bom", c: "#d97706" }
    : score >= 50 ? { l: "Regular", c: "#ea580c" }
    : { l: "Crítico", c: "#dc2626" };

  const initials = v.nomeComprador.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 720 }}>

      {/* Dados pessoais */}
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "20px 24px", display: "flex", gap: 20, alignItems: "flex-start" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--navy-700)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, flexShrink: 0 }}>
          {initials}
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: "0 0 10px", fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, color: "var(--fg-primary)" }}>{v.nomeComprador}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8 }}>
            {v.cpfCnpjComprador && (
              <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13.5, color: "var(--fg-secondary)" }}>
                <CreditCard size={13} style={{ color: "var(--fg-muted)", flexShrink: 0 }} />
                {v.cpfCnpjComprador}
              </div>
            )}
            {v.telefoneComprador && (
              <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13.5, color: "var(--fg-secondary)" }}>
                <Phone size={13} style={{ color: "var(--fg-muted)", flexShrink: 0 }} />
                {v.telefoneComprador}
              </div>
            )}
            {v.emailComprador && (
              <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13.5, color: "var(--fg-secondary)" }}>
                <Mail size={13} style={{ color: "var(--fg-muted)", flexShrink: 0 }} />
                {v.emailComprador}
              </div>
            )}
            {v.dataContrato && (
              <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13.5, color: "var(--fg-secondary)" }}>
                <User size={13} style={{ color: "var(--fg-muted)", flexShrink: 0 }} />
                Contrato: {fmtDate(v.dataContrato)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Score + métricas */}
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 16 }}>
        {/* Score */}
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "20px 28px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minWidth: 160 }}>
          <TrendingUp size={18} style={{ color: scoreLabel.c, marginBottom: 8 }} />
          <div style={{ fontFamily: "var(--font-display)", fontSize: 48, fontWeight: 400, color: scoreLabel.c, lineHeight: 1 }}>
            {score ?? "—"}
          </div>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, color: scoreLabel.c, marginTop: 6 }}>
            {scoreLabel.l}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--fg-muted)", marginTop: 4 }}>Score interno</div>
        </div>

        {/* Métricas de pagamento */}
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "20px 24px", display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
          {[
            { icon: <CheckCircle2 size={15} color="#16a34a" />, label: "Pagas no prazo", value: pagasNoPrazo.length, sub: `de ${vencidas.length} vencidas` },
            { icon: <Clock size={15} color="#d97706" />, label: "Pagas com atraso", value: pagasComAtraso.length, sub: "após o vencimento" },
            { icon: <AlertTriangle size={15} color="#dc2626" />, label: "Em atraso", value: emAtraso.length, sub: emAtraso.length === 0 ? "tudo em dia" : "cobrar agora" },
            { icon: <TrendingUp size={15} color="var(--navy-700)" />, label: "Futuras", value: futuras.length, sub: proxima ? `próxima: ${fmtDate(proxima.vencimento)}` : "contrato quitado" },
          ].map((m) => (
            <div key={m.label}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--fg-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, marginBottom: 4 }}>
                {m.icon} {m.label}
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 400, color: "var(--fg-primary)", lineHeight: 1 }}>{m.value}</div>
              <div style={{ fontSize: 11.5, color: "var(--fg-muted)", marginTop: 2 }}>{m.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Análise do contrato */}
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "20px 24px" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>Contrato</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 16 }}>
          {[
            { l: "Valor total", v: fmtBRL(v.valorTotal) },
            { l: "Entrada paga", v: fmtBRL(v.entrada) },
            { l: "Total recebido", v: fmtBRL(totalPago) },
            { l: "A receber", v: fmtBRL(Math.max(v.valorTotal - totalPago, 0)) },
          ].map(k => (
            <div key={k.l} style={{ background: "var(--ink-50)", borderRadius: "var(--radius-md)", padding: "10px 12px" }}>
              <div style={{ fontSize: 10.5, color: "var(--fg-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>{k.l}</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "var(--fg-primary)", marginTop: 2 }}>{k.v}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--fg-tertiary)", marginBottom: 6 }}>
          <span>{pagas.length}/{v.numeroParcelas} parcelas pagas</span>
          <span style={{ fontWeight: 600 }}>{pct}% quitado</span>
        </div>
        <div style={{ height: 10, borderRadius: "var(--radius-full)", background: "var(--ink-100)", overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: pct >= 100 ? "#22c55e" : emAtraso.length > 0 ? "#dc2626" : "var(--navy-700)", borderRadius: "var(--radius-full)", transition: "width 600ms" }} />
        </div>
        {proxima && (
          <div style={{ marginTop: 10, fontSize: 13, color: "var(--fg-secondary)" }}>
            Próximo vencimento: <strong>{fmtDate(proxima.vencimento)}</strong> · {fmtBRL(proxima.valor)} · todo dia {v.diaVencimento}
          </div>
        )}
      </div>

      {/* Timeline completa de parcelas */}
      {v.parcelas.length > 0 && (
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--fg-muted)", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Linha do tempo — parcelas</span>
            <span style={{ fontSize: 12, color: "var(--fg-tertiary)" }}>{pagas.length} pagas · {emAtraso.length} em atraso · {futuras.length} futuras</span>
          </div>
          <div style={{ padding: "20px 20px 12px", maxHeight: 420, overflowY: "auto" as const }}>
            {v.parcelas.map((p, i) => {
              const isPaga    = p.status === "paga";
              const isFutura  = p.vencimento && new Date(p.vencimento) > hoje && !isPaga;
              const isAtrasada = p.vencimento && new Date(p.vencimento) <= hoje && !isPaga;
              const noPrazo   = isPaga && p.pagoEm && p.vencimento && new Date(p.pagoEm) <= new Date(p.vencimento);
              const comAtraso = isPaga && !noPrazo;

              const nodeColor  = noPrazo ? "#16a34a" : comAtraso ? "#d97706" : isAtrasada ? "#dc2626" : "var(--fg-muted)";
              const nodeBg     = noPrazo ? "#dcfce7" : comAtraso ? "#fef3c7" : isAtrasada ? "#fee2e2" : "var(--ink-100)";
              const labelColor = noPrazo ? "#16a34a" : comAtraso ? "#d97706" : isAtrasada ? "#dc2626" : "var(--fg-tertiary)";
              const label      = noPrazo ? "No prazo" : comAtraso ? "Com atraso" : isAtrasada ? "Em atraso" : "Futura";
              const Icon       = noPrazo ? CheckCircle2 : comAtraso ? Clock : isAtrasada ? AlertTriangle : Clock;

              const isLast = i === v.parcelas.length - 1;

              return (
                <div key={p.id} style={{ display: "flex", gap: 14, paddingBottom: isLast ? 0 : 4 }}>
                  {/* Linha vertical + nó */}
                  <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", flexShrink: 0, width: 28 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: nodeBg, border: `2px solid ${nodeColor}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={13} color={nodeColor} />
                    </div>
                    {!isLast && <div style={{ width: 2, flex: 1, minHeight: 20, background: "var(--border-subtle)", marginTop: 3 }} />}
                  </div>

                  {/* Conteúdo */}
                  <div style={{ flex: 1, paddingBottom: isLast ? 0 : 18 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <div>
                        <span style={{ fontSize: 14, fontWeight: 600, color: isFutura ? "var(--fg-tertiary)" : "var(--fg-primary)" }}>
                          Parcela {p.numero}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: labelColor, marginLeft: 8, padding: "1px 7px", borderRadius: 99, background: nodeBg }}>
                          {label}
                        </span>
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 700, color: isFutura ? "var(--fg-tertiary)" : "var(--fg-primary)", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                        {fmtBRL(p.valor)}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 3 }}>
                      Venc. {fmtDate(p.vencimento)}
                      {p.pagoEm && <span style={{ marginLeft: 8 }}>· Pago em {fmtDate(p.pagoEm)}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Link href={`/vendas/${v.id}`} style={{ alignSelf: "flex-start", fontSize: 13.5, color: "var(--navy-700)", fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5 }}>
        Ver contrato completo →
      </Link>
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
  const [tab, setTab] = useState<"geral" | "documentos" | "checklist" | "comprador">("geral");
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
          {venda && (
            <button style={tabBtn(tab === "comprador")} onClick={() => setTab("comprador")}>
              <User size={15} /> Comprador
            </button>
          )}
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
              <DetGrid label="CEP" value={terreno.cep ?? "—"} />
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
                  Vendido para <strong style={{ color: "var(--fg-primary)" }}>{venda.nomeComprador}</strong> em {fmtDate(venda.dataContrato)} — {fmtBRL(venda.valorTotal)}
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

            {/* Localização no mapa */}
            <div>
              <div style={{ fontSize: 11, color: "var(--fg-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginBottom: 10 }}>
                Localização
              </div>
              <MapaTerreno endereco={terreno.endereco} cidade={terreno.cidade} cep={terreno.cep} nome={terreno.nome} />
            </div>
          </div>
        )}

        {tab === "checklist" && <ChecklistTab terrenoId={terreno.id} />}

        {tab === "comprador" && venda && <CompradorTab venda={venda} />}

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
