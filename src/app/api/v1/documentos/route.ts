import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { assertFileType, FileTypeError } from "@/lib/file-guard";

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

  // Allowlist para ownerType — previne path traversal
  const ALLOWED_OWNER_TYPES = new Set(["obra", "terreno", "venda"]);
  if (!ALLOWED_OWNER_TYPES.has(ownerType)) {
    return NextResponse.json({ error: "ownerType inválido" }, { status: 400 });
  }
  // Sanidade do ownerId — apenas caracteres de cuid (alfanumérico + hífen)
  if (!/^[a-zA-Z0-9_-]{1,40}$/.test(ownerId)) {
    return NextResponse.json({ error: "ownerId inválido" }, { status: 400 });
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Arquivo maior que 10 MB" }, { status: 400 });
  }

  try {
    await assertFileType(file, ["pdf", "xml", "image"]);
  } catch (e) {
    if (e instanceof FileTypeError) return NextResponse.json({ error: e.message }, { status: 415 });
    throw e;
  }

  const ext = path.extname(file.name).toLowerCase();
  const safeName = `${randomUUID()}${ext}`;
  const dir = uploadsPath(session.empresaId, ownerType, ownerId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, safeName), Buffer.from(await file.arrayBuffer()));

  // URL encodes the full path for the serve route
  const url = `/api/v1/uploads/${session.empresaId}/${ownerType}/${ownerId}/${safeName}`;

  const data: Prisma.DocumentoUncheckedCreateInput = {
    empresaId: session.empresaId,
    ownerType,
    nome: file.name,
    tipo: file.type || "application/octet-stream",
    tamanho: file.size,
    url,
    obraId: ownerType === "obra" ? ownerId : undefined,
    terrenoId: ownerType === "terreno" ? ownerId : undefined,
    vendaId: ownerType === "venda" ? ownerId : undefined,
  };

  const doc = await prisma.documento.create({ data });
  return NextResponse.json({ documento: doc }, { status: 201 });
}
