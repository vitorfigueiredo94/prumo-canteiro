"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";
import { fmtBRL } from "@/lib/format";

interface OrcItem {
  id: string;
  categoria: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  valorUnit: number;
  ordem: number;
}

const CAT_ORDER = ["material", "mao_obra", "servicos", "equipamentos", "outros"];
const CAT_LABELS: Record<string, string> = {
  material:     "Material",
  mao_obra:     "Mão de obra",
  servicos:     "Serviços",
  equipamentos: "Equipamentos",
  outros:       "Outros",
};
const CAT_COLORS: Record<string, string> = {
  material:     "#1e3a5f",
  mao_obra:     "#b45309",
  servicos:     "#6d28d9",
  equipamentos: "#047857",
  outros:       "#6b7280",
};

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

export function OrcamentoTab({ obraId, realizado }: { obraId: string; realizado: number }) {
  const [itens, setItens] = useState<OrcItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editVal, setEditVal] = useState("");
  const [addingCat, setAddingCat] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ descricao: "", unidade: "un", quantidade: "1", valorUnit: "" });

  const load = useCallback(async () => {
    const r = await fetch(`/api/v1/obras/${obraId}/orcamento`);
    const d = await r.json();
    setItens(d.itens ?? []);
    setLoading(false);
  }, [obraId]);

  useEffect(() => { load(); }, [load]);

  const startEdit = (id: string, field: string, val: string) => {
    setEditingCell({ id, field });
    setEditVal(val);
  };

  const saveEdit = async (id: string, field: string, rawVal?: string) => {
    const val = rawVal ?? editVal;
    setEditingCell(null);
    if (!val.trim()) return;

    let parsed: string | number = val.trim();
    if (field === "quantidade" || field === "valorUnit") {
      parsed = parseFloat(val.replace(",", ".")) || 0;
    }

    setItens((prev) => prev.map((i) => i.id === id ? { ...i, [field]: parsed } : i));
    await fetch(`/api/v1/obras/${obraId}/orcamento/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: parsed }),
    });
  };

  const deleteItem = async (id: string) => {
    setItens((prev) => prev.filter((i) => i.id !== id));
    await fetch(`/api/v1/obras/${obraId}/orcamento/${id}`, { method: "DELETE" });
  };

  const addItem = async (categoria: string) => {
    if (!newItem.descricao.trim()) return;
    const qtd = parseFloat(newItem.quantidade.replace(",", ".")) || 1;
    const val = parseFloat(newItem.valorUnit.replace(",", ".")) || 0;

    const r = await fetch(`/api/v1/obras/${obraId}/orcamento`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoria, descricao: newItem.descricao.trim(), unidade: newItem.unidade, quantidade: qtd, valorUnit: val }),
    });
    const d = await r.json();
    setItens((prev) => [...prev, d.item]);
    setAddingCat(null);
    setNewItem({ descricao: "", unidade: "un", quantidade: "1", valorUnit: "" });
  };

  const total = itens.reduce((s, i) => s + i.quantidade * i.valorUnit, 0);
  const saldo = total - realizado;

  if (loading) return (
    <div style={{ textAlign: "center", padding: "60px 0", color: "var(--fg-tertiary)", fontSize: 15 }}>Carregando orçamento…</div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 14 }}>
        {[
          { label: "Orçado (previsto)", value: fmtBRL(total), color: "#1e3a5f" },
          { label: "Realizado (NFs + RH)", value: fmtBRL(realizado), color: "#b45309" },
          { label: saldo >= 0 ? "Saldo disponível" : "Estouro", value: fmtBRL(Math.abs(saldo)), color: saldo >= 0 ? "#16a34a" : "#dc2626" },
          { label: "Itens no orçamento", value: String(itens.length), color: "var(--fg-primary)" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "18px 22px" }}>
            <div style={{ fontSize: 11.5, color: "var(--fg-tertiary)", textTransform: "uppercase" as const, letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>{label}</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 400, color, letterSpacing: "-0.01em" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Dica se vazio */}
      {itens.length === 0 && (
        <div style={{ padding: "20px 22px", background: "var(--ink-50)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", fontSize: 14, color: "var(--fg-tertiary)", lineHeight: 1.6 }}>
          Nenhum item cadastrado ainda. Use o botão <strong>Adicionar</strong> em cada categoria para montar o orçamento detalhado da obra.
          <br />
          <span style={{ fontSize: 13 }}>Clique em qualquer célula para editar inline — pressione Enter para confirmar ou Esc para cancelar.</span>
        </div>
      )}

      {/* Tabela por categoria */}
      {CAT_ORDER.map((cat) => {
        const catItens = itens.filter((i) => i.categoria === cat);
        const catTotal = catItens.reduce((s, i) => s + i.quantidade * i.valorUnit, 0);
        const color = CAT_COLORS[cat];
        const isAdding = addingCat === cat;

        return (
          <div key={cat} style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
            {/* Header da categoria */}
            <div style={{ padding: "13px 20px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: 12, background: `${color}0a` }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
              <span style={{ fontWeight: 700, fontSize: 14.5, color: "var(--fg-primary)", flex: 1 }}>{CAT_LABELS[cat]}</span>
              {catTotal > 0 && (
                <span style={{ fontSize: 14, fontWeight: 700, color, fontVariantNumeric: "tabular-nums" }}>
                  {fmtBRL(catTotal)}
                </span>
              )}
              <button
                onClick={() => {
                  if (isAdding) { setAddingCat(null); return; }
                  setAddingCat(cat);
                  setNewItem({ descricao: "", unidade: "un", quantidade: "1", valorUnit: "" });
                }}
                style={{
                  height: 30, padding: "0 12px",
                  background: isAdding ? "transparent" : "#1e3a5f",
                  color: isAdding ? "var(--fg-secondary)" : "#fff",
                  border: isAdding ? "1px solid var(--border-default)" : "none",
                  borderRadius: "var(--radius-md)", fontFamily: "var(--font-sans)", fontSize: 13,
                  fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5,
                }}
              >
                {isAdding ? "Cancelar" : <><Plus size={13} /> Adicionar</>}
              </button>
            </div>

            {/* Tabela de itens */}
            {catItens.length > 0 && (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Descrição", "Unid.", "Qtde", "Valor unit.", "Total", ""].map((h, i) => (
                      <th key={i} style={{
                        padding: "9px 14px", fontSize: 11, fontWeight: 700,
                        color: "var(--fg-muted)", textTransform: "uppercase" as const,
                        letterSpacing: "0.07em", background: "var(--ink-50)",
                        borderBottom: "1px solid var(--border-subtle)",
                        textAlign: (i >= 2 && i <= 4) ? "right" as const : "left" as const,
                        whiteSpace: "nowrap" as const,
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {catItens.map((item) => {
                    const isEditDescricao  = editingCell?.id === item.id && editingCell.field === "descricao";
                    const isEditUnidade    = editingCell?.id === item.id && editingCell.field === "unidade";
                    const isEditQuantidade = editingCell?.id === item.id && editingCell.field === "quantidade";
                    const isEditValorUnit  = editingCell?.id === item.id && editingCell.field === "valorUnit";

                    return (
                      <tr key={item.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>

                        {/* Descrição */}
                        <td style={{ padding: "10px 14px", fontSize: 14, color: "var(--fg-primary)", cursor: "pointer", minWidth: 200 }}
                          onClick={() => { if (!editingCell) startEdit(item.id, "descricao", item.descricao); }}
                        >
                          {isEditDescricao ? (
                            <input autoFocus value={editVal}
                              onChange={(e) => setEditVal(e.target.value)}
                              onBlur={() => saveEdit(item.id, "descricao")}
                              onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") setEditingCell(null); }}
                              style={{ ...inpEdit, width: "100%" }}
                            />
                          ) : (
                            <span title="Clique para editar" style={{ borderBottom: "1px dashed var(--border-default)", display: "inline-block", lineHeight: 1.5 }}>{item.descricao}</span>
                          )}
                        </td>

                        {/* Unidade */}
                        <td style={{ padding: "10px 14px", fontSize: 13, color: "var(--fg-secondary)", cursor: "pointer", minWidth: 80 }}
                          onClick={() => { if (!editingCell) startEdit(item.id, "unidade", item.unidade); }}
                        >
                          {isEditUnidade ? (
                            <select autoFocus value={editVal}
                              onChange={(e) => { const v = e.target.value; setEditVal(v); saveEdit(item.id, "unidade", v); }}
                              onBlur={() => setEditingCell(null)}
                              style={{ ...inpEdit, paddingLeft: 6 }}
                            >
                              {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
                            </select>
                          ) : (
                            <span title="Clique para editar" style={{ borderBottom: "1px dashed var(--border-default)", display: "inline-block" }}>{item.unidade}</span>
                          )}
                        </td>

                        {/* Quantidade */}
                        <td style={{ padding: "10px 14px", fontSize: 13, color: "var(--fg-secondary)", textAlign: "right", cursor: "pointer", fontVariantNumeric: "tabular-nums", minWidth: 80 }}
                          onClick={() => { if (!editingCell) startEdit(item.id, "quantidade", String(item.quantidade)); }}
                        >
                          {isEditQuantidade ? (
                            <input autoFocus value={editVal} type="number" min="0" step="0.01"
                              onChange={(e) => setEditVal(e.target.value)}
                              onBlur={() => saveEdit(item.id, "quantidade")}
                              onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") setEditingCell(null); }}
                              style={{ ...inpEdit, width: 80, textAlign: "right" }}
                            />
                          ) : (
                            <span title="Clique para editar" style={{ borderBottom: "1px dashed var(--border-default)", display: "inline-block" }}>
                              {item.quantidade % 1 === 0 ? item.quantidade.toFixed(0) : item.quantidade.toFixed(2)}
                            </span>
                          )}
                        </td>

                        {/* Valor unitário */}
                        <td style={{ padding: "10px 14px", fontSize: 13, color: "var(--fg-secondary)", textAlign: "right", cursor: "pointer", fontVariantNumeric: "tabular-nums", minWidth: 120 }}
                          onClick={() => { if (!editingCell) startEdit(item.id, "valorUnit", String(item.valorUnit)); }}
                        >
                          {isEditValorUnit ? (
                            <input autoFocus value={editVal} type="number" min="0" step="0.01"
                              onChange={(e) => setEditVal(e.target.value)}
                              onBlur={() => saveEdit(item.id, "valorUnit")}
                              onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") setEditingCell(null); }}
                              style={{ ...inpEdit, width: 100, textAlign: "right" }}
                            />
                          ) : (
                            <span title="Clique para editar" style={{ borderBottom: "1px dashed var(--border-default)", display: "inline-block" }}>{fmtBRL(item.valorUnit)}</span>
                          )}
                        </td>

                        {/* Total */}
                        <td style={{ padding: "10px 14px", fontSize: 14, fontWeight: 700, color: "var(--fg-primary)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                          {fmtBRL(item.quantidade * item.valorUnit)}
                        </td>

                        {/* Excluir */}
                        <td style={{ padding: "10px 14px", textAlign: "center", width: 40 }}>
                          <button
                            onClick={() => deleteItem(item.id)}
                            style={{ width: 28, height: 28, border: "none", background: "transparent", color: "var(--fg-muted)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "var(--radius-md)" }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#dc2626"; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--fg-muted)"; }}
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
                    <td colSpan={4} style={{ padding: "10px 14px", fontWeight: 700, fontSize: 13, color: "var(--fg-secondary)", borderTop: "2px solid var(--border-subtle)" }}>
                      Subtotal {CAT_LABELS[cat]}
                    </td>
                    <td style={{ padding: "10px 14px", fontWeight: 700, fontSize: 14, color, textAlign: "right", borderTop: "2px solid var(--border-subtle)", fontVariantNumeric: "tabular-nums" }}>
                      {fmtBRL(catTotal)}
                    </td>
                    <td style={{ borderTop: "2px solid var(--border-subtle)" }} />
                  </tr>
                </tfoot>
              </table>
            )}

            {/* Vazio + sem form */}
            {catItens.length === 0 && !isAdding && (
              <div style={{ padding: "16px 20px", fontSize: 13.5, color: "var(--fg-muted)", textAlign: "center" }}>
                Nenhum item nesta categoria.{" "}
                <button
                  onClick={() => { setAddingCat(cat); setNewItem({ descricao: "", unidade: "un", quantidade: "1", valorUnit: "" }); }}
                  style={{ border: "none", background: "none", color: "var(--navy-700)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 13.5, fontWeight: 600, padding: 0 }}
                >
                  Adicionar primeiro item
                </button>
              </div>
            )}

            {/* Form de adição */}
            {isAdding && (
              <div style={{ padding: "14px 20px", background: "var(--ink-50)", borderTop: catItens.length > 0 ? "1px solid var(--border-subtle)" : "none", display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" as const }}>
                <div style={{ flex: 2, minWidth: 160, display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--fg-muted)", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Descrição *</label>
                  <input
                    autoFocus
                    value={newItem.descricao}
                    onChange={(e) => setNewItem((p) => ({ ...p, descricao: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter") addItem(cat); }}
                    placeholder={`Ex: ${cat === "material" ? "Cimento CP-32" : cat === "mao_obra" ? "Pedreiro" : cat === "servicos" ? "Fundação" : cat === "equipamentos" ? "Betoneira" : "Item"}`}
                    style={inp}
                  />
                </div>
                <div style={{ minWidth: 90, display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--fg-muted)", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Unidade</label>
                  <select value={newItem.unidade} onChange={(e) => setNewItem((p) => ({ ...p, unidade: e.target.value }))} style={inp}>
                    {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div style={{ minWidth: 90, display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--fg-muted)", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Qtde</label>
                  <input
                    value={newItem.quantidade}
                    onChange={(e) => setNewItem((p) => ({ ...p, quantidade: e.target.value }))}
                    type="number" min="0" step="0.01"
                    style={inp}
                  />
                </div>
                <div style={{ minWidth: 120, display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--fg-muted)", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Valor unit. (R$)</label>
                  <input
                    value={newItem.valorUnit}
                    onChange={(e) => setNewItem((p) => ({ ...p, valorUnit: e.target.value }))}
                    type="number" min="0" step="0.01"
                    placeholder="0,00"
                    style={inp}
                  />
                </div>
                <button
                  onClick={() => addItem(cat)}
                  disabled={!newItem.descricao.trim()}
                  style={{ height: 36, padding: "0 20px", background: "#1e3a5f", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600, cursor: !newItem.descricao.trim() ? "not-allowed" : "pointer", opacity: !newItem.descricao.trim() ? 0.5 : 1 }}
                >
                  Salvar
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* Total geral */}
      {itens.length > 0 && (
        <div style={{ background: "var(--bg-surface)", border: "2px solid var(--navy-700)", borderRadius: "var(--radius-lg)", padding: "16px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: "var(--fg-primary)" }}>
            Total do orçamento — {itens.length} {itens.length === 1 ? "item" : "itens"}
          </span>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 500, color: "#1e3a5f", fontVariantNumeric: "tabular-nums" }}>
            {fmtBRL(total)}
          </span>
        </div>
      )}
    </div>
  );
}
