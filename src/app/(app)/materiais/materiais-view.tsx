"use client";

import { useEffect, useState, useMemo } from "react";
import { Package, TrendingUp, ShoppingCart, Building2 } from "lucide-react";

interface Material {
  id: string;
  obraId: string;
  nome: string;
  quantidade: number;
  unidade: string;
  valorUnit: number;
  fornecedor: string | null;
  data: string | null;
  obs: string | null;
  criadoEm: string;
}

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtData(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

const KPI = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "18px 22px" }}>
    <div style={{ fontSize: 11.5, color: "var(--fg-tertiary)", textTransform: "uppercase" as const, letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>{label}</div>
    <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 400, color: "var(--fg-primary)", letterSpacing: "-0.01em" }}>{value}</div>
    {sub && <div style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 4 }}>{sub}</div>}
  </div>
);

export function MateriaisView({ obraNames }: { obraNames: Record<string, string> }) {
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filtroObra, setFiltroObra] = useState("todas");
  const [filtroNome, setFiltroNome] = useState("");

  useEffect(() => {
    fetch("/api/v1/materiais")
      .then((r) => r.json())
      .then((d) => { setMateriais(d.materiais ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const obraIds = useMemo(() => [...new Set(materiais.map((m) => m.obraId))], [materiais]);

  const filtrados = useMemo(() => materiais.filter((m) => {
    if (filtroObra !== "todas" && m.obraId !== filtroObra) return false;
    if (filtroNome && !m.nome.toLowerCase().includes(filtroNome.toLowerCase())) return false;
    return true;
  }), [materiais, filtroObra, filtroNome]);

  // KPIs globais
  const totalGasto = materiais.reduce((s, m) => s + m.quantidade * m.valorUnit, 0);
  const totalItens = materiais.length;

  // Ranking de insumos (top 5 por valor total)
  const rankingInsumos = useMemo(() => {
    const map = new Map<string, number>();
    materiais.forEach((m) => {
      map.set(m.nome, (map.get(m.nome) ?? 0) + m.quantidade * m.valorUnit);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [materiais]);

  // Ranking de fornecedores
  const rankingFornecedores = useMemo(() => {
    const map = new Map<string, number>();
    materiais.forEach((m) => {
      const f = m.fornecedor ?? "Não informado";
      map.set(f, (map.get(f) ?? 0) + m.quantidade * m.valorUnit);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [materiais]);

  // Gasto por obra
  const gastoPorObra = useMemo(() => {
    const map = new Map<string, number>();
    materiais.forEach((m) => {
      map.set(m.obraId, (map.get(m.obraId) ?? 0) + m.quantidade * m.valorUnit);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [materiais]);

  const inp: React.CSSProperties = {
    height: 36, padding: "0 10px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)",
    background: "var(--bg-surface)", color: "var(--fg-primary)", fontFamily: "var(--font-sans)", fontSize: 13.5, outline: "none",
  };

  if (loading) return (
    <div style={{ textAlign: "center", padding: "60px 0", color: "var(--fg-tertiary)", fontSize: 15 }}>Carregando materiais…</div>
  );

  const maxGastoObra = gastoPorObra[0]?.[1] ?? 1;
  const maxRanking   = rankingInsumos[0]?.[1] ?? 1;

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "32px 24px", display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Header */}
      <div>
        <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 500, color: "var(--fg-primary)", letterSpacing: "-0.015em", display: "flex", alignItems: "center", gap: 10 }}>
          <Package size={26} style={{ color: "var(--navy-700)" }} /> Materiais
        </h1>
        <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--fg-tertiary)" }}>
          Visão consolidada de todos os insumos utilizados nas obras.
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: 14 }}>
        <KPI label="Total gasto"   value={fmtBRL(totalGasto)} />
        <KPI label="Itens lançados" value={String(totalItens)} />
        <KPI label="Obras com material" value={String(obraIds.length)} />
        <KPI label="Item mais caro" value={rankingInsumos[0]?.[0] ?? "—"} sub={rankingInsumos[0] ? fmtBRL(rankingInsumos[0][1]) : undefined} />
      </div>

      {/* Gráficos de ranking */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

        {/* Ranking insumos */}
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "20px 22px" }}>
          <p style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: "var(--fg-primary)", display: "flex", alignItems: "center", gap: 7 }}>
            <TrendingUp size={15} style={{ color: "var(--navy-700)" }} /> Top insumos por valor
          </p>
          {rankingInsumos.length === 0 ? (
            <p style={{ color: "var(--fg-muted)", fontSize: 13 }}>Nenhum dado.</p>
          ) : rankingInsumos.map(([nome, val]) => (
            <div key={nome} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                <span style={{ color: "var(--fg-primary)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, maxWidth: "60%" }}>{nome}</span>
                <span style={{ color: "var(--fg-secondary)", fontVariantNumeric: "tabular-nums" }}>{fmtBRL(val)}</span>
              </div>
              <div style={{ height: 6, borderRadius: 99, background: "var(--ink-100)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(val / maxRanking) * 100}%`, background: "var(--navy-700)", borderRadius: 99 }} />
              </div>
            </div>
          ))}
        </div>

        {/* Ranking fornecedores */}
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "20px 22px" }}>
          <p style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: "var(--fg-primary)", display: "flex", alignItems: "center", gap: 7 }}>
            <ShoppingCart size={15} style={{ color: "var(--navy-700)" }} /> Top fornecedores
          </p>
          {rankingFornecedores.length === 0 ? (
            <p style={{ color: "var(--fg-muted)", fontSize: 13 }}>Nenhum dado.</p>
          ) : rankingFornecedores.map(([nome, val]) => (
            <div key={nome} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                <span style={{ color: "var(--fg-primary)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, maxWidth: "60%" }}>{nome}</span>
                <span style={{ color: "var(--fg-secondary)", fontVariantNumeric: "tabular-nums" }}>{fmtBRL(val)}</span>
              </div>
              <div style={{ height: 6, borderRadius: 99, background: "var(--ink-100)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(val / maxRanking) * 100}%`, background: "#b45309", borderRadius: 99 }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gasto por obra */}
      {gastoPorObra.length > 0 && (
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "20px 22px" }}>
          <p style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: "var(--fg-primary)", display: "flex", alignItems: "center", gap: 7 }}>
            <Building2 size={15} style={{ color: "var(--navy-700)" }} /> Gasto por obra
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {gastoPorObra.map(([obraId, val]) => (
              <div key={obraId}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: "var(--fg-primary)", fontWeight: 500 }}>{obraNames[obraId] ?? obraId.slice(0, 8) + "…"}</span>
                  <span style={{ color: "var(--fg-secondary)", fontVariantNumeric: "tabular-nums" }}>{fmtBRL(val)}</span>
                </div>
                <div style={{ height: 8, borderRadius: 99, background: "var(--ink-100)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(val / maxGastoObra) * 100}%`, background: "var(--navy-700)", borderRadius: 99, transition: "width 600ms" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabela de todos os materiais */}
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)", display: "flex", gap: 10, flexWrap: "wrap" as const, alignItems: "center" }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--fg-primary)", flex: 1 }}>Todos os lançamentos</p>
          <input value={filtroNome} onChange={(e) => setFiltroNome(e.target.value)} placeholder="Buscar material…" style={{ ...inp, width: 180 }} />
          <select value={filtroObra} onChange={(e) => setFiltroObra(e.target.value)} style={{ ...inp, width: 180 }}>
            <option value="todas">Todas as obras</option>
            {obraIds.map((id) => (
              <option key={id} value={id}>{obraNames[id] ?? id.slice(0, 12)}</option>
            ))}
          </select>
        </div>

        {filtrados.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--fg-tertiary)", fontSize: 14 }}>Nenhum material encontrado.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Obra", "Material", "Qtde", "Valor unit.", "Total", "Fornecedor", "Data"].map((h, i) => (
                  <th key={i} style={{ padding: "10px 14px", fontSize: 11.5, fontWeight: 700, color: "var(--fg-tertiary)", textTransform: "uppercase" as const, letterSpacing: "0.06em", background: "var(--ink-50)", borderBottom: "1px solid var(--border-subtle)", textAlign: i >= 2 && i <= 4 ? "right" as const : "left" as const, whiteSpace: "nowrap" as const }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((m, i) => {
                const total = m.quantidade * m.valorUnit;
                return (
                  <tr key={m.id} style={{ background: i % 2 === 0 ? "transparent" : "var(--ink-50)" }}>
                    <td style={{ padding: "11px 14px", fontSize: 13, color: "var(--fg-secondary)", borderBottom: "1px solid var(--border-subtle)", whiteSpace: "nowrap" as const }}>
                      {obraNames[m.obraId] ?? "—"}
                    </td>
                    <td style={{ padding: "11px 14px", fontSize: 14, fontWeight: 600, color: "var(--fg-primary)", borderBottom: "1px solid var(--border-subtle)" }}>
                      {m.nome}
                      {m.obs && <div style={{ fontSize: 11.5, color: "var(--fg-muted)", fontWeight: 400 }}>{m.obs}</div>}
                    </td>
                    <td style={{ padding: "11px 14px", fontSize: 13, color: "var(--fg-secondary)", textAlign: "right" as const, borderBottom: "1px solid var(--border-subtle)", whiteSpace: "nowrap" as const }}>
                      {m.quantidade % 1 === 0 ? m.quantidade.toFixed(0) : m.quantidade.toFixed(2)} {m.unidade}
                    </td>
                    <td style={{ padding: "11px 14px", fontSize: 13, color: "var(--fg-secondary)", textAlign: "right" as const, borderBottom: "1px solid var(--border-subtle)", fontVariantNumeric: "tabular-nums" }}>
                      {fmtBRL(m.valorUnit)}
                    </td>
                    <td style={{ padding: "11px 14px", fontSize: 14, fontWeight: 700, color: "var(--fg-primary)", textAlign: "right" as const, borderBottom: "1px solid var(--border-subtle)", fontVariantNumeric: "tabular-nums" }}>
                      {fmtBRL(total)}
                    </td>
                    <td style={{ padding: "11px 14px", fontSize: 13, color: "var(--fg-tertiary)", borderBottom: "1px solid var(--border-subtle)" }}>
                      {m.fornecedor ?? "—"}
                    </td>
                    <td style={{ padding: "11px 14px", fontSize: 13, color: "var(--fg-tertiary)", borderBottom: "1px solid var(--border-subtle)", whiteSpace: "nowrap" as const }}>
                      {fmtData(m.data)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} style={{ padding: "13px 14px", fontWeight: 700, fontSize: 14, color: "var(--fg-primary)", borderTop: "2px solid var(--border-subtle)" }}>
                  Total ({filtrados.length} itens)
                </td>
                <td style={{ padding: "13px 14px", fontWeight: 700, fontSize: 15, color: "var(--navy-700)", textAlign: "right" as const, borderTop: "2px solid var(--border-subtle)", fontVariantNumeric: "tabular-nums" }}>
                  {fmtBRL(filtrados.reduce((s, m) => s + m.quantidade * m.valorUnit, 0))}
                </td>
                <td colSpan={2} style={{ borderTop: "2px solid var(--border-subtle)" }} />
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
