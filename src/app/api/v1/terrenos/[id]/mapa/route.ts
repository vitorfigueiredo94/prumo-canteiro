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

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const terreno = await prisma.terreno.findFirst({
    where: { id, empresaId: session.empresaId },
    select: { id: true, nome: true, endereco: true, cidade: true, cep: true, lat: true, lng: true },
  });

  if (!terreno) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  // Já geocodificado → retorna do cache
  if (terreno.lat != null && terreno.lng != null) {
    return NextResponse.json({ lat: terreno.lat, lng: terreno.lng, nome: terreno.nome });
  }

  // Sem cidade/endereço → não tem como localizar
  if (!terreno.cidade && !terreno.endereco && !terreno.cep) {
    return NextResponse.json({ lat: null, lng: null, nome: terreno.nome });
  }

  // Geocodifica (CEP primeiro pra precisão, depois endereço + cidade) e cacheia
  const q = [terreno.cep, terreno.endereco, terreno.cidade].filter(Boolean).join(", ");
  const coords = await geocodeNominatim(q);

  if (coords) {
    await prisma.terreno.update({
      where: { id: terreno.id },
      data: { lat: coords.lat, lng: coords.lng },
    });
    return NextResponse.json({ lat: coords.lat, lng: coords.lng, nome: terreno.nome });
  }

  return NextResponse.json({ lat: null, lng: null, nome: terreno.nome });
}
