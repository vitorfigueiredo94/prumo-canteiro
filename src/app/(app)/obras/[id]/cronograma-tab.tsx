"use client";

import { useState, useEffect, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FaseInfo {
  fase: string;
  porcentagem: number;
  total: number;
  concluidos: number;
}

interface FaseDatas {
  inicio: string | null;
  fim: string | null;
}

type Cronograma = Partial<Record<"OBRA_INICIO" | "OBRA_MEIO" | "OBRA_FIM", FaseDatas>>;

const FASES: Array<{ key: "OBRA_INICIO" | "OBRA_MEIO" | "OBRA_FIM"; label: string; color: string }> = [
  { key: "OBRA_INICIO", label: "Início da obra",   color: "#1e3a5f" },
  { key: "OBRA_MEIO",   label: "Execução (meio)",  color: "#b45309" },
  { key: "OBRA_FIM",    label: "Entrega (fim)",     color: "#047857" },
];

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s.includes("T") ? s : s + "T12:00:00");
  return isNaN(d.getTime()) ? null : d;
}

function fmtLabel(s: string | null): string {
  if (!s) return "—";
  const d = parseDate(s);
  if (!d) return "—";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function toInputDate(s: string | null): string {
  if (!s) return "";
  return s.slice(0, 10);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CronogramaTab({
  obraId,
  obraInicio,
  obraPrazo,
  cronogramaJsonInit,
}: {
  obraId: string;
  obraInicio: string | null;
  obraPrazo: string | null;
  cronogramaJsonInit: string | null;
}) {
  const [fases, setFases] = useState<FaseInfo[]>([]);
  const [cronograma, setCronograma] = useState<Cronograma>(() =>
    cronogramaJsonInit ? JSON.parse(cronogramaJsonInit) : {}
  );
  const [editando, setEditando] = useState<"OBRA_INICIO" | "OBRA_MEIO" | "OBRA_FIM" | null>(null);
  const [draft, setDraft] = useState<FaseDatas>({ inicio: null, fim: null });
  const [saving, setSaving] = useState(false);

  const loadFases = useCallback(async () => {
    const res = await fetch(`/api/v1/obras/${obraId}/tarefas/fases`);
    if (!res.ok) return;
    const data = await res.json();
    const checklists: Array<{ fase: string; porcentagem: number; total: number; concluidos: number }> =
      data.checklists ?? [];
    setFases(checklists.map((c) => ({ fase: c.fase, porcentagem: c.porcentagem, total: c.total, concluidos: c.concluidos })));
  }, [obraId]);

  useEffect(() => { loadFases(); }, [loadFases]);

  // Compute global timeline bounds for the Gantt ruler
  const allDates: Date[] = [];
  if (obraInicio) { const d = parseDate(obraInicio); if (d) allDates.push(d); }
  if (obraPrazo)  { const d = parseDate(obraPrazo);  if (d) allDates.push(d); }
  FASES.forEach(({ key }) => {
    const c = cronograma[key];
    if (c?.inicio) { const d = parseDate(c.inicio); if (d) allDates.push(d); }
    if (c?.fim)    { const d = parseDate(c.fim);    if (d) allDates.push(d); }
  });

  const tlStart = allDates.length ? Math.min(...allDates.map((d) => d.getTime())) : null;
  const tlEnd   = allDates.length ? Math.max(...allDates.map((d) => d.getTime())) : null;
  const tlSpan  = tlStart && tlEnd && tlEnd > tlStart ? tlEnd - tlStart : null;

  function pct(ts: number): number {
    if (!tlStart || !tlSpan) return 0;
    return Math.max(0, Math.min(100, ((ts - tlStart) / tlSpan) * 100));
  }

  const todayPct = tlSpan ? pct(Date.now()) : null;

  async function salvarFase(key: "OBRA_INICIO" | "OBRA_MEIO" | "OBRA_FIM") {
    setSaving(true);
    const novo = { ...cronograma, [key]: { inicio: draft.inicio || null, fim: draft.fim || null } };
    try {
      await fetch(`/api/v1/obras/${obraId}/cronograma`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(novo),
      });
      setCronograma(novo);
      setEditando(null);
    } finally {
      setSaving(false);
    }
  }

  const hasDatas = FASES.some(({ key }) => cronograma[key]?.inicio || cronograma[key]?.fim);

  const inp: React.CSSProperties = {
    height: 34, padding: "0 10px", border: "1px solid var(--border-default)",
    borderRadius: "var(--radius-md)", background: "var(--bg-surface)", color: "var(--fg-primary)",
    fontFamily: "var(--font-sans)", fontSize: 13.5, outline: "none",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "20px 24px" }}>
        <p style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 600, color: "var(--fg-primary)" }}>Cronograma de Obra</p>
        <p style={{ margin: 0, fontSize: 13.5, color: "var(--fg-tertiary)" }}>
          Defina as datas planejadas para cada fase. O preenchimento do checklist define o progresso real.
        </p>
      </div>

      {/* Gantt ruler */}
      {hasDatas && tlStart && tlEnd && tlSpan ? (
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "20px 24px" }}>
          <p style={{ margin: "0 0 18px", fontSize: 13.5, fontWeight: 600, color: "var(--fg-secondary)", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Linha do Tempo</p>

          {/* Ruler labels */}
          <div style={{ position: "relative", height: 22, marginBottom: 6 }}>
            <span style={{ position: "absolute", left: 0, fontSize: 11.5, color: "var(--fg-tertiary)" }}>{new Date(tlStart).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}</span>
            <span style={{ position: "absolute", right: 0, fontSize: 11.5, color: "var(--fg-tertiary)" }}>{new Date(tlEnd).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}</span>
          </div>

          {/* Phase rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {FASES.map(({ key, label, color }) => {
              const c = cronograma[key];
              const startDate = parseDate(c?.inicio ?? null);
              const endDate   = parseDate(c?.fim ?? null);
              const faseInfo  = fases.find((f) => f.fase === key);
              const completion = faseInfo?.porcentagem ?? 0;
              const hasBar = startDate && endDate && endDate > startDate;

              const barLeft  = hasBar ? pct(startDate.getTime()) : 0;
              const barRight = hasBar ? pct(endDate.getTime()) : 0;
              const barWidth = hasBar ? barRight - barLeft : 0;

              return (
                <div key={key} style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  {/* Label */}
                  <div style={{ width: 130, flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-primary)", whiteSpace: "nowrap" as const }}>{label}</div>
                    {faseInfo && (
                      <div style={{ fontSize: 11.5, color: "var(--fg-tertiary)" }}>{faseInfo.concluidos}/{faseInfo.total} itens · {completion}%</div>
                    )}
                  </div>

                  {/* Bar track */}
                  <div style={{ flex: 1, position: "relative", height: 28, background: "var(--ink-50)", borderRadius: 6, overflow: "hidden" }}>
                    {hasBar ? (
                      <div
                        style={{
                          position: "absolute",
                          left: `${barLeft}%`,
                          width: `${barWidth}%`,
                          height: "100%",
                          background: `${color}22`,
                          border: `1.5px solid ${color}55`,
                          borderRadius: 6,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${completion}%`,
                            height: "100%",
                            background: color,
                            borderRadius: 6,
                            opacity: 0.85,
                            transition: "width 600ms",
                          }}
                        />
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", height: "100%", paddingLeft: 10 }}>
                        <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>Sem datas definidas</span>
                      </div>
                    )}

                    {/* Today line */}
                    {todayPct !== null && todayPct >= 0 && todayPct <= 100 && (
                      <div style={{ position: "absolute", left: `${todayPct}%`, top: 0, bottom: 0, width: 2, background: "#dc2626", zIndex: 2 }} />
                    )}
                  </div>

                  {/* Dates */}
                  <div style={{ width: 150, flexShrink: 0, fontSize: 12, color: "var(--fg-tertiary)", textAlign: "right" as const }}>
                    {fmtLabel(c?.inicio ?? null)} → {fmtLabel(c?.fim ?? null)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          {todayPct !== null && todayPct >= 0 && todayPct <= 100 && (
            <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--fg-tertiary)" }}>
              <div style={{ width: 12, height: 12, background: "#dc2626", borderRadius: 2 }} />
              <span>Hoje</span>
            </div>
          )}
        </div>
      ) : null}

      {/* Phase editor cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {FASES.map(({ key, label, color }) => {
          const c = cronograma[key];
          const faseInfo = fases.find((f) => f.fase === key);
          const isEditing = editando === key;

          return (
            <div key={key} style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "18px 22px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" as const }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg-primary)" }}>{label}</div>
                    {faseInfo && (
                      <div style={{ fontSize: 12.5, color: "var(--fg-tertiary)", marginTop: 2 }}>
                        Checklist: {faseInfo.concluidos}/{faseInfo.total} itens concluídos ({faseInfo.porcentagem}%)
                      </div>
                    )}
                    {!faseInfo && (
                      <div style={{ fontSize: 12.5, color: "var(--fg-muted)", marginTop: 2 }}>Fase ainda não iniciada</div>
                    )}
                  </div>
                </div>

                {!isEditing && (
                  <button
                    onClick={() => { setEditando(key); setDraft({ inicio: c?.inicio ?? null, fim: c?.fim ?? null }); }}
                    style={{ height: 32, padding: "0 14px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "transparent", color: "var(--fg-secondary)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 500 }}
                  >
                    {c?.inicio || c?.fim ? "Editar datas" : "Definir datas"}
                  </button>
                )}
              </div>

              {/* Date display */}
              {!isEditing && (c?.inicio || c?.fim) && (
                <div style={{ display: "flex", gap: 24, marginTop: 14, flexWrap: "wrap" as const }}>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--fg-muted)", textTransform: "uppercase" as const, letterSpacing: "0.05em", fontWeight: 600, marginBottom: 3 }}>Início previsto</div>
                    <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--fg-primary)" }}>{fmtLabel(c?.inicio ?? null)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--fg-muted)", textTransform: "uppercase" as const, letterSpacing: "0.05em", fontWeight: 600, marginBottom: 3 }}>Fim previsto</div>
                    <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--fg-primary)" }}>{fmtLabel(c?.fim ?? null)}</div>
                  </div>
                </div>
              )}

              {/* Inline editor */}
              {isEditing && (
                <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" as const, alignItems: "flex-end" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--fg-secondary)" }}>Início previsto</label>
                    <input type="date" value={toInputDate(draft.inicio)} onChange={(e) => setDraft((p) => ({ ...p, inicio: e.target.value || null }))} style={inp} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <label style={{ fontSize: 12.5, fontWeight: 600, color: "var(--fg-secondary)" }}>Fim previsto</label>
                    <input type="date" value={toInputDate(draft.fim)} onChange={(e) => setDraft((p) => ({ ...p, fim: e.target.value || null }))} style={inp} />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => salvarFase(key)}
                      disabled={saving}
                      style={{ height: 34, padding: "0 16px", background: "var(--navy-700)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontFamily: "var(--font-sans)", fontSize: 13.5, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
                    >
                      {saving ? "Salvando…" : "Salvar"}
                    </button>
                    <button
                      onClick={() => setEditando(null)}
                      style={{ height: 34, padding: "0 14px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "transparent", color: "var(--fg-secondary)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 13.5 }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
