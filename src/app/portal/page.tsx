"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";

const STATUS_MAP: Record<string, string> = {
  planejamento: "Planejamento",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  suspensa: "Suspensa",
  cancelada: "Cancelada",
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  planejamento: { bg: "#dbeafe", color: "#1d4ed8" },
  em_andamento: { bg: "#dcfce7", color: "#15803d" },
  concluida:    { bg: "#f0fdf4", color: "#166534" },
  suspensa:     { bg: "#fef9c3", color: "#a16207" },
  cancelada:    { bg: "#fee2e2", color: "#b91c1c" },
};

interface Obra {
  id: string;
  nome: string;
  status: string;
  progresso: number;
  orcamento: number;
  inicio: string | null;
  prazo: string | null;
  responsavel: string | null;
  terreno: { nome: string; cidade: string } | null;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

function StatusBadge({ status }: { status: string }) {
  const label = STATUS_MAP[status] ?? status;
  const colors = STATUS_COLORS[status] ?? { bg: "#f1f5f9", color: "#64748b" };
  return (
    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: colors.bg, color: colors.color, fontFamily: "system-ui, sans-serif" }}>
      {label}
    </span>
  );
}

function ObraCard({ obra }: { obra: Obra }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#1e293b", fontFamily: "system-ui, sans-serif" }}>{obra.nome}</h3>
        <StatusBadge status={obra.status} />
      </div>
      {obra.terreno && (
        <p style={{ margin: "0 0 14px", fontSize: 13, color: "#64748b", fontFamily: "system-ui, sans-serif" }}>
          {obra.terreno.nome} · {obra.terreno.cidade}
        </p>
      )}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#64748b", marginBottom: 6, fontFamily: "system-ui, sans-serif" }}>
          <span>Progresso</span>
          <span style={{ fontWeight: 600, color: "#1e293b" }}>{obra.progresso}%</span>
        </div>
        <div style={{ height: 8, borderRadius: 999, background: "#e2e8f0", overflow: "hidden" }}>
          <div style={{ width: `${Math.min(obra.progresso, 100)}%`, height: "100%", background: "#1e3a5f", borderRadius: 999, transition: "width 600ms" }} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        {obra.inicio && (
          <div>
            <div style={{ fontSize: 11.5, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "system-ui, sans-serif" }}>Início</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#1e293b", fontFamily: "system-ui, sans-serif" }}>{fmtDate(obra.inicio)}</div>
          </div>
        )}
        {obra.prazo && (
          <div>
            <div style={{ fontSize: 11.5, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "system-ui, sans-serif" }}>Prazo</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#1e293b", fontFamily: "system-ui, sans-serif" }}>{fmtDate(obra.prazo)}</div>
          </div>
        )}
        {obra.responsavel && (
          <div>
            <div style={{ fontSize: 11.5, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "system-ui, sans-serif" }}>Responsável</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#1e293b", fontFamily: "system-ui, sans-serif" }}>{obra.responsavel}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function PortalContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tokenParam = searchParams.get("t");
  const [tokenInput, setTokenInput] = useState("");
  const [obras, setObras] = useState<Obra[] | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [erroMsg, setErroMsg] = useState<string | null>(null);

  useEffect(() => {
    if (tokenParam) buscarObras(tokenParam);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenParam]);

  async function buscarObras(t: string) {
    setStatus("loading");
    setErroMsg(null);
    try {
      const res = await fetch("/api/v1/portal/obras", { headers: { "x-portal-token": t } });
      if (res.status === 401) { setStatus("error"); setErroMsg("Token inválido ou expirado."); return; }
      if (!res.ok) { setStatus("error"); setErroMsg("Erro ao carregar obras. Tente novamente."); return; }
      const data = await res.json();
      setObras(data.obras ?? []);
      setStatus("ok");
    } catch {
      setStatus("error");
      setErroMsg("Erro de conexão. Verifique sua internet e tente novamente.");
    }
  }

  function handleTokenSubmit(e: React.FormEvent) {
    e.preventDefault();
    const t = tokenInput.trim();
    if (!t) return;
    router.push(`/portal?t=${encodeURIComponent(t)}`);
  }

  const containerStyle: React.CSSProperties = { minHeight: "100vh", background: "#f4f4f5", display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 16px 80px", fontFamily: "system-ui, sans-serif" };
  const cardStyle: React.CSSProperties = { width: "100%", maxWidth: 680, background: "#fff", borderRadius: 12, boxShadow: "0 2px 16px rgba(0,0,0,0.08)", overflow: "hidden" };

  if (!tokenParam) {
    return (
      <div style={containerStyle}>
        <div style={{ ...cardStyle, padding: "40px 36px" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 52, height: 52, background: "#1e3a5f", borderRadius: 12, marginBottom: 16 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#1e293b" }}>Portal do Cliente</h1>
            <p style={{ margin: "8px 0 0", fontSize: 14, color: "#64748b" }}>Insira o token de acesso fornecido pela construtora.</p>
          </div>
          <form onSubmit={handleTokenSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input value={tokenInput} onChange={(e) => setTokenInput(e.target.value)} placeholder="Cole o token aqui"
              style={{ height: 48, padding: "0 16px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 15, color: "#1e293b", fontFamily: "monospace", outline: "none" }}
              onFocus={(e) => { e.target.style.borderColor = "#1e3a5f"; }}
              onBlur={(e) => { e.target.style.borderColor = "#cbd5e1"; }} />
            <button type="submit" style={{ height: 48, background: "#1e3a5f", color: "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
              Acessar
            </button>
          </form>
        </div>
        <footer style={{ marginTop: 32, fontSize: 13, color: "#94a3b8" }}>Powered by PrumoCanteiro</footer>
      </div>
    );
  }

  if (status === "loading" || status === "idle") {
    return (
      <div style={containerStyle}>
        <div style={{ ...cardStyle, padding: "60px 36px", textAlign: "center" }}>
          <p style={{ color: "#64748b", fontSize: 15 }}>Carregando obras…</p>
        </div>
        <footer style={{ marginTop: 32, fontSize: 13, color: "#94a3b8" }}>Powered by PrumoCanteiro</footer>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div style={containerStyle}>
        <div style={{ ...cardStyle, padding: "48px 36px", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
          <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700, color: "#1e293b" }}>Acesso negado</h2>
          <p style={{ margin: 0, fontSize: 14, color: "#64748b" }}>{erroMsg ?? "Token inválido ou expirado."}</p>
          <button onClick={() => router.push("/portal")} style={{ marginTop: 24, padding: "10px 24px", background: "#1e3a5f", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            Tentar outro token
          </button>
        </div>
        <footer style={{ marginTop: 32, fontSize: 13, color: "#94a3b8" }}>Powered by PrumoCanteiro</footer>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={{ width: "100%", maxWidth: 680, marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 24px", background: "#1e3a5f", borderRadius: 12, boxShadow: "0 2px 16px rgba(0,0,0,0.08)" }}>
          <div style={{ width: 36, height: 36, background: "rgba(255,255,255,0.12)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>Portal do Cliente</div>
            <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 13 }}>{obras?.length ?? 0} {obras?.length === 1 ? "obra" : "obras"} disponíveis</div>
          </div>
        </div>
      </div>
      {obras && obras.length > 0 ? (
        <div style={{ width: "100%", maxWidth: 680, display: "flex", flexDirection: "column", gap: 16 }}>
          {obras.map((obra) => <ObraCard key={obra.id} obra={obra} />)}
        </div>
      ) : (
        <div style={{ ...cardStyle, padding: "48px 36px", textAlign: "center" }}>
          <p style={{ color: "#64748b", fontSize: 14 }}>Nenhuma obra disponível no momento.</p>
        </div>
      )}
      <footer style={{ marginTop: 48, fontSize: 13, color: "#94a3b8" }}>Powered by PrumoCanteiro</footer>
    </div>
  );
}

export default function PortalPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#f4f4f5", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif", color: "#64748b", fontSize: 15 }}>Carregando…</div>}>
      <PortalContent />
    </Suspense>
  );
}
