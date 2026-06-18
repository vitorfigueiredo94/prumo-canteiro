"use client";

import { useState, useTransition } from "react";
import { QrCode, Plus, Printer, Trash2, Package, Wrench } from "lucide-react";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Insumo {
  id: string;
  nome: string;
  tipo: string;
  descricao: string | null;
  obraId: string | null;
  qrImageUrl: string | null;
  codigo: string;
  criadoEm: string;
}

interface ObraLite { id: string; nome: string; }

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TIPO_CFG: Record<string, { label: string; bg: string; color: string; Icon: React.ElementType }> = {
  insumo:      { label: "Insumo",      bg: "#dbeafe", color: "#1d4ed8", Icon: Package },
  equipamento: { label: "Equipamento", bg: "#ede9fe", color: "#6d28d9", Icon: Wrench  },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

const inp: React.CSSProperties = {
  height: 40, padding: "0 12px", border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-md)", background: "var(--bg-surface)", color: "var(--fg-primary)",
  fontFamily: "var(--font-sans)", fontSize: 14, outline: "none", width: "100%",
};

// ─── Main View ────────────────────────────────────────────────────────────────

export function InsumosView({ insumos: initial, obras }: { insumos: Insumo[]; obras: ObraLite[] }) {
  const router = useRouter();
  const [insumos, setInsumos] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<"insumo" | "equipamento">("insumo");
  const [descricao, setDescricao] = useState("");
  const [obraId, setObraId] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);
  const [filtro, setFiltro] = useState("todos");
  const [isPending, startTransition] = useTransition();

  const obraMap = Object.fromEntries(obras.map((o) => [o.id, o.nome]));

  const filtrados = filtro === "todos" ? insumos : insumos.filter((i) => i.tipo === filtro);

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    setCriando(true);
    setErro(null);
    try {
      const body: Record<string, string> = { nome: nome.trim(), tipo };
      if (descricao.trim()) body.descricao = descricao.trim();
      if (obraId) body.obraId = obraId;

      const res = await fetch("/api/v1/qrcode/insumos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setErro(data.error ?? "Erro ao criar"); return; }

      setInsumos((prev) => [{
        id: data.id, nome: data.nome, tipo: data.tipo,
        descricao: data.descricao ?? null, obraId: data.obraId ?? null,
        qrImageUrl: data.qrImageUrl ?? null, codigo: data.codigo, criadoEm: data.criadoEm,
      }, ...prev]);
      setNome(""); setDescricao(""); setObraId(""); setShowForm(false);
    } finally {
      setCriando(false);
    }
  }

  async function handleDesativar(id: string) {
    if (!confirm("Desativar este insumo? Ele não aparecerá mais na listagem.")) return;
    startTransition(async () => {
      await fetch(`/api/v1/qrcode/insumos/${id}`, { method: "DELETE" });
      setInsumos((prev) => prev.filter((i) => i.id !== id));
    });
  }

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 500, color: "var(--fg-primary)", letterSpacing: "-0.015em", lineHeight: 1.1, display: "flex", alignItems: "center", gap: 10 }}>
          <QrCode size={26} style={{ color: "var(--navy-700)" }} />
          Insumos & QR Codes
        </h1>
        <p style={{ margin: "8px 0 0", fontSize: 14.5, color: "var(--fg-tertiary)", lineHeight: 1.6 }}>
          Gere QR Codes para rastreamento de materiais e equipamentos. Imprima e cole no item físico.
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total de insumos", value: insumos.length },
          { label: "Materiais",        value: insumos.filter((i) => i.tipo === "insumo").length },
          { label: "Equipamentos",     value: insumos.filter((i) => i.tipo === "equipamento").length },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "16px 20px" }}>
            <div style={{ fontSize: 11.5, color: "var(--fg-tertiary)", textTransform: "uppercase" as const, letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>{label}</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 400, color: "var(--fg-primary)", letterSpacing: "-0.02em" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" as const }}>
        <div style={{ display: "flex", gap: 8 }}>
          {[["todos", "Todos"], ["insumo", "Insumos"], ["equipamento", "Equipamentos"]].map(([k, l]) => (
            <button key={k} onClick={() => setFiltro(k)} style={{ height: 34, padding: "0 14px", borderRadius: "var(--radius-full)", fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)", border: `1px solid ${filtro === k ? "var(--navy-600)" : "var(--border-default)"}`, background: filtro === k ? "var(--navy-700)" : "var(--bg-surface)", color: filtro === k ? "#fff" : "var(--fg-secondary)" }}>{l}</button>
          ))}
        </div>
        <button onClick={() => setShowForm(true)} style={{ height: 40, padding: "0 18px", background: "var(--navy-700)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 }}>
          <Plus size={15} /> Novo insumo
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "22px 24px", marginBottom: 20 }}>
          <h2 style={{ margin: "0 0 18px", fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 500, color: "var(--fg-primary)" }}>Novo insumo / equipamento</h2>
          <form onSubmit={handleCriar} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-secondary)" }}>Nome <span style={{ color: "var(--danger-500)" }}>*</span></label>
                <input required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Betoneira 400L" style={inp} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-secondary)" }}>Tipo</label>
                <select value={tipo} onChange={(e) => setTipo(e.target.value as "insumo" | "equipamento")} style={{ ...inp, width: 160 }}>
                  <option value="insumo">Insumo</option>
                  <option value="equipamento">Equipamento</option>
                </select>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-secondary)" }}>Descrição (opcional)</label>
                <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Especificações ou observações…" style={inp} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-secondary)" }}>Vincular à obra (opcional)</label>
                <select value={obraId} onChange={(e) => setObraId(e.target.value)} style={inp}>
                  <option value="">— Sem vínculo —</option>
                  {obras.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
                </select>
              </div>
            </div>
            {erro && <p style={{ margin: 0, fontSize: 13, color: "var(--danger-500)" }}>{erro}</p>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => { setShowForm(false); setErro(null); }} style={{ height: 38, padding: "0 16px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "transparent", color: "var(--fg-secondary)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 14 }}>Cancelar</button>
              <button type="submit" disabled={criando} style={{ height: 38, padding: "0 18px", background: "var(--navy-700)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600, cursor: criando ? "not-allowed" : "pointer", opacity: criando ? 0.7 : 1 }}>
                {criando ? "Gerando QR Code…" : "Gerar QR Code"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        {filtrados.length === 0 ? (
          <div style={{ padding: "56px 24px", textAlign: "center" }}>
            <QrCode size={36} style={{ color: "var(--fg-muted)", marginBottom: 12 }} />
            <p style={{ margin: 0, fontSize: 15, color: "var(--fg-tertiary)", fontFamily: "var(--font-sans)" }}>Nenhum insumo cadastrado.</p>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--fg-muted)" }}>Clique em "Novo insumo" para gerar o primeiro QR Code.</p>
          </div>
        ) : (
          <div>
            {filtrados.map((insumo, i) => {
              const cfg = TIPO_CFG[insumo.tipo] ?? TIPO_CFG.insumo;
              const Icon = cfg.Icon;
              const obranome = insumo.obraId ? (obraMap[insumo.obraId] ?? "—") : null;

              return (
                <div key={insumo.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 22px", borderBottom: i < filtrados.length - 1 ? "1px solid var(--border-subtle)" : "none", flexWrap: "wrap" as const }}>

                  {/* QR Image */}
                  <div style={{ width: 64, height: 64, borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--border-subtle)", flexShrink: 0, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {insumo.qrImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={insumo.qrImageUrl} alt="QR Code" style={{ width: 60, height: 60, objectFit: "contain" }} />
                    ) : (
                      <QrCode size={28} style={{ color: "var(--fg-muted)" }} />
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 15.5, fontWeight: 600, color: "var(--fg-primary)", fontFamily: "var(--font-sans)" }}>{insumo.nome}</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 9px", borderRadius: 999, background: cfg.bg, color: cfg.color, fontSize: 11.5, fontWeight: 700 }}>
                        <Icon size={11} />{cfg.label}
                      </span>
                    </div>
                    {insumo.descricao && (
                      <div style={{ fontSize: 13, color: "var(--fg-tertiary)", marginBottom: 3 }}>{insumo.descricao}</div>
                    )}
                    <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>
                      Criado em {fmtDate(insumo.criadoEm)}
                      {obranome ? ` · Obra: ${obranome}` : ""}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    {insumo.qrImageUrl && (
                      <button
                        onClick={() => window.open(insumo.qrImageUrl!, "_blank")}
                        title="Imprimir QR Code"
                        style={{ height: 34, width: 34, border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-surface)", color: "var(--fg-secondary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <Printer size={15} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDesativar(insumo.id)}
                      disabled={isPending}
                      title="Desativar"
                      style={{ height: 34, width: 34, border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--bg-surface)", color: "var(--danger-500)", cursor: isPending ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: isPending ? 0.6 : 1 }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
