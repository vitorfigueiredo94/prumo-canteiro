import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const UA = "PrumoCanteiro/2.3 (suporte@prumocanteiro.com.br)";

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

async function fetchNominatim(url: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, "Accept-Language": "pt-BR" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || !data[0]) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

// Limpa o endereço: pega só a parte antes de "-" ou "," (rua + número),
// descartando "grupo / apto / bloco" que o Nominatim não casa.
function ruaLimpa(endereco: string): string {
  return endereco.split(/[-,]/)[0].trim();
}

/**
 * Tenta geocodificar em ordem de precisão, parando no primeiro acerto:
 * 1. rua limpa + cidade (texto livre)
 * 2. CEP estruturado (postalcode)
 * 3. CEP + cidade (texto livre)
 * 4. só a cidade (último recurso — ao menos mostra a região)
 */
async function geocode(
  cep: string | null,
  endereco: string | null,
  cidade: string | null
): Promise<{ lat: number; lng: number } | null> {
  const base = "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br";
  const attempts: string[] = [];

  if (endereco && cidade) {
    const rua = ruaLimpa(endereco);
    if (rua) attempts.push(`${base}&q=${encodeURIComponent(`${rua}, ${cidade}, Brasil`)}`);
  }
  if (cep) {
    attempts.push(`${base}&postalcode=${encodeURIComponent(cep)}`);
    attempts.push(`${base}&q=${encodeURIComponent(`${cep}, ${cidade ?? ""}, Brasil`)}`);
  }
  if (cidade) attempts.push(`${base}&q=${encodeURIComponent(`${cidade}, Brasil`)}`);

  for (let i = 0; i < attempts.length; i++) {
    const coords = await fetchNominatim(attempts[i]);
    console.log(`[terreno-mapa] tentativa ${i + 1}/${attempts.length}: ${coords ? "ok" : "vazio"}`);
    if (coords) return coords;
    if (i < attempts.length - 1) await sleep(1100); // rate limit Nominatim: 1 req/s
  }
  return null;
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

  if (!terreno.cidade && !terreno.endereco && !terreno.cep) {
    return NextResponse.json({ lat: null, lng: null, nome: terreno.nome });
  }

  const coords = await geocode(terreno.cep, terreno.endereco, terreno.cidade);

  if (coords) {
    await prisma.terreno.update({
      where: { id: terreno.id },
      data: { lat: coords.lat, lng: coords.lng },
    });
    return NextResponse.json({ lat: coords.lat, lng: coords.lng, nome: terreno.nome });
  }

  console.log(`[terreno-mapa] geocoding falhou para "${terreno.nome}" (cep=${terreno.cep}, cidade=${terreno.cidade})`);
  return NextResponse.json({ lat: null, lng: null, nome: terreno.nome });
}
