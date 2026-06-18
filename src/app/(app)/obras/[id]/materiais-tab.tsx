"use client";

import { useEffect, useState, useTransition } from "react";
import { Plus, Trash2, Package } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Material {
  id: string;
  nome: string;
  quantidade: number;
  unidade: string;
  valorUnit: number;
  fornecedor: string | null;
  data: string | null;
  obs: string | null;
  criadoEm: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const UNIDADES = ["un", "kg", "g", "m", "m²", "m³", "L", "sacos", "caixas", "barras", "peças", "cx", "lote", "t"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtData(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR");
}

const inp: React.CSSProperties = {
  height: 38, padding: "0 10px", border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-md)", background: "var(--bg-surface)", color: "var(--fg-primary)",
  fontFamily: "var(--font-sans)", fontSize: 14, outline: "none", width: "100%",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function MateriaisTab({ obraId }: { obraId: string }) {
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Form state
  const [nome, setNome] = useState("");
  const [qtd, setQtd] = useState("");
  const [unidade, setUnidade] = useState("un");
  const [valorUnit, setValorUnit] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [data, setData] = useState("");
  const [obs, setObs] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);

  useEffect(() => {
    fetch(`/api/v1/obras/${obraId}/materiais`)
      .then((r) => r.json())
      .then((d) => { setMateriais(d.materiais ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [obraId]);

  // Computed KPIs
  const totalGasto = materiais.reduce((s, m) => s + m.quantidade * m.valorUnit, 0);
  const maisCaroItem = materiais.reduce<Material | null>((best, m) => {
    const v = m.quantidade * m.valorUnit;
    return best == null || v > best.quantidade * best.valorUnit ? m : best;
  }, null);

  // Preview do valor total no formulário
  const valorTotalPreview = (() => {
    const q = parseFloat(qtd);
    const v = parseFloat(valorUnit);
    return !isNaN(q) && !isNaN(v) ? q * v : null;
  })();

  function resetForm() {
    setNome(""); setQtd(""); setUnidade("un"); setValorUnit("");
    setFornecedor(""); setData(""); setObs(""); setErro(null);
    setShowForm(false);
  }

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !qtd || !valorUnit) return;
    setCriando(true); setErro(null);
    try {
      const res = await fetch(`/api/v1/obras/${obraId}/materiais`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          quantidade: parseFloat(qtd),
          unidade,
          valorUnit: parseFloat(valorUnit),
          fornecedor: fornecedor.trim() || undefined,
          data: data || undefined,
          obs: obs.trim() || undefined,
        }),
      });
      const payload = await res.json();
      if (!res.ok) { setErro(payload.error ?? "Erro ao salvar."); return; }
      setMateriais((prev) => [payload, ...prev]);
      resetForm();
    } finally {
      setCriando(false);
    }
  }

  function handleExcluir(id: string) {
    if (!confirm("Remover este material?")) return;
    startTransition(async () => {
      await fetch(`/api/v1/obras/${obraId}/materiais/${id}`, { method: "DELETE" });
      setMateriais((prev) => prev.filter((m) => m.id !== id));
    });
  }

  if (loading) return (
    <p style={{ textAlign: "center", padding: "40px 0", color: "var(--fg-tertiary)", fontSize: 15 }}>
      Carregando materiais…
    </p>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 14 }}>
        {[
          { label: "Total gasto",    value: fmtBRL(totalGasto) },
          { label: "Itens lançados", value: String(materiais.length) },
          { label: "Item mais caro", value: maisCaroItem ? maisCaroItem.nome : "—" },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "16px 20px" }}>
            <div style={{ fontSize: 11.5, color: "var(--fg-tertiary)", textTransform: "uppercase" as const, letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>{label}</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: label === "Item mais caro" ? 16 : 24, fontWeight: 400, color: "var(--fg-primary)", letterSpacing: "-0.01em", wordBreak: "break-word" as const }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "var(--fg-primary)" }}>Materiais utilizados</p>
        <button
          onClick={() => setShowForm(true)}
          style={{ height: 36, padding: "0 16px", background: "var(--navy-700)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontFamily: "var(--font-sans)", fontSize: 13.5, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <Plus size={14} /> Adicionar material
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleCriar} style={{ background: "var(--ink-50)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 500, color: "var(--fg-primary)" }}>Novo material</p>

          {/* Row 1: nome + unidade */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-secondary)" }}>Material / Insumo <span style={{ color: "var(--danger-500)" }}>*</span></label>
              <input required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Cimento CP III" style={inp} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-secondary)" }}>Unidade</label>
              <select value={unidade} onChange={(e) => setUnidade(e.target.value)} style={inp}>
                {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          {/* Row 2: quantidade + valor unit + total preview */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-secondary)" }}>Quantidade <span style={{ color: "var(--danger-500)" }}>*</span></label>
              <input required type="number" min="0" step="any" value={qtd} onChange={(e) => setQtd(e.target.value)} placeholder="50" style={inp} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-secondary)" }}>Valor unitário (R$) <span style={{ color: "var(--danger-500)" }}>*</span></label>
              <input required type="number" min="0" step="0.01" value={valorUnit} onChange={(e) => setValorUnit(e.target.value)} placeholder="32,00" style={inp} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-secondary)" }}>Total calculado</label>
              <div style={{ ...inp, display: "flex", alignItems: "center", background: "var(--ink-100)", color: valorTotalPreview != null ? "var(--fg-primary)" : "var(--fg-muted)", fontWeight: valorTotalPreview != null ? 700 : 400 }}>
                {valorTotalPreview != null ? fmtBRL(valorTotalPreview) : "—"}
              </div>
            </div>
          </div>

          {/* Row 3: fornecedor + data */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-secondary)" }}>Fornecedor (opcional)</label>
              <input value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} placeholder="Ex: Depósito Central" style={inp} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-secondary)" }}>Data da compra (opcional)</label>
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} style={inp} />
            </div>
          </div>

          {/* Row 4: obs */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-secondary)" }}>Observação (opcional)</label>
            <input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex: Para fundação bloco A" style={inp} />
          </div>

          {erro && <p style={{ margin: 0, fontSize: 13, color: "var(--danger-500)" }}>{erro}</p>}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" onClick={resetForm} style={{ height: 36, padding: "0 14px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "transparent", color: "var(--fg-secondary)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 13.5 }}>Cancelar</button>
            <button type="submit" disabled={criando} style={{ height: 36, padding: "0 18px", background: "var(--navy-700)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontFamily: "var(--font-sans)", fontSize: 13.5, fontWeight: 600, cursor: criando ? "not-allowed" : "pointer", opacity: criando ? 0.7 : 1 }}>
              {criando ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        {materiais.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <Package size={32} style={{ color: "var(--fg-muted)", marginBottom: 10 }} />
            <p style={{ margin: 0, fontSize: 15, color: "var(--fg-tertiary)" }}>Nenhum material lançado ainda.</p>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--fg-muted)" }}>Clique em "Adicionar material" para registrar o primeiro.</p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Material", "Qtde", "Valor unit.", "Total", "Fornecedor", "Data", ""].map((h, i) => (
                  <th key={i} style={{ padding: "10px 14px", fontSize: 11.5, fontWeight: 700, color: "var(--fg-tertiary)", textTransform: "uppercase" as const, letterSpacing: "0.06em", background: "var(--ink-50)", borderBottom: "1px solid var(--border-subtle)", textAlign: i >= 2 && i <= 3 ? "right" as const : "left" as const, whiteSpace: "nowrap" as const }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {materiais.map((m, i) => {
                const total = m.quantidade * m.valorUnit;
                return (
                  <tr key={m.id}>
                    <td style={{ padding: "12px 14px", fontSize: 14, color: "var(--fg-primary)", fontWeight: 600, borderBottom: i < materiais.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                      {m.nome}
                      {m.obs && <div style={{ fontSize: 12, color: "var(--fg-muted)", fontWeight: 400, marginTop: 2 }}>{m.obs}</div>}
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 14, color: "var(--fg-secondary)", borderBottom: i < materiais.length - 1 ? "1px solid var(--border-subtle)" : "none", whiteSpace: "nowrap" as const }}>
                      {m.quantidade % 1 === 0 ? m.quantidade.toFixed(0) : m.quantidade.toFixed(2)} {m.unidade}
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 14, color: "var(--fg-secondary)", textAlign: "right" as const, borderBottom: i < materiais.length - 1 ? "1px solid var(--border-subtle)" : "none", fontVariantNumeric: "tabular-nums" }}>
                      {fmtBRL(m.valorUnit)}
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 14, fontWeight: 700, color: "var(--fg-primary)", textAlign: "right" as const, borderBottom: i < materiais.length - 1 ? "1px solid var(--border-subtle)" : "none", fontVariantNumeric: "tabular-nums" }}>
                      {fmtBRL(total)}
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 13, color: "var(--fg-tertiary)", borderBottom: i < materiais.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                      {m.fornecedor ?? "—"}
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 13, color: "var(--fg-tertiary)", borderBottom: i < materiais.length - 1 ? "1px solid var(--border-subtle)" : "none", whiteSpace: "nowrap" as const }}>
                      {fmtData(m.data)}
                    </td>
                    <td style={{ padding: "12px 14px", borderBottom: i < materiais.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                      <button
                        onClick={() => handleExcluir(m.id)}
                        disabled={isPending}
                        title="Remover"
                        style={{ width: 30, height: 30, border: "none", background: "transparent", color: "var(--fg-muted)", cursor: isPending ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "var(--radius-md)", opacity: isPending ? 0.5 : 1 }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} style={{ padding: "13px 14px", fontSize: 14, fontWeight: 700, color: "var(--fg-primary)", borderTop: "2px solid var(--border-subtle)" }}>Total geral</td>
                <td style={{ padding: "13px 14px", fontSize: 15, fontWeight: 700, color: "var(--navy-700)", textAlign: "right" as const, borderTop: "2px solid var(--border-subtle)", fontVariantNumeric: "tabular-nums" }}>
                  {fmtBRL(totalGasto)}
                </td>
                <td colSpan={3} style={{ borderTop: "2px solid var(--border-subtle)" }} />
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
