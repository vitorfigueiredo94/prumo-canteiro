"use client";

import { useEffect, useRef, useState } from "react";

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";

const PIN_COLORS: Record<string, { fill: string; ring: string }> = {
  disponivel: { fill: "#16a34a", ring: "#15803d" },
  em_obra:    { fill: "#d97706", ring: "#b45309" },
  vendido:    { fill: "#64748b", ring: "#475569" },
};

function makePinSvg(status: string): string {
  const { fill, ring } = PIN_COLORS[status] ?? PIN_COLORS.disponivel;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 24 32">`,
    `<path d="M12 0C5.37 0 0 5.37 0 12c0 8.25 12 20 12 20S24 20.25 24 12C24 5.37 18.63 0 12 0z"`,
    ` fill="${fill}" stroke="${ring}" stroke-width="1.5"/>`,
    `<circle cx="12" cy="11" r="4.5" fill="white" opacity="0.85"/>`,
    `</svg>`,
  ].join("");
}

export function MapaTerreno({ terrenoId, nome, status }: { terrenoId: string; nome: string; status: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [fase, setFase] = useState<"loading" | "done" | "sem-local">("loading");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    async function init() {
      // 1. Busca coordenadas (geocodifica + cacheia no servidor se preciso)
      const res = await fetch(`/api/v1/terrenos/${terrenoId}/mapa`);
      if (cancelled) return;
      const data = await res.json();

      if (data.lat == null || data.lng == null) {
        setFase("sem-local");
        return;
      }
      setCoords({ lat: data.lat, lng: data.lng });

      // 2. Injeta CSS do Leaflet
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

      // 3. Inicializa o mapa centrado no terreno
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current, { scrollWheelZoom: false }).setView([data.lat, data.lng], 15);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const icon = L.divIcon({
        html: makePinSvg(status),
        iconSize: [24, 32],
        iconAnchor: [12, 32],
        className: "",
      });
      L.marker([data.lat, data.lng], { icon }).addTo(map);

      setFase("done");
    }

    init().catch(() => setFase("sem-local"));

    return () => {
      cancelled = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, [terrenoId, status]);

  if (fase === "sem-local") {
    return (
      <div style={{ background: "var(--ink-50)", border: "1px dashed var(--border-default)", borderRadius: "var(--radius-md)", padding: "20px 16px", textAlign: "center", fontSize: 13, color: "var(--fg-tertiary)" }}>
        Não foi possível localizar este terreno no mapa. Preencha o <strong>CEP</strong> ou o endereço completo no botão Editar.
      </div>
    );
  }

  return (
    <div>
      {fase === "loading" && (
        <p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--fg-tertiary)" }}>Carregando localização…</p>
      )}
      <div
        ref={containerRef}
        style={{ height: 280, borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)", overflow: "hidden", background: "var(--ink-50)" }}
      />
      {coords && (
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 8, fontSize: 13, color: "var(--navy-700)", fontWeight: 600, textDecoration: "none" }}
        >
          🗺️ Abrir no Google Maps →
        </a>
      )}
    </div>
  );
}
