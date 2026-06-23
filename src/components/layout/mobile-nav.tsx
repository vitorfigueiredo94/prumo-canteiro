"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  Wallet,
  Handshake,
} from "lucide-react";

// Atalhos rápidos (acesso com o polegar). O menu completo fica no hambúrguer do topo.
const NAV_ITEMS = [
  { href: "/dashboard",    short: "Início",  icon: LayoutDashboard },
  { href: "/obras",        short: "Obras",   icon: Building2 },
  { href: "/financeiro",   short: "Financ.", icon: Wallet },
  { href: "/vendas",       short: "Vendas",  icon: Handshake },
  { href: "/funcionarios", short: "Equipe",  icon: Users },
];

export function MobileNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <nav
      style={{
        display: "flex",
        width: "100%",
        background: "var(--bg-surface)",
        borderTop: "1px solid var(--border-subtle)",
        paddingBottom: "env(safe-area-inset-bottom, 0)",
        flexShrink: 0,
        zIndex: 20,
      }}
    >
      {NAV_ITEMS.map(({ href, short, icon: Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              padding: "8px 1px",
              minHeight: 56,
              minWidth: 0,
              color: active ? "var(--navy-700)" : "var(--fg-tertiary)",
              fontFamily: "var(--font-sans)",
              textDecoration: "none",
            }}
          >
            <Icon size={21} />
            <span style={{ fontSize: 10.5, fontWeight: active ? 700 : 500, whiteSpace: "nowrap" }}>
              {short}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
