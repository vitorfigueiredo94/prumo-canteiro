"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  Wallet,
  ReceiptText,
  Handshake,
  MapPinned,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { logoutAction } from "@/app/(app)/actions";

const NAV_ITEMS = [
  { href: "/dashboard",     label: "Visão geral",   icon: LayoutDashboard },
  { href: "/obras",         label: "Obras",         icon: Building2 },
  { href: "/funcionarios",  label: "Funcionários",  icon: Users },
  { href: "/financeiro",    label: "Financeiro",    icon: Wallet },
  { href: "/notas",         label: "Notas fiscais", icon: ReceiptText },
  { href: "/vendas",        label: "Vendas",        icon: Handshake },
  { href: "/terrenos",      label: "Terrenos",      icon: MapPinned },
];

interface SidebarProps {
  empresaNome: string;
}

export function Sidebar({ empresaNome }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <aside
      style={{
        width: collapsed ? 68 : 236,
        flexShrink: 0,
        background: "var(--navy-700)",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        borderRight: "1px solid var(--navy-800)",
        transition: "width 220ms cubic-bezier(0.2,0,0,1)",
        overflow: "hidden",
      }}
    >
      {/* Logo + empresa */}
      <div
        style={{
          padding: collapsed ? "20px 0" : "20px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-start",
          gap: 11,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          flexShrink: 0,
        }}
      >
        <Logo size={34} />
        {!collapsed && (
          <div style={{ lineHeight: 1.05, overflow: "hidden", minWidth: 0 }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 500, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>
              PrumoCanteiro
            </div>
            <div style={{ fontSize: 10.5, color: "var(--gold-200)", letterSpacing: "0.08em", textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {empresaNome}
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 10px", overflowY: "auto" }}>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                width: "100%",
                padding: collapsed ? "11px 0" : "11px 12px",
                justifyContent: collapsed ? "center" : "flex-start",
                marginBottom: 3,
                background: active ? "rgba(212,162,76,0.14)" : "transparent",
                color: active ? "#fff" : "rgba(255,255,255,0.78)",
                borderRadius: "var(--radius-md)",
                borderLeft: collapsed ? "none" : `3px solid ${active ? "var(--gold-400)" : "transparent"}`,
                fontSize: 14.5,
                fontWeight: active ? 600 : 500,
                fontFamily: "var(--font-sans)",
                textDecoration: "none",
                transition: "background 140ms",
              }}
              onMouseEnter={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)";
              }}
              onMouseLeave={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.background = "transparent";
              }}
            >
              <Icon size={19} style={{ flexShrink: 0 }} />
              {!collapsed && <span style={{ flex: 1 }}>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: 12, borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", gap: 4 }}>
        <form action={logoutAction}>
          <button
            type="submit"
            title="Sair"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
              justifyContent: collapsed ? "center" : "flex-start",
              padding: "9px 10px",
              background: "transparent",
              border: "none",
              color: "rgba(255,255,255,0.55)",
              cursor: "pointer",
              borderRadius: "var(--radius-md)",
              fontSize: 13,
              fontFamily: "var(--font-sans)",
            }}
          >
            <LogOut size={16} />
            {!collapsed && <span>Sair</span>}
          </button>
        </form>

        <button
          onClick={() => setCollapsed((c) => !c)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            width: "100%",
            justifyContent: collapsed ? "center" : "flex-start",
            padding: "9px 10px",
            background: "transparent",
            border: "none",
            color: "rgba(255,255,255,0.55)",
            cursor: "pointer",
            borderRadius: "var(--radius-md)",
            fontSize: 13,
            fontFamily: "var(--font-sans)",
          }}
        >
          {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
          {!collapsed && <span>Recolher</span>}
        </button>
      </div>
    </aside>
  );
}
