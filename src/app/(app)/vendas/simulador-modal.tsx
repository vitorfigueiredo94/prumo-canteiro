"use client";
import { useState } from "react";
import { X, Calculator } from "lucide-react";
import { fmtBRL } from "@/lib/format";

export function SimuladorModal({ onClose }: { onClose: () => void }) {
  const nextMonth = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };

  const [valorTotal, setValorTotal] = useState("");
  const [entrada, setEntrada] = useState("");
  const [numParcelas, setNumParcelas] = useState("12");
  const [diaVenc, setDiaVenc] = useState("10");
  const [mesPrimeira, setMesPrimeira] = useState(nextMonth);

  const vt = parseFloat(valorTotal.replace(",", ".")) || 0;
  const ent = parseFloat(entrada.replace(",", ".")) || 0;
  const np = Math.max(1, parseInt(numParcelas) || 1);
  const dv = Math.min(28, Math.max(1, parseInt(diaVenc) || 10));
  const saldo = Math.max(0, vt - ent);
  const valorParcela = np > 0 ? saldo / np : 0;

  const [y, mo] = mesPrimeira.split("-").map(Number);
  const previewCount = Math.min(np, 8);
  const parcelas = Array.from({ length: previewCount }, (_, i) => {
    const d = new Date(y, mo - 1 + i, dv);
    return { num: i + 1, data: d, valor: valorParcela };
  });

  const fs: React.CSSProperties = {
    height: 40, padding: "0 12px", border: "1px solid var(--border-default)",
    borderRadius: "var(--radius-md)", background: "var(--bg-surface)",
    color: "var(--fg-primary)", fontFamily: "var(--font-sans)", fontSize: 14.5, width: "100%", outline: "none",
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.45)" }} onClick={onClose}>
      <div style={{ background: "var(--bg-surface)", borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-xl)", width: "100%", maxWidth: 560, maxHeight: "92vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Calculator size={18} style={{ color: "var(--navy-700)" }} />
            <h2 style={{ margin: 0, fontSize: 18, fontFamily: "var(--font-display)", fontWeight: 500, color: "var(--fg-primary)" }}>Simulador de parcelas</h2>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "var(--radius-md)", color: "var(--fg-muted)" }}><X size={18} /></button>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-secondary)" }}>Valor total (R$)</span>
              <input value={valorTotal} onChange={(e) => setValorTotal(e.target.value)} type="number" min="0" step="0.01" placeholder="250000" style={fs} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-secondary)" }}>Entrada (R$)</span>
              <input value={entrada} onChange={(e) => setEntrada(e.target.value)} type="number" min="0" step="0.01" placeholder="0" style={fs} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-secondary)" }}>Nº de parcelas</span>
              <input value={numParcelas} onChange={(e) => setNumParcelas(e.target.value)} type="number" min="1" max="360" style={fs} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-secondary)" }}>Dia vencimento</span>
              <input value={diaVenc} onChange={(e) => setDiaVenc(e.target.value)} type="number" min="1" max="28" style={fs} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-secondary)" }}>Mês da 1ª parcela</span>
              <input value={mesPrimeira} onChange={(e) => setMesPrimeira(e.target.value)} type="month" style={fs} />
            </div>
          </div>

          {vt > 0 ? (
            <div style={{ background: "var(--ink-50)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "16px 20px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid var(--border-subtle)" }}>
                {[
                  { label: "Entrada", value: fmtBRL(ent) },
                  { label: `${np}× parcelas de`, value: fmtBRL(valorParcela) },
                  { label: "Total do contrato", value: fmtBRL(vt) },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div style={{ fontSize: 11, color: "var(--fg-tertiary)", textTransform: "uppercase" as const, letterSpacing: "0.06em", fontWeight: 600, marginBottom: 4 }}>{label}</div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 400, color: "var(--fg-primary)" }}>{value}</div>
                  </div>
                ))}
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    {["Parcela", "Vencimento", "Valor"].map((h) => (
                      <th key={h} style={{ textAlign: "left", padding: "6px 0", fontSize: 11, fontWeight: 700, color: "var(--fg-tertiary)", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parcelas.map((p) => (
                    <tr key={p.num} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td style={{ padding: "8px 0", fontWeight: 600, color: "var(--fg-secondary)" }}>#{String(p.num).padStart(2, "0")}</td>
                      <td style={{ padding: "8px 0", color: "var(--fg-primary)" }}>{p.data.toLocaleDateString("pt-BR")}</td>
                      <td style={{ padding: "8px 0", fontWeight: 600, color: "var(--navy-700)", fontVariantNumeric: "tabular-nums" }}>{fmtBRL(p.valor)}</td>
                    </tr>
                  ))}
                  {np > 8 && (
                    <tr>
                      <td colSpan={3} style={{ padding: "8px 0", fontSize: 12, color: "var(--fg-muted)", fontStyle: "italic" }}>… e mais {np - 8} parcelas até a última</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "28px 0", color: "var(--fg-tertiary)", fontSize: 14 }}>
              Preencha o valor total para simular as parcelas.
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 4 }}>
            <button onClick={onClose} style={{ height: 38, padding: "0 20px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "transparent", color: "var(--fg-secondary)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 14 }}>
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
