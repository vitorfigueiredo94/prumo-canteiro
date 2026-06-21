"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import Link from "next/link";
import { Shield, LogOut, Phone, Check, Pencil, ImagePlus, X, Rocket } from "lucide-react";
import { logoutAction, salvarTelefoneGestor, salvarLogoEmpresa } from "@/app/(app)/actions";

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
function fmtFone(v: string) {
  const d = v.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return v;
}

export function UserMenu({ nome, email, superAdmin, telefoneGestor, logoEmpresa, planoNome, isTrial }: {
  nome: string; email: string; superAdmin: boolean;
  telefoneGestor: string | null; logoEmpresa: string | null;
  planoNome: string; isTrial: boolean;
}) {
  const [open, setOpen] = useState(false);

  // Telefone
  const [editingFone, setEditingFone] = useState(false);
  const [fone, setFone] = useState(telefoneGestor ?? "");
  const [foneSaved, setFoneSaved] = useState(false);

  // Logo
  const [logo, setLogo] = useState<string | null>(logoEmpresa);
  const [logoMsg, setLogoMsg] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setEditingFone(false);
      }
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const bg = avatarBg(nome);
  const ini = initials(nome);

  function handleSaveFone() {
    startTransition(async () => {
      await salvarTelefoneGestor(fone);
      setEditingFone(false);
      setFoneSaved(true);
      setTimeout(() => setFoneSaved(false), 2500);
    });
  }

  function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError(null);
    if (!file.type.startsWith("image/")) {
      setLogoError("Use uma imagem (PNG, JPG, SVG…)");
      return;
    }
    if (file.size > 400_000) {
      setLogoError("Imagem muito grande (máx. 400 KB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      startTransition(async () => {
        const r = await salvarLogoEmpresa(dataUrl);
        if (r.ok) {
          setLogo(dataUrl);
          setLogoMsg("✓ Logo salvo!");
          setTimeout(() => setLogoMsg(null), 2500);
        } else {
          setLogoError(r.error ?? "Erro ao salvar");
        }
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function handleRemoveLogo() {
    startTransition(async () => {
      await salvarLogoEmpresa(null);
      setLogo(null);
      setLogoMsg("Logo removido");
      setTimeout(() => setLogoMsg(null), 2000);
    });
  }

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
          minWidth: 272, overflow: "hidden",
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

          {/* Logo da empresa */}
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
              <ImagePlus size={11} /> Logo da empresa
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* Preview */}
              <div style={{
                width: 64, height: 40, borderRadius: 6,
                border: "1px solid var(--border-default)",
                background: "var(--bg-canvas)",
                display: "flex", alignItems: "center", justifyContent: "center",
                overflow: "hidden", flexShrink: 0,
              }}>
                {logo
                  ? <img src={logo} alt="Logo" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                  : <span style={{ fontSize: 10, color: "var(--fg-muted)", textAlign: "center", lineHeight: 1.3 }}>Sem logo</span>
                }
              </div>

              {/* Ações */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 0 }}>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleLogoFile}
                />
                <button
                  onClick={() => logoInputRef.current?.click()}
                  disabled={isPending}
                  style={{
                    height: 28, padding: "0 10px",
                    border: "1px solid var(--border-default)",
                    borderRadius: 6, background: "var(--bg-surface)",
                    color: "var(--fg-secondary)", fontSize: 12, fontWeight: 600,
                    cursor: "pointer", fontFamily: "var(--font-sans)",
                    display: "flex", alignItems: "center", gap: 5,
                    opacity: isPending ? 0.6 : 1,
                  }}
                >
                  <ImagePlus size={11} />
                  {isPending ? "Salvando…" : logo ? "Alterar logo" : "Enviar logo"}
                </button>
                {logo && (
                  <button
                    onClick={handleRemoveLogo}
                    disabled={isPending}
                    style={{
                      height: 24, padding: "0 8px",
                      border: "none", background: "transparent",
                      color: "var(--fg-muted)", fontSize: 11.5,
                      cursor: "pointer", fontFamily: "var(--font-sans)",
                      display: "flex", alignItems: "center", gap: 4, textAlign: "left",
                    }}
                  >
                    <X size={10} /> Remover logo
                  </button>
                )}
              </div>
            </div>

            {logoMsg && <p style={{ margin: "6px 0 0", fontSize: 11.5, color: "#16a34a", fontWeight: 600 }}>{logoMsg}</p>}
            {logoError && <p style={{ margin: "6px 0 0", fontSize: 11.5, color: "#dc2626" }}>{logoError}</p>}
            <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--fg-muted)", lineHeight: 1.4 }}>
              Aparece no cabeçalho dos contratos gerados. PNG, JPG ou SVG até 400 KB.
            </p>
          </div>

          {/* WhatsApp do gestor */}
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
              <Phone size={11} /> WhatsApp notificações
            </div>

            {editingFone ? (
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  autoFocus
                  value={fone}
                  onChange={e => setFone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  style={{
                    flex: 1, height: 32, padding: "0 10px",
                    border: "1px solid var(--border-default)",
                    borderRadius: 6, background: "var(--bg-canvas)",
                    color: "var(--fg-primary)", fontSize: 13,
                    fontFamily: "var(--font-sans)", outline: "none",
                  }}
                  onKeyDown={e => { if (e.key === "Enter") handleSaveFone(); if (e.key === "Escape") setEditingFone(false); }}
                />
                <button
                  onClick={handleSaveFone}
                  disabled={isPending}
                  style={{ width: 32, height: 32, border: "none", borderRadius: 6, background: "#16a34a", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                >
                  <Check size={14} />
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontSize: 13, color: fone ? "var(--fg-primary)" : "var(--fg-muted)", fontWeight: fone ? 500 : 400 }}>
                  {foneSaved ? "✓ Salvo!" : fone ? fmtFone(fone) : "Não configurado"}
                </span>
                <button
                  onClick={() => setEditingFone(true)}
                  style={{ width: 26, height: 26, border: "1px solid var(--border-subtle)", borderRadius: 6, background: "transparent", color: "var(--fg-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                >
                  <Pencil size={11} />
                </button>
              </div>
            )}
            <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--fg-muted)", lineHeight: 1.4 }}>
              Recebe cópia de cada cobrança disparada pelo sistema.
            </p>
          </div>

          {/* Plano e assinatura */}
          {!superAdmin && (
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-subtle)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                <Rocket size={11} /> Plano e assinatura
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontSize: 13, color: "var(--fg-primary)", fontWeight: 500 }}>
                  {planoNome}
                  {isTrial && <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, color: "#2563eb", background: "rgba(37,99,235,0.12)", padding: "2px 7px", borderRadius: 20 }}>Teste</span>}
                </span>
              </div>
              <Link
                href="/upgrade"
                onClick={() => setOpen(false)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                  marginTop: 9, height: 34, borderRadius: 8,
                  background: "#1e3a5f", color: "#fff", fontSize: 13, fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                <Rocket size={13} /> {isTrial ? "Assinar agora" : "Mudar de plano"}
              </Link>
            </div>
          )}

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
