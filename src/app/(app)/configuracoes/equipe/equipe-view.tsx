"use client";
import { useState } from "react";
import { UserPlus, Trash2, ShieldCheck, Eye } from "lucide-react";

interface Membro {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  bloqueado: boolean;
  criadoEm: string;
}

const CARGO_META: Record<string, { label: string; color: string }> = {
  admin:    { label: "Administrador", color: "#1e3a5f" },
  operador: { label: "Operador",      color: "#047857" },
  visitante:{ label: "Visitante",     color: "#6b7280" },
};

const fs: React.CSSProperties = {
  height: 40, padding: "0 12px", border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-md)", background: "var(--bg-surface)",
  color: "var(--fg-primary)", fontFamily: "var(--font-sans)", fontSize: 14.5, width: "100%", outline: "none",
};
const label: React.CSSProperties = { fontSize: 13, fontWeight: 500, color: "var(--fg-secondary)", marginBottom: 5, display: "block" };

export function EquipeView({ usuarios: initial, currentUserId }: { usuarios: Membro[]; currentUserId: string }) {
  const [membros, setMembros] = useState<Membro[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cargo, setCargo] = useState("admin");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function adicionar() {
    setErro(null);
    if (!nome || !email || !senha) { setErro("Preencha todos os campos."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/v1/equipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email, cargo, senha }),
      });
      const data = await res.json();
      if (!res.ok) { setErro(data.error ?? "Erro ao adicionar."); return; }
      setMembros((prev) => [...prev, { ...data, bloqueado: false, criadoEm: new Date().toISOString() }]);
      setNome(""); setEmail(""); setSenha(""); setCargo("admin"); setShowForm(false);
    } catch { setErro("Erro de rede."); }
    finally { setLoading(false); }
  }

  async function remover(id: string) {
    if (!confirm("Remover este membro da equipe?")) return;
    const res = await fetch(`/api/v1/equipe?id=${id}`, { method: "DELETE" });
    if (res.ok) setMembros((prev) => prev.filter((m) => m.id !== id));
  }

  const cardStyle: React.CSSProperties = {
    background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "var(--shadow-xs)",
  };

  return (
    <div>
      <div style={{ padding: "24px 32px", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-surface)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 500, color: "var(--fg-primary)", letterSpacing: "-0.015em" }}>Equipe</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--fg-tertiary)" }}>Gerencie os membros com acesso à conta.</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          style={{ display: "flex", alignItems: "center", gap: 8, height: 38, padding: "0 16px", background: "var(--navy-700)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600 }}
        >
          <UserPlus size={15} /> Adicionar membro
        </button>
      </div>

      <div style={{ padding: "24px 32px", display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Form */}
        {showForm && (
          <div style={cardStyle}>
            <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border-subtle)" }}>
              <h3 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 500, color: "var(--fg-primary)" }}>Novo membro</h3>
            </div>
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
              {erro && <div style={{ padding: "10px 14px", background: "var(--danger-50)", border: "1px solid var(--danger-200)", borderRadius: "var(--radius-md)", color: "var(--danger-700)", fontSize: 13 }}>{erro}</div>}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div><label style={label}>Nome</label><input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Maria Silva" style={fs} /></div>
                <div><label style={label}>E-mail</label><input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="maria@empresa.com" style={fs} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={label}>Cargo / permissão</label>
                  <select value={cargo} onChange={(e) => setCargo(e.target.value)} style={fs}>
                    <option value="admin">Administrador — acesso total</option>
                    <option value="operador">Operador — sem acesso financeiro</option>
                    <option value="visitante">Visitante — somente leitura</option>
                  </select>
                </div>
                <div><label style={label}>Senha inicial</label><input value={senha} onChange={(e) => setSenha(e.target.value)} type="password" placeholder="Mínimo 8 caracteres" style={fs} /></div>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button onClick={() => setShowForm(false)} style={{ height: 38, padding: "0 18px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "transparent", color: "var(--fg-secondary)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 14 }}>Cancelar</button>
                <button onClick={adicionar} disabled={loading} style={{ height: 38, padding: "0 18px", background: "var(--navy-700)", color: "#fff", border: "none", borderRadius: "var(--radius-md)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600, opacity: loading ? 0.7 : 1 }}>
                  {loading ? "Adicionando…" : "Adicionar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* List */}
        <div style={cardStyle}>
          {membros.length === 0 ? (
            <p style={{ padding: "32px 24px", textAlign: "center", color: "var(--fg-tertiary)", fontSize: 14, margin: 0 }}>Nenhum membro além de você. Adicione colaboradores acima.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  {["Membro", "E-mail", "Cargo", "Desde", ""].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "12px 20px", fontSize: 11.5, fontWeight: 600, color: "var(--fg-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {membros.map((m, i) => {
                  const meta = CARGO_META[m.cargo] ?? { label: m.cargo, color: "#6b7280" };
                  return (
                    <tr key={m.id} style={{ borderBottom: i < membros.length - 1 ? "1px solid var(--border-subtle)" : "none" }}>
                      <td style={{ padding: "14px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: "50%", background: meta.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                            {m.nome.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                          </div>
                          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-primary)" }}>
                            {m.nome} {m.id === currentUserId && <span style={{ fontSize: 11, color: "var(--fg-muted)", fontWeight: 400 }}>(você)</span>}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: "14px 20px", color: "var(--fg-secondary)", fontSize: 13.5 }}>{m.email}</td>
                      <td style={{ padding: "14px 20px" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: "var(--radius-full)", background: `${meta.color}18`, color: meta.color, fontSize: 12, fontWeight: 700 }}>
                          {m.cargo === "admin" ? <ShieldCheck size={11} /> : <Eye size={11} />}
                          {meta.label}
                        </span>
                      </td>
                      <td style={{ padding: "14px 20px", color: "var(--fg-tertiary)", fontSize: 13 }}>
                        {new Date(m.criadoEm).toLocaleDateString("pt-BR")}
                      </td>
                      <td style={{ padding: "14px 20px", textAlign: "right" }}>
                        {m.id !== currentUserId && (
                          <button onClick={() => remover(m.id)} title="Remover membro" style={{ width: 30, height: 30, border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "transparent", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--danger-500)" }}>
                            <Trash2 size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
