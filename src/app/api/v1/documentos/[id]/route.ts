import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unlink } from "fs/promises";
import path from "path";

function getFilePath(url: string): string {
  // url: /api/v1/uploads/{empresaId}/{ownerType}/{ownerId}/{filename}
  const dbUrl = process.env.DATABASE_URL || "file:/app/data/prumo.db";
  const dataDir = path.dirname(dbUrl.replace(/^file:/, ""));
  const segments = url.replace("/api/v1/uploads/", "").split("/");
  return path.join(dataDir, "uploads", ...segments);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const doc = await prisma.documento.findFirst({ where: { id, empresaId: session.empresaId } });
  if (!doc) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  await prisma.documento.delete({ where: { id } });
  await unlink(getFilePath(doc.url)).catch(() => null);

  return NextResponse.json({ ok: true });
}
