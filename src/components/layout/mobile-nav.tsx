"use client";

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
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard",    short: "Início",  icon: LayoutDashboard },
  { href: "/obras",        short: "Obras",   icon: Building2 },
  { href: "/funcionarios", short: "Equipe",  icon: Users },
  { href: "/financeiro",   short: "Financ.", icon: Wallet },
  { href: "/notas",        short: "Notas",   icon: ReceiptText },
  { href: "/vendas",       short: "Vendas",  icon: Handshake },
  { href: "/terrenos",     short: "Lotes",   icon: MapPinned },
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
        background: "var(--bg-surface)",
        borderTop: "1px solid var(--border-subtle)",
        paddingBottom: "env(safe-area-inset-bottom, 0)",
        flexShrink: 0,
        zIndex: 20,
        overflowX: "auto",
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
              gap: 3,
              padding: "9px 1px 8px",
              minWidth: 0,
              color: active ? "var(--navy-700)" : "var(--fg-tertiary)",
              fontFamily: "var(--font-sans)",
              textDecoration: "none",
            }}
          >
            <Icon size={20} />
            <span style={{ fontSize: 9.5, fontWeight: active ? 700 : 500, whiteSpace: "nowrap" }}>
              {short}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
