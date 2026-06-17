"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Phone, Mail, CreditCard, MapPin, TrendingUp, AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react";
import { fmtBRL, fmtBRLshort, fmtDate } from "@/lib/format";

interface Parcela { status: string; vencimento: string | null; pagoEm: string | null; valor: number; }
interface Comprador {
  id: string;
  nomeComprador: string;
  cpfCnpjComprador: string | null;
  telefoneComprador: string | null;
  emailComprador: string | null;
  valorTotal: number;
  dataContrato: string | null;
  terreno: { id: string; nome: string; cidade: string };
  parcelas: Parcela[];
}

const AV_COLORS = ["#1e3a5f","#b45309","#6d28d9","#047857","#b91c1c","#0369a1"];
function avatarBg(name: string) {
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return AV_COLORS[h % AV_COLORS.length];
}
function avatarInitials(name: string) {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase();
}

function calcScore(parcelas: Parcela[]) {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const vencidas   = parcelas.filter(p => p.vencimento && new Date(p.vencimento) <= hoje);
  const pagas      = parcelas.filter(p => p.status === "paga");
  const noPrazo    = pagas.filter(p => p.pagoEm && p.vencimento && new Date(p.pagoEm) <= new Date(p.vencimento));
  const emAtraso   = vencidas.filter(p => p.status !== "paga");
  const totalPago  = pagas.reduce((s, p) => s + p.valor, 0);
  if (vencidas.length === 0) return { score: null, emAtraso: emAtraso.length, totalPago, pagas: pagas.length, total: parcelas.length };
  const score = Math.max(0, Math.round((noPrazo.length / vencidas.length) * 100) - emAtraso.length * 8);
  return { score, emAtraso: emAtraso.length, totalPago, pagas: pagas.length, total: parcelas.length };
}

function ScoreBadge({ score, emAtraso }: { score: number | null; emAtraso: number }) {
  if (emAtraso > 0) return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 99, background: "#fee2e2", color: "#dc2626", fontSize: 11.5, fontWeight: 700 }}>
      <AlertTriangle size={11} /> Em atraso
    </span>
  );
  if (score === null) return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 99, background: "var(--ink-100)", color: "var(--fg-muted)", fontSize: 11.5, fontWeight: 600 }}>
      Sem histórico
    </span>
  );
  const color = score >= 85 ? "#16a34a" : score >= 70 ? "#d97706" : score >= 50 ? "#ea580c" : "#dc2626";
  const bg    = score >= 85 ? "#dcfce7" : score >= 70 ? "#fef3c7" : score >= 50 ? "#ffedd5" : "#fee2e2";
  const label = score >= 85 ? "Excelente" : score >= 70 ? "Bom" : score >= 50 ? "Regular" : "Crítico";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 99, background: bg, color, fontSize: 11.5, fontWeight: 700 }}>
      <CheckCircle2 size={11} /> {label} · {score}
    </span>
  );
}

export function CompradoresView({ compradores }: { compradores: Comprador[] }) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "adimplente" | "atraso">("todos");

  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);

  const lista = compradores
    .map(c => ({ ...c, fin: calcScore(c.parcelas) }))
    .filter(c => {
      if (filtro === "atraso") return c.fin.emAtraso > 0;
      if (filtro === "adimplente") return c.fin.emAtraso === 0;
      return true;
    })
    .filter(c =>
      !busca.trim() ||
      c.nomeComprador.toLowerCase().includes(busca.toLowerCase()) ||
      (c.cpfCnpjComprador ?? "").includes(busca) ||
      (c.telefoneComprador ?? "").includes(busca) ||
      (c.emailComprador ?? "").toLowerCase().includes(busca.toLowerCase())
    );

  const totalAtraso = compradores.filter(c => calcScore(c.parcelas).emAtraso > 0).length;
  const totalRecebido = compradores.reduce((s, c) => s + calcScore(c.parcelas).totalPago, 0);

  const FILTROS = [
    { k: "todos" as const, l: "Todos" },
    { k: "adimplente" as const, l: "Adimplentes" },
    { k: "atraso" as const, l: `Em atraso (${totalAtraso})` },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ padding: "22px 32px", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-surface)" }}>
        <h1 style={{ margin: "0 0 4px", fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 500, color: "var(--fg-primary)", letterSpacing: "-0.015em" }}>
          Compradores
        </h1>
        <p style={{ margin: 0, fontSize: 14, color: "var(--fg-tertiary)" }}>{compradores.length} {compradores.length === 1 ? "contrato" : "contratos"}</p>
      </div>

      <div style={{ padding: "24px 32px" }}>
        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 24 }}>
          {[
            { l: "Total compradores", v: compradores.length.toString(), sub: "contratos ativos" },
            { l: "Total recebido", v: fmtBRLshort(totalRecebido), sub: "soma de todos os contratos" },
            { l: "Em atraso", v: totalAtraso.toString(), sub: totalAtraso ? "requer cobrança" : "tudo em dia", danger: totalAtraso > 0 },
            { l: "Adimplentes", v: (compradores.length - totalAtraso).toString(), sub: "pagando em dia" },
          ].map(k => (
            <div key={k.l} style={{ background: "var(--bg-surface)", border: `1px solid ${k.danger ? "rgba(220,38,38,0.2)" : "var(--border-subtle)"}`, borderRadius: "var(--radius-lg)", padding: "16px 20px" }}>
              <div style={{ fontSize: 11.5, color: "var(--fg-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>{k.l}</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 400, color: k.danger ? "#dc2626" : "var(--fg-primary)", letterSpacing: "-0.02em", marginTop: 4 }}>{k.v}</div>
              <div style={{ fontSize: 12, color: "var(--fg-tertiary)", marginTop: 2 }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Filtros + busca */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 8 }}>
            {FILTROS.map(f => {
              const on = filtro === f.k;
              return (
                <button key={f.k} onClick={() => setFiltro(f.k)} style={{ padding: "7px 14px", borderRadius: 99, fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)", border: `1px solid ${on ? "var(--navy-600)" : "var(--border-default)"}`, background: on ? "var(--navy-700)" : "var(--bg-surface)", color: on ? "#fff" : "var(--fg-secondary)" }}>
                  {f.l}
                </button>
              );
            })}
          </div>
          <div style={{ position: "relative" }}>
            <Search size={15} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--fg-muted)", pointerEvents: "none" }} />
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Nome, CPF, telefone…" style={{ height: 38, padding: "0 12px 0 34px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-surface)", color: "var(--fg-primary)", fontFamily: "var(--font-sans)", fontSize: 14, width: 240, outline: "none" }} onFocus={e => { e.target.style.borderColor = "var(--border-focus)"; }} onBlur={e => { e.target.style.borderColor = "var(--border-default)"; }} />
          </div>
        </div>

        {/* Lista */}
        {lista.length === 0 ? (
          <p style={{ textAlign: "center", padding: "60px 0", color: "var(--fg-tertiary)", fontSize: 15 }}>Nenhum comprador encontrado.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {lista.map(c => {
              const pct = c.valorTotal > 0 ? Math.min(Math.round((c.fin.totalPago / c.valorTotal) * 100), 100) : 0;
              return (
                <Link key={c.id} href={`/vendas/${c.id}`} style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, textDecoration: "none", transition: "box-shadow 140ms, border-color 140ms" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-md)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--border-default)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; (e.currentTarget as HTMLElement).style.borderColor = "var(--border-subtle)"; }}
                >
                  {/* Avatar */}
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: avatarBg(c.nomeComprador), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, flexShrink: 0 }}>
                    {avatarInitials(c.nomeComprador)}
                  </div>

                  {/* Info principal */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
                      <span style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 500, color: "var(--fg-primary)" }}>{c.nomeComprador}</span>
                      <ScoreBadge score={c.fin.score} emAtraso={c.fin.emAtraso} />
                    </div>
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12.5, color: "var(--fg-tertiary)" }}>
                      {c.cpfCnpjComprador && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><CreditCard size={11} />{c.cpfCnpjComprador}</span>}
                      {c.telefoneComprador && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Phone size={11} />{c.telefoneComprador}</span>}
                      {c.emailComprador && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Mail size={11} />{c.emailComprador}</span>}
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={11} />{c.terreno.nome} · {c.terreno.cidade}</span>
                    </div>
                  </div>

                  {/* Contrato + progresso */}
                  <div style={{ flexShrink: 0, width: 200, display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "var(--fg-tertiary)" }}>
                      <span>{fmtBRL(c.fin.totalPago)} recebido</span>
                      <span style={{ fontWeight: 600 }}>{pct}%</span>
                    </div>
                    <div style={{ height: 6, background: "var(--ink-100)", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: c.fin.emAtraso > 0 ? "#dc2626" : pct >= 100 ? "#16a34a" : "var(--navy-700)", borderRadius: 99 }} />
                    </div>
                    <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>
                      {c.fin.pagas}/{c.fin.total} parcelas · {c.dataContrato ? fmtDate(c.dataContrato) : "—"}
                    </div>
                  </div>

                  <ChevronRight size={16} style={{ color: "var(--fg-muted)", flexShrink: 0 }} />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
