"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, Users, CreditCard, Receipt, Shield, LogOut } from "lucide-react";
import { logoutAction } from "@/app/(app)/actions";
import { ThemeToggle } from "@/components/layout/theme-toggle";

const LINKS = [
  { href: "/superadmin/visao-geral", label: "Visão Geral",  Icon: LayoutDashboard },
  { href: "/superadmin/clientes",    label: "Clientes",     Icon: Building2 },
  { href: "/superadmin/usuarios",    label: "Usuários",     Icon: Users },
  { href: "/superadmin/planos",      label: "Planos",       Icon: CreditCard },
  { href: "/superadmin/cobrancas",   label: "Cobranças",    Icon: Receipt },
];

export function SaNav() {
  const path = usePathname();

  return (
    <nav style={{
      width: 220,
      background: "#0a1628",
      borderRight: "1px solid rgba(255,255,255,0.06)",
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
      height: "100vh",
    }}>
      <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, background: "#D4A24C", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Shield size={16} color="#0a1628" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#F1F5F9", letterSpacing: "0.01em", fontFamily: "var(--font-display)" }}>PrumoCanteiro</p>
            <p style={{ margin: 0, fontSize: 10.5, color: "#D4A24C", fontWeight: 700, letterSpacing: "0.08em" }}>SUPER ADMIN</p>
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 12px", flex: 1 }}>
        {LINKS.map(({ href, label, Icon }) => {
          const active = path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 12px", borderRadius: 8, marginBottom: 2,
                color: active ? "#F1F5F9" : "#64748B",
                background: active ? "rgba(212,162,76,0.12)" : "transparent",
                fontWeight: active ? 600 : 400, fontSize: 13.5,
                textDecoration: "none",
              }}
            >
              <Icon size={15} color={active ? "#D4A24C" : undefined} strokeWidth={active ? 2.2 : 1.8} />
              {label}
            </Link>
          );
        })}
      </div>

      <div style={{ padding: "12px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 4px 4px 12px", marginBottom: 2 }}>
          <span style={{ fontSize: 12, color: "#475569" }}>Aparência</span>
          <ThemeToggle size={16} />
        </div>
        <Link
          href="/dashboard"
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 8, color: "#475569", fontSize: 13, textDecoration: "none" }}
        >
          ← Voltar ao app
        </Link>
        <form action={logoutAction}>
          <button
            type="submit"
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 8, color: "#EF4444", fontSize: 13, background: "transparent", border: "none", cursor: "pointer", width: "100%" }}
          >
            <LogOut size={14} />
            Sair
          </button>
        </form>
      </div>
    </nav>
  );
}
