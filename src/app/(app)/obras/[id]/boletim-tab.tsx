"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, ClipboardCheck, ChevronDown, ChevronUp } from "lucide-react";
import { fmtBRL, fmtDate } from "@/lib/format";

interface Servico {
  id: string;
  descricao: string;
  unidade: string;
  qtdeContratada: number;
  valorUnit: number;
  ordem: number;
}

interface MedicaoLinha {
  id: string;
  servicoId: string;
  qtdeMedida: number;
}

interface Medicao {
  id: string;
  numero: number;
  data: string;
  obs: string | null;
  linhas: MedicaoLinha[];
}

const UNIDADES = ["un", "m²", "m³", "m", "kg", "t", "l", "h", "dia", "vb", "sc", "cx"];

const inp: React.CSSProperties = {
  height: 36, padding: "0 10px", border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-md)", background: "var(--bg-surface)",
  color: "var(--fg-primary)", fontFamily: "var(--font-sans)", fontSize: 14, outline: "none",
};

const inpEdit: React.CSSProperties = {
  height: 30, padding: "0 8px", border: "1px solid var(--border-focus)",
  borderRadius: "var(--radius-md)", background: "var(--bg-surface)",
  color: "var(--fg-primary)", fontFamily: "var(--font-sans)", fontSize: 14, outline: "none",
};

export function BoletimTab({ obraId }: { obraId: string }) {
  const [servicos, setServicos]   = useState<Servico[]>([]);
  const [medicoes, setMedicoes]   = useState<Medicao[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showNovaForm, setShowNovaForm] = useState(false);
  const [showAddServico, setShowAddServico] = useState(false);
  const [expandedBM, setExpandedBM]   = useState<string | null>(null);

  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editVal, setEditVal]   = useState("");

  const [newServico, setNewServico] = useState({ descricao: "", unidade: "m²", qtdeContratada: "1", valorUnit: "" });
  const [novaMedData, setNovaMedData] = useState(new Date().toISOString().split("T")[0]);
  const [novaMedObs, setNovaMedObs]   = useState("");
  const [novaLinhas, setNovaLinhas]   = useState<Record<string, string>>({});
  const [savingMed, setSavingMed]     = useState(false);

  const load = useCallback(async () => {
    const r = await fetch(`/api/v1/obras/${obraId}/boletim`);
    const d = await r.json();
    setServicos(d.servicos ?? []);
    setMedicoes(d.medicoes ?? []);
    setLoading(false);
  }, [obraId]);

  useEffect(() => { load(); }, [load]);

  // Acumulado por serviço (soma de todas as medições)
  const acumulado = (sid: string) =>
    medicoes.flatMap((m) => m.linhas).filter((l) => l.servicoId === sid).reduce((s, l) => s + l.qtdeMedida, 0);

  const totalContratado = servicos.reduce((s, v) => s + v.qtdeContratada * v.valorUnit, 0);
  const totalMedido     = servicos.reduce((s, v) => s + Math.min(acumulado(v.id), v.qtdeContratada) * v.valorUnit, 0);
  const pctGeral        = totalContratado > 0 ? Math.min(Math.round((totalMedido / totalContratado) * 100), 100) : 0;

  // Inline edit serviço
  const startEdit = (id: string, field: string, val: string) => { setEditingCell({ id, field }); setEditVal(val); };
  const saveEdit  = async (id: string, field: string, rawVal?: string) => {
    const val = rawVal ?? editVal;
    setEditingCell(null);
    if (!val.trim()) return;
    let parsed: string | number = val.trim();
    if (field === "qtdeContratada" || field === "valorUnit") parsed = parseFloat(val.replace(",", ".")) || 0;
    setServicos((prev) => prev.map((s) => s.id === id ? { ...s, [field]: parsed } : s));
    await fetch(`/api/v1/obras/${obraId}/boletim/servicos/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: parsed }),
    });
  };

  const deleteServico = async (id: string) => {
    setServicos((prev) => prev.filter((s) => s.id !== id));
    await fetch(`/api/v1/obras/${obraId}/boletim/servicos/${id}`, { method: "DELETE" });
  };

  const addServico = async () => {
    if (!newServico.descricao.trim()) return;
    const qtd = parseFloat(newServico.qtdeContratada.replace(",", ".")) || 1;
    const val = parseFloat(newServico.valorUnit.replace(",", ".")) || 0;
    const r = await fetch(`/api/v1/obras/${obraId}/boletim`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo: "servico", descricao: newServico.descricao.trim(), unidade: newServico.unidade, qtdeContratada: qtd, valorUnit: val }),
    });
    const d = await r.json();
    setServicos((prev) => [...prev, d.servico]);
    setShowAddServico(false);
    setNewServico({ descricao: "", unidade: "m²", qtdeContratada: "1", valorUnit: "" });
  };

  const criarMedicao = async () => {
    setSavingMed(true);
    const linhas = Object.entries(novaLinhas)
      .map(([servicoId, v]) => ({ servicoId, qtdeMedida: parseFloat(v.replace(",", ".")) || 0 }))
      .filter((l) => l.qtdeMedida > 0);

    const r = await fetch(`/api/v1/obras/${obraId}/boletim`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo: "medicao", data: novaMedData, obs: novaMedObs || null, linhas }),
    });
    const d = await r.json();
    setMedicoes((prev) => [...prev, d.medicao]);
    setShowNovaForm(false);
    setNovaLinhas({});
    setNovaMedObs("");
    setSavingMed(false);
  };

  const deleteMedicao = async (id: string) => {
    await fetch(`/api/v1/obras/${obraId}/boletim/medicoes/${id}`, { method: "DELETE" });
    setMedicoes((prev) => prev.filter((m) => m.id !== id));
  };

  if (loading) return (
    <div style={{ textAlign: "center", padding: "60px 0", color: "var(--fg-tertiary)", fontSize: 15 }}>Carregando boletim…</div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 14 }}>
        {[
          { label: "BMs emitidos",       value: String(medicoes.length),     color: "var(--fg-primary)" },
          { label: "Avanço físico geral", value: `${pctGeral}%`,              color: pctGeral >= 100 ? "#16a34a" : "#1e3a5f" },
          { label: "Valor medido",        value: fmtBRL(totalMedido),         color: "#1e3a5f" },
          { label: "A medir",             value: fmtBRL(Math.max(0, totalContratado - totalMedido)), color: "#b45309" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "18px 22px" }}>
            <div style={{ fontSize: 11.5, color: "var(--fg-tertiary)", textTransform: "uppercase" as const, letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>{label}</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 400, color, letterSpacing: "-0.01em" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Tabela de serviços contratados */}
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: 12 }}>
          <ClipboardCheck size={16} style={{ color: "var(--navy-700)" }} />
          <span style={{ fontWeight: 700, fontSize: 15, color: "var(--fg-primary)", flex: 1 }}>Serviços contratados</span>
          <button
            onClick={() => { setShowAddServico(!showAddServico); setNewServico({ descricao: "", unidade: "m²", qtdeContratada: "1", valorUnit: "" }); }}
            style={{ height: 30, padding: "0 12px", background: showAddServico ? "transparent" : "#1e3a5f", color: showAddServico ? "var(--fg-secondary)" : "#fff", border: showAddServico ? "1px solid var(--border-default)" : "none", borderRadius: "var(--radius-md)", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}
          >
            {showAddServico ? "Cancelar" : <><Plus size={13} /> Serviço</>}
          </button>
          <button
            onClick={() => { setShowNovaForm(!showNovaForm); setNovaLinhas({}); }}
            disabled={servicos.length === 0}
            style={{ height: 30, padding: "0 12px", background: showNovaForm ? "transparent" : "#16a34a", color: showNovaForm ? "var(--fg-secondary)" : "#fff", border: showNovaForm ? "1px solid var(--border-default)" : "none", borderRadius: "var(--radius-md)", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, cursor: servicos.length === 0 ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", gap: 5, opacity: servicos.length === 0 ? 0.5 : 1 }}
          >
            {showNovaForm ? "Cancelar BM" : <><Plus size={13} /> Novo BM</>}
          </button>
        </div>

        {servicos.length === 0 && !showAddServico && (
          <div style={{ padding: "24px 20px", textAlign: "center", fontSize: 14, color: "var(--fg-muted)" }}>
            Cadastre os serviços contratados antes de lançar medições.
          </div>
        )}

        {servicos.length > 0 && (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Serviço", "Unid.", "Contratado", "Medido", "% Avanço", "Val. unit.", "Medido R$", ""].map((h, i) => (
                  <th key={i} style={{ padding: "9px 14px", fontSize: 11, fontWeight: 700, color: "var(--fg-muted)", textTransform: "uppercase" as const, letterSpacing: "0.07em", background: "var(--ink-50)", borderBottom: "1px solid var(--border-subtle)", textAlign: (i >= 2 && i <= 6) ? "right" as const : "left" as const, whiteSpace: "nowrap" as const }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {servicos.map((s) => {
                const ac  = acumulado(s.id);
                const pct = s.qtdeContratada > 0 ? Math.min(Math.round((ac / s.qtdeContratada) * 100), 100) : 0;
                const valorMedido = Math.min(ac, s.qtdeContratada) * s.valorUnit;

                const isEditDescricao = editingCell?.id === s.id && editingCell.field === "descricao";
                const isEditUnidade   = editingCell?.id === s.id && editingCell.field === "unidade";
                const isEditQtde      = editingCell?.id === s.id && editingCell.field === "qtdeContratada";
                const isEditVal       = editingCell?.id === s.id && editingCell.field === "valorUnit";

                return (
                  <tr key={s.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td style={{ padding: "10px 14px", fontSize: 14, color: "var(--fg-primary)", cursor: "pointer", minWidth: 200 }}
                      onClick={() => { if (!editingCell) startEdit(s.id, "descricao", s.descricao); }}>
                      {isEditDescricao ? (
                        <input autoFocus value={editVal} onChange={(e) => setEditVal(e.target.value)}
                          onBlur={() => saveEdit(s.id, "descricao")}
                          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") setEditingCell(null); }}
                          style={{ ...inpEdit, width: "100%" }} />
                      ) : (
                        <span style={{ borderBottom: "1px dashed var(--border-default)", display: "inline-block" }}>{s.descricao}</span>
                      )}
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: 13, color: "var(--fg-secondary)", cursor: "pointer" }}
                      onClick={() => { if (!editingCell) startEdit(s.id, "unidade", s.unidade); }}>
                      {isEditUnidade ? (
                        <select autoFocus value={editVal}
                          onChange={(e) => { const v = e.target.value; setEditVal(v); saveEdit(s.id, "unidade", v); }}
                          onBlur={() => setEditingCell(null)}
                          style={{ ...inpEdit, paddingLeft: 6 }}>
                          {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                      ) : (
                        <span style={{ borderBottom: "1px dashed var(--border-default)", display: "inline-block" }}>{s.unidade}</span>
                      )}
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: 13, color: "var(--fg-secondary)", textAlign: "right", cursor: "pointer", fontVariantNumeric: "tabular-nums" }}
                      onClick={() => { if (!editingCell) startEdit(s.id, "qtdeContratada", String(s.qtdeContratada)); }}>
                      {isEditQtde ? (
                        <input autoFocus value={editVal} type="number" min="0" step="0.01"
                          onChange={(e) => setEditVal(e.target.value)}
                          onBlur={() => saveEdit(s.id, "qtdeContratada")}
                          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") setEditingCell(null); }}
                          style={{ ...inpEdit, width: 80, textAlign: "right" }} />
                      ) : (
                        <span style={{ borderBottom: "1px dashed var(--border-default)", display: "inline-block" }}>
                          {s.qtdeContratada % 1 === 0 ? s.qtdeContratada.toFixed(0) : s.qtdeContratada.toFixed(2)}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600, color: pct >= 100 ? "#16a34a" : "var(--fg-primary)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {ac % 1 === 0 ? ac.toFixed(0) : ac.toFixed(2)}
                    </td>
                    <td style={{ padding: "10px 14px", minWidth: 120 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                        <div style={{ flex: 1, height: 8, background: "var(--ink-100)", borderRadius: 99, overflow: "hidden", maxWidth: 80 }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: pct >= 100 ? "#16a34a" : "#1e3a5f", borderRadius: 99 }} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: pct >= 100 ? "#16a34a" : "#1e3a5f", minWidth: 34, textAlign: "right" }}>{pct}%</span>
                      </div>
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: 13, color: "var(--fg-secondary)", textAlign: "right", cursor: "pointer", fontVariantNumeric: "tabular-nums" }}
                      onClick={() => { if (!editingCell) startEdit(s.id, "valorUnit", String(s.valorUnit)); }}>
                      {isEditVal ? (
                        <input autoFocus value={editVal} type="number" min="0" step="0.01"
                          onChange={(e) => setEditVal(e.target.value)}
                          onBlur={() => saveEdit(s.id, "valorUnit")}
                          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") setEditingCell(null); }}
                          style={{ ...inpEdit, width: 100, textAlign: "right" }} />
                      ) : (
                        <span style={{ borderBottom: "1px dashed var(--border-default)", display: "inline-block" }}>{fmtBRL(s.valorUnit)}</span>
                      )}
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 700, color: "#1e3a5f", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {fmtBRL(valorMedido)}
                    </td>
                    <td style={{ padding: "10px 14px", width: 40 }}>
                      <button onClick={() => deleteServico(s.id)}
                        style={{ width: 28, height: 28, border: "none", background: "transparent", color: "var(--fg-muted)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "var(--radius-md)" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#dc2626"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--fg-muted)"; }}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={6} style={{ padding: "11px 14px", fontWeight: 700, fontSize: 13, color: "var(--fg-secondary)", borderTop: "2px solid var(--border-subtle)" }}>
                  Total contratado
                </td>
                <td style={{ padding: "11px 14px", fontWeight: 700, fontSize: 15, color: "#1e3a5f", textAlign: "right", borderTop: "2px solid var(--border-subtle)", fontVariantNumeric: "tabular-nums" }}>
                  {fmtBRL(totalContratado)}
                </td>
                <td style={{ borderTop: "2px solid var(--border-subtle)" }} />
              </tr>
            </tfoot>
          </table>
        )}

        {/* Form adicionar serviço */}
        {showAddServico && (
          <div style={{ padding: "14px 20px", background: "var(--ink-50)", borderTop: servicos.length > 0 ? "1px solid var(--border-subtle)" : "none", display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" as const }}>
            <div style={{ flex: 2, minWidth: 160, display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--fg-muted)", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Serviço *</label>
              <input autoFocus value={newServico.descricao}
                onChange={(e) => setNewServico((p) => ({ ...p, descricao: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter") addServico(); }}
                placeholder="Ex: Alvenaria de tijolos"
                style={inp} />
            </div>
            <div style={{ minWidth: 90, display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--fg-muted)", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Unidade</label>
              <select value={newServico.unidade} onChange={(e) => setNewServico((p) => ({ ...p, unidade: e.target.value }))} style={inp}>
                {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div style={{ minWidth: 100, display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--fg-muted)", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Qtde contratada</label>
              <input value={newServico.qtdeContratada} onChange={(e) => setNewServico((p) => ({ ...p, qtdeContratada: e.target.value }))}
                type="number" min="0" step="0.01" style={inp} />
            </div>
            <div style={{ minWidth: 120, display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--fg-muted)", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Preço unit. (R$)</label>
              <input value={newServico.valorUnit} onChange={(e) => setNewServico((p) => ({ ...p, valorUnit: e.target.value }))}
                type="number" min="0" step="0.01" placeholder="0,00" style={inp} />
            </div>
            <button onClick={addServico} disabled={!newServico.descricao.trim()}
              style={{ height: 36, padding: "0 20px", background: "#1e3a5f", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600, cursor: !newServico.descricao.trim() ? "not-allowed" : "pointer", opacity: !newServico.descricao.trim() ? 0.5 : 1 }}>
              Salvar
            </button>
          </div>
        )}
      </div>

      {/* Form nova medição */}
      {showNovaForm && (
        <div style={{ background: "var(--bg-surface)", border: "1px solid #16a34a", borderRadius: "var(--radius-lg)", padding: "20px 22px" }}>
          <p style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "var(--fg-primary)" }}>
            Nova Medição — BM nº {(medicoes.length) + 1}
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" as const, marginBottom: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--fg-muted)", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Data</label>
              <input type="date" value={novaMedData} onChange={(e) => setNovaMedData(e.target.value)} style={inp} />
            </div>
            <div style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--fg-muted)", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Observação (opcional)</label>
              <input value={novaMedObs} onChange={(e) => setNovaMedObs(e.target.value)} placeholder="Ex: 1ª medição — alvenaria do pavimento térreo" style={inp} />
            </div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16 }}>
            <thead>
              <tr>
                {["Serviço", "Unid.", "Contratado", "Já medido", "Qtde neste BM"].map((h, i) => (
                  <th key={i} style={{ padding: "8px 12px", fontSize: 11, fontWeight: 700, color: "var(--fg-muted)", textTransform: "uppercase" as const, letterSpacing: "0.06em", background: "var(--ink-50)", borderBottom: "1px solid var(--border-subtle)", textAlign: i >= 2 ? "right" as const : "left" as const }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {servicos.map((s) => {
                const ac = acumulado(s.id);
                const restante = Math.max(0, s.qtdeContratada - ac);
                return (
                  <tr key={s.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td style={{ padding: "10px 12px", fontSize: 14, color: "var(--fg-primary)" }}>{s.descricao}</td>
                    <td style={{ padding: "10px 12px", fontSize: 13, color: "var(--fg-muted)" }}>{s.unidade}</td>
                    <td style={{ padding: "10px 12px", fontSize: 13, color: "var(--fg-secondary)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {s.qtdeContratada % 1 === 0 ? s.qtdeContratada.toFixed(0) : s.qtdeContratada.toFixed(2)}
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: 13, color: ac >= s.qtdeContratada ? "#16a34a" : "var(--fg-secondary)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {ac % 1 === 0 ? ac.toFixed(0) : ac.toFixed(2)}
                      {restante > 0 && <span style={{ fontSize: 11, color: "var(--fg-muted)", display: "block" }}>falta {restante % 1 === 0 ? restante.toFixed(0) : restante.toFixed(2)}</span>}
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "right" }}>
                      <input
                        type="number" min="0" step="0.01" placeholder="0"
                        value={novaLinhas[s.id] ?? ""}
                        onChange={(e) => setNovaLinhas((p) => ({ ...p, [s.id]: e.target.value }))}
                        style={{ ...inp, width: 100, textAlign: "right", height: 32 }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button onClick={() => { setShowNovaForm(false); setNovaLinhas({}); }}
              style={{ height: 38, padding: "0 16px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "transparent", color: "var(--fg-secondary)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 14 }}>
              Cancelar
            </button>
            <button onClick={criarMedicao} disabled={savingMed}
              style={{ height: 38, padding: "0 22px", background: "#16a34a", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600, cursor: savingMed ? "not-allowed" : "pointer", opacity: savingMed ? 0.7 : 1 }}>
              {savingMed ? "Salvando…" : "Registrar medição"}
            </button>
          </div>
        </div>
      )}

      {/* Histórico de BMs */}
      {medicoes.length > 0 && (
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: "var(--fg-primary)" }}>Histórico de medições ({medicoes.length})</span>
          </div>
          {[...medicoes].reverse().map((m) => {
            const totalBM = m.linhas.reduce((s, l) => {
              const sv = servicos.find((x) => x.id === l.servicoId);
              return s + l.qtdeMedida * (sv?.valorUnit ?? 0);
            }, 0);
            const isExp = expandedBM === m.id;
            return (
              <div key={m.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <div
                  onClick={() => setExpandedBM(isExp ? null : m.id)}
                  style={{ padding: "13px 20px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "var(--ink-50)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "#1e3a5f", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                    {m.numero}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-primary)" }}>BM nº {m.numero}</div>
                    <div style={{ fontSize: 12.5, color: "var(--fg-muted)" }}>{fmtDate(m.data)}{m.obs ? ` · ${m.obs}` : ""}</div>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#1e3a5f", fontVariantNumeric: "tabular-nums" }}>{fmtBRL(totalBM)}</span>
                  {isExp ? <ChevronUp size={16} style={{ color: "var(--fg-muted)" }} /> : <ChevronDown size={16} style={{ color: "var(--fg-muted)" }} />}
                  <button onClick={(e) => { e.stopPropagation(); deleteMedicao(m.id); }}
                    style={{ width: 28, height: 28, border: "none", background: "transparent", color: "var(--fg-muted)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "var(--radius-md)" }}
                    onMouseEnter={(ev) => { (ev.currentTarget as HTMLButtonElement).style.color = "#dc2626"; }}
                    onMouseLeave={(ev) => { (ev.currentTarget as HTMLButtonElement).style.color = "var(--fg-muted)"; }}>
                    <Trash2 size={13} />
                  </button>
                </div>
                {isExp && m.linhas.length > 0 && (
                  <div style={{ padding: "0 20px 14px", background: "var(--ink-50)" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          {["Serviço", "Unid.", "Qtde medida", "Valor"].map((h, i) => (
                            <th key={i} style={{ padding: "7px 12px", fontSize: 11, fontWeight: 700, color: "var(--fg-muted)", textTransform: "uppercase" as const, letterSpacing: "0.06em", textAlign: i >= 2 ? "right" as const : "left" as const, borderBottom: "1px solid var(--border-subtle)" }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {m.linhas.map((l) => {
                          const sv = servicos.find((x) => x.id === l.servicoId);
                          return (
                            <tr key={l.id}>
                              <td style={{ padding: "8px 12px", fontSize: 13, color: "var(--fg-primary)" }}>{sv?.descricao ?? "—"}</td>
                              <td style={{ padding: "8px 12px", fontSize: 12, color: "var(--fg-muted)" }}>{sv?.unidade ?? "—"}</td>
                              <td style={{ padding: "8px 12px", fontSize: 13, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                                {l.qtdeMedida % 1 === 0 ? l.qtdeMedida.toFixed(0) : l.qtdeMedida.toFixed(2)}
                              </td>
                              <td style={{ padding: "8px 12px", fontSize: 13, fontWeight: 700, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                                {fmtBRL(l.qtdeMedida * (sv?.valorUnit ?? 0))}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
