"use client";

import { useEffect, useRef, useState } from "react";

interface TerrenoMapa {
  id: string;
  nome: string;
  cidade: string;
  area: number;
  status: string;
  lat: number | null;
  lng: number | null;
}

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";

// Pin colors matching the design system tokens (hardcoded for Leaflet SVG)
const PIN_COLORS: Record<string, { fill: string; ring: string }> = {
  disponivel: { fill: "#16a34a", ring: "#15803d" }, // success-600/700
  em_obra:    { fill: "#d97706", ring: "#b45309" }, // warning-500/700
  vendido:    { fill: "#64748b", ring: "#475569" }, // slate-500/600
};

const STATUS_LABEL: Record<string, { label: string; bg: string; color: string }> = {
  disponivel: { label: "Disponível", bg: "#dcfce7", color: "#166534" },
  em_obra:    { label: "Em obra",    bg: "#fef3c7", color: "#92400e" },
  vendido:    { label: "Vendido",    bg: "#f1f5f9", color: "#475569" },
};

function makePinSvg(status: string): string {
  const { fill, ring } = PIN_COLORS[status] ?? PIN_COLORS.disponivel;
  // Teardrop shape: circle top + pointed bottom, 24×32 viewBox
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 24 32">`,
    `<path d="M12 0C5.37 0 0 5.37 0 12c0 8.25 12 20 12 20S24 20.25 24 12C24 5.37 18.63 0 12 0z"`,
    ` fill="${fill}" stroke="${ring}" stroke-width="1.5"/>`,
    `<circle cx="12" cy="11" r="4.5" fill="white" opacity="0.85"/>`,
    `</svg>`,
  ].join("");
}

export function MapaTerrenos() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [fase, setFase] = useState<"init" | "geocoding" | "done" | "empty">("init");
  const [semGeo, setSemGeo] = useState<string[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    async function init() {
      // 1. Inject Leaflet CSS
      if (!document.getElementById("leaflet-css")) {
        await new Promise<void>((resolve) => {
          const link = document.createElement("link");
          link.id = "leaflet-css";
          link.rel = "stylesheet";
          link.href = LEAFLET_CSS;
          link.onload = () => resolve();
          link.onerror = () => resolve();
          document.head.appendChild(link);
        });
      }

      if (cancelled || !containerRef.current) return;

      // 2. Dynamic import of Leaflet (avoids SSR)
      const L = (await import("leaflet")).default;
      if (cancelled) return;

      // 3. Initialize map centered on Brazil
      const map = L.map(containerRef.current).setView([-15.78, -47.93], 4);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // 4. Fetch geocoded terrenos from server
      setFase("geocoding");
      const res = await fetch("/api/v1/terrenos/mapa");
      if (cancelled) return;

      const data = await res.json();
      const terrenos: TerrenoMapa[] = data.terrenos ?? [];

      if (terrenos.length === 0) { setFase("empty"); return; }

      const comCoords = terrenos.filter((t) => t.lat != null && t.lng != null);
      setSemGeo(terrenos.filter((t) => t.lat == null).map((t) => t.nome));

      const bounds: [number, number][] = [];

      for (const t of comCoords) {
        const ll: [number, number] = [t.lat!, t.lng!];
        bounds.push(ll);

        const s = STATUS_LABEL[t.status] ?? STATUS_LABEL.disponivel;

        // Colored SVG pin via divIcon
        const icon = L.divIcon({
          html: makePinSvg(t.status),
          iconSize: [24, 32],
          iconAnchor: [12, 32],
          popupAnchor: [0, -34],
          className: "",
        });

        L.marker(ll, { icon })
          .addTo(map)
          .bindPopup(
            `<div style="min-width:170px;font-family:system-ui,sans-serif;padding:2px 0">
              <div style="font-size:14.5px;font-weight:700;color:#0f172a;margin-bottom:2px">${t.nome}</div>
              <div style="font-size:12.5px;color:#64748b;margin-bottom:8px">${t.cidade} · ${t.area.toFixed(0)} m²</div>
              <span style="display:inline-block;padding:2px 10px;border-radius:20px;font-size:11.5px;font-weight:700;background:${s.bg};color:${s.color}">${s.label}</span>
            </div>`,
            { maxWidth: 240 }
          );
      }

      if (bounds.length === 1) map.setView(bounds[0], 14);
      else if (bounds.length > 1) map.fitBounds(bounds as any, { padding: [60, 60] });

      setFase("done");
    }

    init().catch(console.error);

    return () => {
      cancelled = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  const MSG: Record<string, string> = {
    init:      "Carregando mapa…",
    geocoding: "Geocodificando endereços — pode levar alguns segundos para novos terrenos…",
  };

  return (
    <div>
      {(fase === "init" || fase === "geocoding") && (
        <p style={{ textAlign: "center", padding: "14px 0 10px", fontSize: 14, color: "var(--fg-tertiary)", margin: 0 }}>
          {MSG[fase]}
        </p>
      )}

      {/* Legend */}
      {(fase === "done" || fase === "geocoding") && (
        <div style={{ display: "flex", gap: 16, marginBottom: 12, flexWrap: "wrap" }}>
          {Object.entries(STATUS_LABEL).map(([key, s]) => (
            <div key={key} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--fg-secondary)" }}>
              <span
                dangerouslySetInnerHTML={{ __html: makePinSvg(key) }}
                style={{ display: "inline-block", width: 16, height: 21, verticalAlign: "middle" }}
              />
              {s.label}
            </div>
          ))}
        </div>
      )}

      <div
        ref={containerRef}
        style={{ height: 520, borderRadius: "var(--radius-lg)", border: "1px solid var(--border-subtle)", overflow: "hidden", background: "var(--ink-50)" }}
      />

      {fase === "done" && semGeo.length > 0 && (
        <p style={{ margin: "10px 0 0", fontSize: 13, color: "var(--fg-tertiary)" }}>
          Sem localização: {semGeo.join(", ")}. Preencha o endereço completo para aparecer no mapa.
        </p>
      )}
      {fase === "empty" && (
        <p style={{ margin: "16px 0 0", textAlign: "center", fontSize: 15, color: "var(--fg-tertiary)" }}>
          Nenhum terreno cadastrado ainda.
        </p>
      )}
    </div>
  );
}
