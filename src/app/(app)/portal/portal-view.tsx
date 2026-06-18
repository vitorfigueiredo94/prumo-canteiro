"use client";

import { useState, useEffect, useCallback } from "react";
import { ExternalLink, Copy, Check, Trash2, Plus, RefreshCw } from "lucide-react";

interface TokenInfo {
  id: string;
  nome: string;
  ativo: boolean;
  expiraEm: string | null;
  ultimoUso: string | null;
  criadoEm: string;
}

interface TokenCriado extends TokenInfo {
  token: string;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

function StatusBadge({ ativo }: { ativo: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        background: ativo ? "#dcfce7" : "#f1f5f9",
        color: ativo ? "#15803d" : "#64748b",
        fontFamily: "var(--font-sans)",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: ativo ? "#16a34a" : "#94a3b8", flexShrink: 0 }} />
      {ativo ? "Ativo" : "Revogado"}
    </span>
  );
}

export function PortalClienteView() {
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [criando, setCriando] = useState(false);
  const [nome, setNome] = useState("");
  const [validade, setValidade] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [recemCriado, setRecemCriado] = useState<TokenCriado | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [revogando, setRevogando] = useState<string | null>(null);

  const carregarTokens = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/portal/tokens");
      if (res.ok) setTokens(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregarTokens(); }, [carregarTokens]);

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    setCriando(true);
    setErro(null);
    setRecemCriado(null);
    try {
      const body: Record<string, string> = { nome: nome.trim() };
      if (validade) body.expiraEm = new Date(validade + "T23:59:59").toISOString();
      const res = await fetch("/api/v1/portal/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error ?? "Erro ao criar token");
      } else {
        setRecemCriado(data);
        setNome("");
        setValidade("");
        await carregarTokens();
      }
    } finally {
      setCriando(false);
    }
  }

  async function handleRevogar(id: string) {
    if (!confirm("Revogar este token? O link de acesso deixará de funcionar.")) return;
    setRevogando(id);
    try {
      await fetch("/api/v1/portal/tokens", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await carregarTokens();
      if (recemCriado?.id === id) setRecemCriado(null);
    } finally {
      setRevogando(null);
    }
  }

  function getLinkPortal(token: string) {
    return `${window.location.origin}/portal?t=${token}`;
  }

  async function copiarLink(token: string) {
    await navigator.clipboard.writeText(getLinkPortal(token));
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  const inp: React.CSSProperties = {
    height: 40, padding: "0 12px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)",
    background: "var(--bg-surface)", color: "var(--fg-primary)", fontFamily: "var(--font-sans)", fontSize: 14, outline: "none",
  };

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "32px 24px" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 500, color: "var(--fg-primary)", letterSpacing: "-0.015em", lineHeight: 1.1, display: "flex", alignItems: "center", gap: 10 }}>
          <ExternalLink size={26} style={{ color: "var(--navy-700)" }} />
          Portal do Cliente
        </h1>
        <p style={{ margin: "8px 0 0", fontSize: 14.5, color: "var(--fg-tertiary)", lineHeight: 1.6, maxWidth: 560 }}>
          Gere links de acesso para seus clientes verem o andamento das obras sem precisar de login. Cada link é protegido por um token único e pode ser revogado a qualquer momento.
        </p>
      </div>

      {/* Formulário de criação */}
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "22px 24px", marginBottom: 24 }}>
        <h2 style={{ margin: "0 0 16px", fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 500, color: "var(--fg-primary)" }}>
          Novo link de acesso
        </h2>
        <form onSubmit={handleCriar} style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 240px", display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-secondary)", fontFamily: "var(--font-sans)" }}>
              Nome do cliente ou obra <span style={{ color: "var(--danger-500)" }}>*</span>
            </label>
            <input required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: João Silva — Res. Primavera" style={inp}
              onFocus={(e) => { e.target.style.borderColor = "var(--border-focus)"; }}
              onBlur={(e) => { e.target.style.borderColor = "var(--border-default)"; }} />
          </div>
          <div style={{ flex: "0 1 180px", display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-secondary)", fontFamily: "var(--font-sans)" }}>
              Validade (opcional)
            </label>
            <input type="date" value={validade} onChange={(e) => setValidade(e.target.value)} style={inp}
              onFocus={(e) => { e.target.style.borderColor = "var(--border-focus)"; }}
              onBlur={(e) => { e.target.style.borderColor = "var(--border-default)"; }} />
          </div>
          <button type="submit" disabled={criando || !nome.trim()} style={{ height: 40, padding: "0 18px", background: "var(--navy-700)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600, cursor: criando ? "not-allowed" : "pointer", opacity: criando ? 0.7 : 1, display: "inline-flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
            <Plus size={15} />
            {criando ? "Gerando…" : "Gerar link"}
          </button>
        </form>
        {erro && <p style={{ margin: "10px 0 0", fontSize: 13, color: "var(--danger-500)", fontFamily: "var(--font-sans)" }}>{erro}</p>}
      </div>

      {/* Token recém-criado */}
      {recemCriado && (
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "var(--radius-lg)", padding: "18px 22px", marginBottom: 24 }}>
          <p style={{ margin: "0 0 10px", fontSize: 13.5, fontWeight: 600, color: "#15803d", fontFamily: "var(--font-sans)" }}>
            Link gerado para &quot;{recemCriado.nome}&quot; — copie agora, pois o token não será exibido novamente.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", border: "1px solid #86efac", borderRadius: "var(--radius-md)", padding: "10px 14px" }}>
            <code style={{ flex: 1, fontSize: 13, color: "var(--fg-primary)", fontFamily: "monospace", wordBreak: "break-all" }}>
              {getLinkPortal(recemCriado.token)}
            </code>
            <button onClick={() => copiarLink(recemCriado.token)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", background: copiado ? "#16a34a" : "var(--navy-700)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0, transition: "background 200ms" }}>
              {copiado ? <Check size={14} /> : <Copy size={14} />}
              {copiado ? "Copiado!" : "Copiar"}
            </button>
            <button onClick={() => window.open(`/portal?t=${recemCriado.token}`, "_blank")} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "transparent", color: "var(--navy-700)", border: "1px solid var(--navy-700)", borderRadius: "var(--radius-md)", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
              <ExternalLink size={14} />
              Abrir portal
            </button>
          </div>
        </div>
      )}

      {/* Lista de tokens */}
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        <div style={{ padding: "16px 22px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 500, color: "var(--fg-primary)" }}>Links gerados</h2>
          <button onClick={carregarTokens} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "transparent", color: "var(--fg-secondary)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", fontFamily: "var(--font-sans)", fontSize: 13, cursor: "pointer" }}>
            <RefreshCw size={13} />
            Atualizar
          </button>
        </div>
        {loading ? (
          <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--fg-tertiary)", fontSize: 14 }}>Carregando…</div>
        ) : tokens.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--fg-tertiary)", fontSize: 14 }}>Nenhum link gerado ainda. Crie o primeiro acima.</div>
        ) : (
          <div>
            {tokens.map((t, i) => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 22px", borderBottom: i < tokens.length - 1 ? "1px solid var(--border-subtle)" : "none", background: t.ativo ? "transparent" : "var(--ink-50)", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600, color: t.ativo ? "var(--fg-primary)" : "var(--fg-tertiary)", fontFamily: "var(--font-sans)", marginBottom: 3 }}>{t.nome}</div>
                  <div style={{ fontSize: 12, color: "var(--fg-tertiary)", fontFamily: "var(--font-sans)" }}>
                    Criado em {fmtDate(t.criadoEm)}
                    {t.ultimoUso ? ` · Último acesso ${fmtDate(t.ultimoUso)}` : " · Nunca acessado"}
                    {t.expiraEm ? ` · Expira ${fmtDate(t.expiraEm)}` : ""}
                  </div>
                </div>
                <StatusBadge ativo={t.ativo} />
                {t.ativo && (
                  <button onClick={() => handleRevogar(t.id)} disabled={revogando === t.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "transparent", color: "var(--danger-500)", border: "1px solid var(--danger-500)", borderRadius: "var(--radius-md)", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, cursor: revogando === t.id ? "not-allowed" : "pointer", opacity: revogando === t.id ? 0.6 : 1 }}>
                    <Trash2 size={13} />
                    {revogando === t.id ? "Revogando…" : "Revogar"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
