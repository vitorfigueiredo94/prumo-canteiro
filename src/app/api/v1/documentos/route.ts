import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

function uploadsPath(empresaId: string, ownerType: string, ownerId: string): string {
  const dbUrl = process.env.DATABASE_URL || "file:/app/data/prumo.db";
  const dataDir = path.dirname(dbUrl.replace(/^file:/, ""));
  return path.join(dataDir, "uploads", empresaId, ownerType, ownerId);
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const ownerType = searchParams.get("ownerType") ?? "";
  const ownerId = searchParams.get("ownerId") ?? "";

  const where: Record<string, string> = { empresaId: session.empresaId, ownerType };
  if (ownerType === "obra") where.obraId = ownerId;
  else if (ownerType === "terreno") where.terrenoId = ownerId;
  else if (ownerType === "venda") where.vendaId = ownerId;

  const documentos = await prisma.documento.findMany({ where, orderBy: { criadoEm: "desc" } });
  return NextResponse.json({ documentos });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const fd = await req.formData();
  const file = fd.get("file") as File | null;
  const ownerType = fd.get("ownerType") as string;
  const ownerId = fd.get("ownerId") as string;

  if (!file || !ownerType || !ownerId) {
    return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Arquivo maior que 10 MB" }, { status: 400 });
  }

  const ext = path.extname(file.name).toLowerCase();
  const safeName = `${randomUUID()}${ext}`;
  const dir = uploadsPath(session.empresaId, ownerType, ownerId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, safeName), Buffer.from(await file.arrayBuffer()));

  // URL encodes the full path for the serve route
  const url = `/api/v1/uploads/${session.empresaId}/${ownerType}/${ownerId}/${safeName}`;

  const data: Record<string, unknown> = {
    empresaId: session.empresaId,
    ownerType,
    nome: file.name,
    tipo: file.type || "application/octet-stream",
    tamanho: file.size,
    url,
  };
  if (ownerType === "obra") data.obraId = ownerId;
  else if (ownerType === "terreno") data.terrenoId = ownerId;
  else if (ownerType === "venda") data.vendaId = ownerId;

  const doc = await prisma.documento.create({ data });
  return NextResponse.json({ documento: doc }, { status: 201 });
}
