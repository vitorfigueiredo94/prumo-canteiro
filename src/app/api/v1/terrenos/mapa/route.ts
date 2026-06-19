import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function geocodeNominatim(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=br`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "PrumoCanteiro/2.3 (suporte@prumocanteiro.com.br)",
        "Accept-Language": "pt-BR",
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || !data[0]) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const terrenos = await prisma.terreno.findMany({
    where: { empresaId: session.empresaId },
    select: { id: true, nome: true, endereco: true, cidade: true, cep: true, area: true, status: true, lat: true, lng: true },
    orderBy: { criadoEm: "asc" },
  });

  const result = [];
  let geocodingCount = 0;
  const MAX_GEOCODE_PER_REQUEST = 3;

  for (const t of terrenos) {
    const area = Number(t.area);
    const base = { id: t.id, nome: t.nome, cidade: t.cidade, area, status: t.status };

    if (t.lat != null && t.lng != null) {
      result.push({ ...base, lat: t.lat, lng: t.lng });
      continue;
    }

    if (!t.cidade || geocodingCount >= MAX_GEOCODE_PER_REQUEST) {
      result.push({ ...base, lat: null, lng: null });
      continue;
    }

    // Geocode via Nominatim and cache (CEP first for accuracy, fallback to endereco+cidade)
    const q = [(t as any).cep, t.endereco, t.cidade].filter(Boolean).join(", ");
    geocodingCount++;
    const coords = await geocodeNominatim(q);

    if (coords) {
      await prisma.terreno.update({
        where: { id: t.id },
        data: { lat: coords.lat, lng: coords.lng },
      });
      result.push({ ...base, lat: coords.lat, lng: coords.lng });
    } else {
      result.push({ ...base, lat: null, lng: null });
    }

    // Nominatim rate limit: 1 req/s
    await sleep(1100);
  }

  return NextResponse.json({ terrenos: result });
}
