"use client";

import { useState, useTransition } from "react";
import { toggleBloqueio } from "./actions";

interface Usuario { id: string; nome: string; email: string; empresaNome: string; superAdmin: boolean; bloqueado: boolean; criadoEm: string; }

const Th = ({ children }: { children: React.ReactNode }) => (
  <th style={{ padding: "10px 16px", fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase" as const, letterSpacing: "0.06em", background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.08)", textAlign: "left" as const }}>{children}</th>
);
const Td = ({ children }: { children: React.ReactNode }) => (
  <td style={{ padding: "12px 16px", fontSize: 13.5, color: "#CBD5E1", borderBottom: "1px solid rgba(255,255,255,0.05)", verticalAlign: "middle" }}>{children}</td>
);

export function UsuariosView({ usuarios }: { usuarios: Usuario[] }) {
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();

  const filtered = usuarios.filter(u =>
    u.nome.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.empresaNome.toLowerCase().includes(search.toLowerCase())
  );

  function handleToggle(u: Usuario) {
    const msg = u.bloqueado ? `Liberar acesso de "${u.nome}"?` : `Bloquear "${u.nome}"? Ele não conseguirá mais fazer login.`;
    if (!confirm(msg)) return;
    startTransition(() => toggleBloqueio(u.id, !u.bloqueado));
  }

  function avatarBg(name: string) {
    const COLORS = ["#1e3a5f", "#b45309", "#6d28d9", "#047857", "#b91c1c", "#0369a1"];
    let h = 0;
    for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
    return COLORS[h % COLORS.length];
  }
  function initials(name: string) {
    const p = name.trim().split(/\s+/);
    return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 500, color: "#F1F5F9" }}>Usuários</h1>
          <p style={{ margin: 0, fontSize: 14, color: "#64748B" }}>{usuarios.length} usuários em {new Set(usuarios.map(u => u.empresaNome)).size} empresas</p>
        </div>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome, e-mail ou empresa…"
          style={{ height: 38, padding: "0 14px", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, background: "rgba(255,255,255,0.06)", color: "#F1F5F9", fontFamily: "var(--font-sans)", fontSize: 13.5, width: 300, outline: "none" }}
        />
      </div>

      <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr><Th>Usuário</Th><Th>E-mail</Th><Th>Empresa</Th><Th>Papel</Th><Th>Cadastrado</Th><Th>Ação</Th></tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} style={{ opacity: u.bloqueado ? 0.6 : 1 }}>
                <Td>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: avatarBg(u.nome), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                      {initials(u.nome)}
                    </div>
                    <span style={{ fontWeight: 600, color: "#F1F5F9" }}>{u.nome}</span>
                  </div>
                </Td>
                <Td><span style={{ color: "#94A3B8" }}>{u.email}</span></Td>
                <Td>{u.empresaNome}</Td>
                <Td>
                  {u.superAdmin
                    ? <span style={{ fontSize: 11.5, fontWeight: 700, color: "#D4A24C", background: "rgba(212,162,76,0.12)", padding: "3px 8px", borderRadius: 20 }}>Super Admin</span>
                    : <span style={{ fontSize: 11.5, color: "#64748B" }}>Usuário</span>}
                </Td>
                <Td><span style={{ color: "#64748B", fontSize: 13 }}>{new Date(u.criadoEm).toLocaleDateString("pt-BR")}</span></Td>
                <Td>
                  {!u.superAdmin && (
                    <button
                      disabled={pending}
                      onClick={() => handleToggle(u)}
                      style={{ padding: "5px 12px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", borderRadius: 8, border: `1px solid ${u.bloqueado ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`, background: u.bloqueado ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", color: u.bloqueado ? "#22C55E" : "#EF4444" }}
                    >
                      {u.bloqueado ? "Liberar" : "Bloquear"}
                    </button>
                  )}
                </Td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ padding: "40px 16px", textAlign: "center", color: "#475569", fontSize: 14 }}>Nenhum usuário encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
