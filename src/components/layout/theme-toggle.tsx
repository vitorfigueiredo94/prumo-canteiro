"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

const KEY = "prumocanteiro:theme";

function getTheme(): "dark" | "light" {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch {}
  return "light";
}

export function ThemeToggle({ size = 18 }: { size?: number }) {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const theme = getTheme();
    setDark(theme === "dark");
    document.documentElement.setAttribute("data-theme", theme);
    setMounted(true);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    const theme = next ? "dark" : "light";
    try { localStorage.setItem(KEY, theme); } catch {}
    document.documentElement.setAttribute("data-theme", theme);
  }

  // Não renderiza até hidratar para evitar mismatch de ícone
  if (!mounted) return <div style={{ width: size + 12, height: size + 12 }} />;

  return (
    <button
      onClick={toggle}
      title={dark ? "Mudar para tema claro" : "Mudar para tema escuro"}
      style={{
        background: "transparent",
        border: "none",
        cursor: "pointer",
        color: "var(--fg-tertiary)",
        padding: 6,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8,
        transition: "color 140ms, background 140ms",
      }}
      onMouseEnter={e => (e.currentTarget.style.background = "var(--ink-100)")}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
    >
      {dark ? <Sun size={size} /> : <Moon size={size} />}
    </button>
  );
}
