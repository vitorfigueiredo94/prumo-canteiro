"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  LayoutDashboard,
  Building2,
  Users,
  UserCheck,
  UserPlus,
  Wallet,
  ReceiptText,
  Handshake,
  MapPinned,
  BookOpen,
  Wrench,
  ExternalLink,
  Package,
  Bell,
} from "lucide-react";

// Todas as seções (espelha a Sidebar do desktop)
const ALL_ITEMS = [
  { href: "/dashboard",            label: "Visão geral",       icon: LayoutDashboard },
  { href: "/obras",                label: "Obras",             icon: Building2 },
  { href: "/financeiro",           label: "Financeiro",        icon: Wallet },
  { href: "/vendas",               label: "Vendas",            icon: Handshake },
  { href: "/compradores",          label: "Compradores",       icon: UserCheck },
  { href: "/funcionarios",         label: "Funcionários",      icon: Users },
  { href: "/notas",                label: "Notas fiscais",     icon: ReceiptText },
  { href: "/terrenos",             label: "Terrenos",          icon: MapPinned },
  { href: "/diario",               label: "Diário",            icon: BookOpen },
  { href: "/assistencia",          label: "Pós-obra",          icon: Wrench },
  { href: "/materiais",            label: "Materiais",         icon: Package },
  { href: "/alertas",              label: "Alertas",           icon: Bell },
  { href: "/tokens",               label: "Portal do cliente", icon: ExternalLink },
  { href: "/configuracoes/equipe", label: "Equipe & acessos",  icon: UserPlus },
];

export function MobileMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <>
      {/* Botão hambúrguer — só no mobile/tablet */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Abrir menu"
        className="lg:hidden"
        style={{ width: 42, height: 42, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "var(--radius-md)", border: "none", background: "transparent", color: "var(--fg-secondary)", cursor: "pointer", flexShrink: 0 }}
      >
        <Menu size={24} />
      </button>

      {/* Gaveta lateral */}
      {open && (
        <div
          className="cnt-fade"
          onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(7,24,46,0.45)" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed", top: 0, bottom: 0, left: 0, width: "82%", maxWidth: 320,
              background: "var(--navy-700)", color: "#fff", display: "flex", flexDirection: "column",
              boxShadow: "4px 0 32px rgba(0,0,0,0.3)", animation: "cnt-slide-in 240ms var(--ease-soft)",
            }}
          >
            {/* Cabeçalho */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 16px", borderBottom: "1px solid rgba(255,255,255,0.1)", flexShrink: 0 }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 500, letterSpacing: "-0.01em" }}>PrumoCanteiro</span>
              <button onClick={() => setOpen(false)} aria-label="Fechar menu" style={{ width: 38, height: 38, borderRadius: "var(--radius-md)", border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <X size={18} />
              </button>
            </div>

            {/* Lista de seções */}
            <nav style={{ flex: 1, overflowY: "auto", padding: "10px 10px calc(env(safe-area-inset-bottom, 0px) + 16px)" }}>
              {ALL_ITEMS.map(({ href, label, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    style={{
                      display: "flex", alignItems: "center", gap: 13, minHeight: 50, padding: "0 12px",
                      marginBottom: 2, borderRadius: "var(--radius-md)",
                      background: active ? "rgba(212,162,76,0.16)" : "transparent",
                      color: active ? "#fff" : "rgba(255,255,255,0.82)",
                      borderLeft: `3px solid ${active ? "var(--gold-400)" : "transparent"}`,
                      textDecoration: "none", fontSize: 15, fontWeight: active ? 600 : 500,
                    }}
                  >
                    <Icon size={20} style={{ flexShrink: 0 }} /> {label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
