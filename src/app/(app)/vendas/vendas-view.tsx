"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Plus, MapPin, User, ChevronRight, Search } from "lucide-react";
import { VendaForm } from "./venda-form";
import { criarVenda } from "./actions";
import { fmtBRL, fmtDate } from "@/lib/format";

interface ParcelaLite { id: string; status: string; valor: number; }
interface TerrenoLite { id: string; nome: string; cidade: string; }
interface Venda {
  id: string; nomeComprador: string; valorTotal: number; entrada: number;
  numeroParcelas: number; dataContrato: string | null;
  terreno: TerrenoLite;
  parcelas: ParcelaLite[];
}

export function VendasView({ vendas, terrenos }: { vendas: Venda[]; terrenos: TerrenoLite[] }) {
  const [busca, setBusca] = useState("");
  const [showNew, setShowNew] = useState(false);
  const closeNew = useCallback(() => setShowNew(false), []);

  const filtered = vendas.filter((v) =>
    !busca.trim() || v.nomeComprador.toLowerCase().includes(busca.toLowerCase()) || v.terreno.nome.toLowerCase().includes(busca.toLowerCase())
  );

  const totalRecebido = vendas.reduce((s, v) => {
    const pago = v.parcelas.filter((p) => p.status === "paga").reduce((a, p) => a + p.valor, 0) + v.entrada;
    return s + pago;
  }, 0);

  return (
    <>
      <div style={{ padding: "22px 32px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-surface)" }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 500, color: "var(--fg-primary)", letterSpacing: "-0.015em" }}>Vendas</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--fg-tertiary)" }}>
            {vendas.length} {vendas.length === 1 ? "venda" : "vendas"} · Recebido: <strong style={{ color: "var(--fg-secondary)" }}>{fmtBRL(totalRecebido)}</strong>
          </p>
        </div>
        <button onClick={() => setShowNew(true)} style={{ height: 40, padding: "0 16px", background: "var(--navy-700)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 }}>
          <Plus size={16} /> Registrar venda
        </button>
      </div>

      <div style={{ padding: "12px 32px", background: "var(--bg-surface)", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "flex-end" }}>
        <div style={{ position: "relative" }}>
          <Search size={15} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--fg-muted)", pointerEvents: "none" }} />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar venda…" style={{ height: 38, padding: "0 12px 0 34px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-surface)", color: "var(--fg-primary)", fontFamily: "var(--font-sans)", fontSize: 14, width: 260, outline: "none" }} onFocus={(e) => { e.target.style.borderColor = "var(--border-focus)"; e.target.style.boxShadow = "var(--shadow-focus)"; }} onBlur={(e) => { e.target.style.borderColor = "var(--border-default)"; e.target.style.boxShadow = "none"; }} />
        </div>
      </div>

      <div style={{ padding: "24px 32px" }}>
        {filtered.length === 0 ? (
          <p style={{ textAlign: "center", padding: "60px 0", color: "var(--fg-tertiary)", fontSize: 15 }}>Nenhuma venda encontrada.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 18 }}>
            {filtered.map((v) => {
              const pagas = v.parcelas.filter((p) => p.status === "paga").length;
              const totalParcelas = v.numeroParcelas;
              const recebido = v.parcelas.filter((p) => p.status === "paga").reduce((s, p) => s + p.valor, 0) + v.entrada;
              const pct = v.valorTotal > 0 ? Math.round((recebido / v.valorTotal) * 100) : 0;

              return (
                <Link key={v.id} href={`/vendas/${v.id}`} style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-xs)", overflow: "hidden", display: "flex", flexDirection: "column", textDecoration: "none" }}>
                  <div style={{ padding: "18px 20px", flex: 1 }}>
                    <div style={{ marginBottom: 10 }}>
                      <h3 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 500, color: "var(--fg-primary)" }}>{v.nomeComprador}</h3>
                      <div style={{ display: "flex", gap: 12, marginTop: 4, fontSize: 13, color: "var(--fg-tertiary)" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={12} />{v.terreno.nome}</span>
                        {v.dataContrato && <span style={{ display: "flex", alignItems: "center", gap: 4 }}>{fmtDate(v.dataContrato)}</span>}
                      </div>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--fg-tertiary)", marginBottom: 5 }}>
                        <span>Recebido: {fmtBRL(recebido)}</span>
                        <span>{pct}%</span>
                      </div>
                      <div style={{ height: 8, borderRadius: "var(--radius-full)", background: "var(--ink-100)", overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: pct >= 100 ? "var(--success-500)" : "var(--navy-700)", borderRadius: "var(--radius-full)", transition: "width 600ms" }} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--fg-tertiary)", marginTop: 4 }}>
                        <span>Total: {fmtBRL(v.valorTotal)}</span>
                        <span>{pagas}/{totalParcelas} parcelas</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: "10px 20px", borderTop: "1px solid var(--border-subtle)", background: "var(--ink-50)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, color: "var(--navy-700)", fontWeight: 600 }}>Ver extrato</span>
                    <ChevronRight size={15} style={{ color: "var(--fg-muted)" }} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {showNew && <VendaForm action={criarVenda} terrenos={terrenos} onClose={closeNew} />}
    </>
  );
}
