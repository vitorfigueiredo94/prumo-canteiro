"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Shield, LogOut } from "lucide-react";
import { logoutAction } from "@/app/(app)/actions";

const AV_COLORS = ["#1e3a5f","#b45309","#6d28d9","#047857","#b91c1c","#0369a1"];
function avatarBg(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return AV_COLORS[h % AV_COLORS.length];
}
function initials(name: string) {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase();
}

export function UserMenu({ nome, email, superAdmin }: { nome: string; email: string; superAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const bg = avatarBg(nome);
  const ini = initials(nome);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: 38, height: 38, borderRadius: "50%",
          background: bg, color: "#fff",
          border: "2px solid rgba(255,255,255,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 700, cursor: "pointer",
          boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
          letterSpacing: "0.02em",
        }}
        title={nome}
      >
        {ini}
      </button>

      {open && (
        <div style={{
          position: "absolute", top: 46, right: 0, zIndex: 200,
          background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
          borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          minWidth: 220, overflow: "hidden",
        }}>
          {/* User info */}
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: bg, color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700, flexShrink: 0,
              }}>
                {ini}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: "var(--fg-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nome}</p>
                <p style={{ margin: 0, fontSize: 12, color: "var(--fg-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ padding: "6px" }}>
            {superAdmin && (
              <Link
                href="/superadmin/visao-geral"
                onClick={() => setOpen(false)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 12px", borderRadius: 8,
                  color: "#D4A24C", fontSize: 13.5, fontWeight: 600,
                  textDecoration: "none",
                  background: "rgba(212,162,76,0.08)",
                  marginBottom: 2,
                }}
              >
                <Shield size={15} />
                Painel Admin
              </Link>
            )}

            <form action={logoutAction}>
              <button
                type="submit"
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%", padding: "9px 12px", borderRadius: 8,
                  background: "transparent", border: "none",
                  color: "var(--fg-secondary)", fontSize: 13.5,
                  cursor: "pointer", textAlign: "left",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--ink-50)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <LogOut size={15} />
                Sair
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
