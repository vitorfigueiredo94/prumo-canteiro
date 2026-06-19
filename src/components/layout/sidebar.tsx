"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
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
  QrCode,
  Package,
  Bell,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  Lock,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { logoutAction } from "@/app/(app)/actions";
import type { PlanoInfo } from "@/lib/plano";

// Itens que exigem recurso específico (slug do plano)
const NAV_ITEMS = [
  { href: "/dashboard",     label: "Visão geral",   icon: LayoutDashboard, recurso: null },
  { href: "/obras",         label: "Obras",         icon: Building2,       recurso: null },
  { href: "/funcionarios",  label: "Funcionários",  icon: Users,           recurso: null },
  { href: "/financeiro",    label: "Financeiro",    icon: Wallet,          recurso: "fluxo_caixa" },
  { href: "/notas",         label: "Notas fiscais", icon: ReceiptText,     recurso: null },
  { href: "/vendas",        label: "Vendas",        icon: Handshake,       recurso: "vendas" },
  { href: "/compradores",   label: "Compradores",   icon: UserCheck,       recurso: "vendas" },
  { href: "/terrenos",      label: "Terrenos",      icon: MapPinned,       recurso: null },
  { href: "/diario",        label: "Diário",        icon: BookOpen,        recurso: "diario" },
  { href: "/assistencia",   label: "Pós-obra",      icon: Wrench,          recurso: null },
  { href: "/insumos",       label: "Insumos & QR",  icon: QrCode,          recurso: null },
  { href: "/materiais",     label: "Materiais",     icon: Package,         recurso: null },
  { href: "/alertas",             label: "Alertas",           icon: Bell,        recurso: null },
  { href: "/tokens",              label: "Portal do cliente",  icon: ExternalLink, recurso: null },
  { href: "/configuracoes/equipe", label: "Equipe",            icon: UserPlus,    recurso: null },
];

interface SidebarProps {
  empresaNome: string;
  plano: PlanoInfo;
  logoEmpresa?: string | null;
}

export function Sidebar({ empresaNome, plano, logoEmpresa }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const [alertas, setAlertas] = useState({ atrasadas: 0, vencendoHoje: 0, vencendo7dias: 0 });

  useEffect(() => {
    fetch("/api/v1/alertas")
      .then((r) => r.json())
      .then((d) => { if (d && typeof d.atrasadas === "number") setAlertas(d); })
      .catch(() => null);
  }, [pathname]);

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
    return pathname.startsWith(href);
  }

  function isLocked(recurso: string | null): boolean {
    if (!recurso) return false;
    if (plano.isTrial) return false;
    return !plano.recursos.includes(recurso);
  }

  const obrasPct = plano.limiteObras != null ? null : null; // badge calculado no server

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
        {logoEmpresa && !collapsed
          ? <img src={logoEmpresa} alt="Logo" style={{ maxHeight: 36, maxWidth: 120, objectFit: "contain", borderRadius: 4, flexShrink: 0 }} />
          : <Logo size={34} />
        }
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
        {NAV_ITEMS.map(({ href, label, icon: Icon, recurso }) => {
          const active = isActive(href);
          const locked = isLocked(recurso);
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? (locked ? `${label} — Upgrade necessário` : label) : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                width: "100%",
                padding: collapsed ? "11px 0" : "11px 12px",
                justifyContent: collapsed ? "center" : "flex-start",
                marginBottom: 3,
                background: active ? "rgba(212,162,76,0.14)" : "transparent",
                color: locked ? "rgba(255,255,255,0.35)" : active ? "#fff" : "rgba(255,255,255,0.78)",
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
              {!collapsed && (
                <>
                  <span style={{ flex: 1 }}>{label}</span>
                  {href === "/compradores" && (alertas.atrasadas + alertas.vencendoHoje) > 0 && (
                    <span style={{ minWidth: 18, height: 18, padding: "0 5px", borderRadius: 9, background: alertas.atrasadas > 0 ? "#dc2626" : "#d97706", color: "#fff", fontSize: 10.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {alertas.atrasadas + alertas.vencendoHoje}
                    </span>
                  )}
                  {href === "/alertas" && (alertas.atrasadas + alertas.vencendoHoje) > 0 && (
                    <span style={{ minWidth: 18, height: 18, padding: "0 5px", borderRadius: 9, background: alertas.atrasadas > 0 ? "#dc2626" : "#d97706", color: "#fff", fontSize: 10.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {alertas.atrasadas + alertas.vencendoHoje}
                    </span>
                  )}
                  {locked && <Lock size={12} style={{ flexShrink: 0, opacity: 0.6 }} />}
                </>
              )}
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
