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
const MARKER_ICON = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png";
const MARKER_ICON_2X = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png";
const MARKER_SHADOW = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png";

const STATUS_POPUP: Record<string, { label: string; bg: string; color: string }> = {
  disponivel: { label: "Disponível", bg: "#dcfce7", color: "#166534" },
  em_obra:    { label: "Em obra",    bg: "#fef3c7", color: "#92400e" },
  vendido:    { label: "Vendido",    bg: "#f1f5f9", color: "#475569" },
};

export function MapaTerrenos() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [fase, setFase] = useState<"init" | "geocoding" | "done" | "empty">("init");
  const [semGeo, setSemGeo] = useState<string[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    async function init() {
      // 1. Inject Leaflet CSS (CDN — avoids Next.js CSS bundle issues)
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

      // Fix default marker icon (webpack issue)
      // @ts-ignore
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({ iconUrl: MARKER_ICON, iconRetinaUrl: MARKER_ICON_2X, shadowUrl: MARKER_SHADOW });

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
        const s = STATUS_POPUP[t.status] ?? STATUS_POPUP.disponivel;
        L.marker(ll)
          .addTo(map)
          .bindPopup(
            `<div style="min-width:160px;font-family:sans-serif">
              <div style="font-size:15px;font-weight:700;margin-bottom:3px">${t.nome}</div>
              <div style="font-size:13px;color:#666;margin-bottom:6px">${t.cidade}</div>
              <div style="font-size:12px;color:#888">Área: ${t.area.toFixed(0)} m²</div>
              <span style="display:inline-block;margin-top:7px;padding:2px 9px;border-radius:12px;font-size:11px;font-weight:700;background:${s.bg};color:${s.color}">${s.label}</span>
            </div>`
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
