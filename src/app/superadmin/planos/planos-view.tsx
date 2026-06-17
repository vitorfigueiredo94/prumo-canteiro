"use client";

import { useState, useTransition } from "react";
import { createPlano, updatePlano, deletePlano } from "./actions";
import { fmtBRL } from "@/lib/format";

interface Plano { id: string; nome: string; preco: number; limiteObras: number | null; limiteUsuarios: number | null; destaque: boolean; recursos: string[]; assinantes: number; receitaMensal: number; criadoEm: string; }

const inp: React.CSSProperties = { height: 38, padding: "0 12px", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, background: "rgba(255,255,255,0.06)", color: "#F1F5F9", fontFamily: "var(--font-sans)", fontSize: 14, width: "100%", outline: "none" };
const Btn = ({ onClick, children, variant = "primary", small, type }: { onClick?: () => void; children: React.ReactNode; variant?: "primary"|"secondary"|"danger"|"ghost"; small?: boolean; type?: "button"|"submit" }) => {
  const colors = { primary: { bg: "#1e3a5f", c: "#F1F5F9", b: "#1e3a5f" }, secondary: { bg: "rgba(255,255,255,0.06)", c: "#CBD5E1", b: "rgba(255,255,255,0.12)" }, danger: { bg: "rgba(239,68,68,0.1)", c: "#EF4444", b: "rgba(239,68,68,0.3)" }, ghost: { bg: "transparent", c: "#64748B", b: "transparent" } };
  const s = colors[variant];
  return <button type={type ?? "button"} onClick={onClick} style={{ padding: small ? "5px 12px" : "9px 18px", background: s.bg, color: s.c, border: `1px solid ${s.b}`, borderRadius: 8, fontSize: small ? 12.5 : 14, fontWeight: 600, cursor: "pointer" }}>{children}</button>;
};

function PlanoModal({ plano, onClose }: { plano: Plano | null; onClose: () => void }) {
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = plano ? await updatePlano(plano.id, fd) : await createPlano(fd);
      if (r.error) { setError(r.error); return; }
      onClose();
    });
  }

  const defaultRecursos = plano?.recursos.join("\n") ?? "";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "#0f1e30", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "32px", width: 480, maxWidth: "95vw" }} onClick={e => e.stopPropagation()}>
        <h2 style={{ margin: "0 0 24px", fontFamily: "var(--font-display)", fontSize: 20, color: "#F1F5F9" }}>{plano ? "Editar Plano" : "Novo Plano"}</h2>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#94A3B8", marginBottom: 5 }}>Nome do plano</label>
              <input name="nome" required defaultValue={plano?.nome} style={inp} placeholder="Ex: Profissional" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#94A3B8", marginBottom: 5 }}>Preço (R$/mês)</label>
              <input name="preco" type="number" required min={0} step={0.01} defaultValue={plano?.preco} style={inp} placeholder="199.00" />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#94A3B8", marginBottom: 5 }}>Limite de Obras</label>
              <input name="limiteObras" type="number" min={1} defaultValue={plano?.limiteObras ?? ""} style={inp} placeholder="Sem limite" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#94A3B8", marginBottom: 5 }}>Limite de Usuários</label>
              <input name="limiteUsuarios" type="number" min={1} defaultValue={plano?.limiteUsuarios ?? ""} style={inp} placeholder="Sem limite" />
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#94A3B8", marginBottom: 5 }}>Recursos (um por linha)</label>
            <textarea name="recursos" rows={4} defaultValue={defaultRecursos} style={{ ...inp, height: "auto", padding: "10px 12px", resize: "vertical" as const }} placeholder={"Obras e terrenos\nNotas fiscais\nVendas"} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input name="destaque" type="checkbox" id="destaque" defaultChecked={plano?.destaque} style={{ width: 16, height: 16 }} />
            <label htmlFor="destaque" style={{ fontSize: 13.5, color: "#94A3B8" }}>Marcar como "Mais vendido"</label>
          </div>
          {error && <p style={{ margin: 0, fontSize: 13, color: "#EF4444", background: "rgba(239,68,68,0.1)", padding: "10px 14px", borderRadius: 8 }}>{error}</p>}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
            <Btn type="submit">{pending ? "Salvando…" : plano ? "Salvar Alterações" : "Criar Plano"}</Btn>
          </div>
        </form>
      </div>
    </div>
  );
}

export function PlanosView({ planos }: { planos: Plano[] }) {
  const [modal, setModal] = useState<"create" | Plano | null>(null);
  const [pending, start] = useTransition();

  const totalMRR = planos.reduce((s, p) => s + p.receitaMensal, 0);

  function handleDelete(p: Plano) {
    if (p.assinantes > 0) { alert(`Plano "${p.nome}" tem ${p.assinantes} assinante(s). Migre-os antes de excluir.`); return; }
    if (!confirm(`Excluir o plano "${p.nome}"?`)) return;
    start(async () => {
      const r = await deletePlano(p.id);
      if (r.error) alert(r.error);
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 500, color: "#F1F5F9" }}>Planos</h1>
          <p style={{ margin: 0, fontSize: 14, color: "#64748B" }}>{planos.length} planos · MRR combinado: {fmtBRL(totalMRR)}/mês</p>
        </div>
        <Btn onClick={() => setModal("create")}>+ Novo Plano</Btn>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
        {planos.map(p => (
          <div key={p.id} style={{ background: p.destaque ? "rgba(212,162,76,0.07)" : "rgba(255,255,255,0.04)", border: `1px solid ${p.destaque ? "rgba(212,162,76,0.3)" : "rgba(255,255,255,0.08)"}`, borderRadius: 14, padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#F1F5F9" }}>{p.nome}</span>
              {p.destaque && <span style={{ fontSize: 10.5, fontWeight: 700, color: "#D4A24C", background: "rgba(212,162,76,0.15)", padding: "3px 8px", borderRadius: 20 }}>DESTAQUE</span>}
            </div>
            <p style={{ margin: "0 0 16px", fontFamily: "var(--font-display)", fontSize: 28, color: p.destaque ? "#D4A24C" : "#F1F5F9" }}>
              {fmtBRL(p.preco)}<span style={{ fontSize: 13, fontWeight: 400, color: "#64748B" }}>/mês</span>
            </p>
            <div style={{ display: "flex", gap: 20, marginBottom: 16, fontSize: 13, color: "#94A3B8" }}>
              <span>{p.assinantes} assinantes</span>
              <span style={{ color: p.receitaMensal > 0 ? "#22C55E" : "#475569" }}>{fmtBRL(p.receitaMensal)}/mês</span>
            </div>
            {p.recursos.length > 0 && (
              <ul style={{ margin: "0 0 20px", padding: "0 0 0 16px" }}>
                {p.recursos.slice(0, 5).map((r, i) => <li key={i} style={{ fontSize: 12.5, color: "#64748B", marginBottom: 3 }}>{r}</li>)}
                {p.recursos.length > 5 && <li style={{ fontSize: 12.5, color: "#475569" }}>+{p.recursos.length - 5} mais…</li>}
              </ul>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <Btn small variant="secondary" onClick={() => setModal(p)}>Editar</Btn>
              <Btn small variant="danger" onClick={() => handleDelete(p)}>Excluir</Btn>
            </div>
          </div>
        ))}
        {planos.length === 0 && <p style={{ color: "#475569", fontSize: 14, gridColumn: "1/-1" }}>Nenhum plano criado.</p>}
      </div>

      {modal !== null && (
        <PlanoModal
          plano={modal === "create" ? null : modal}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
