"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

const KEY = "prumocanteiro:theme";

export function ThemeToggle({ size = 18 }: { size?: number }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.getAttribute("data-theme") === "dark");
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    try { localStorage.setItem(KEY, next ? "dark" : "light"); } catch {}
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
  }

  return (
    <button
      onClick={toggle}
      title={dark ? "Tema claro" : "Tema escuro"}
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
