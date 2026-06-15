import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { readFile } from "fs/promises";
import path from "path";

const CONTENT_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".png": "image/png", ".gif": "image/gif", ".webp": "image/webp",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".txt": "text/plain", ".xml": "application/xml",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const session = await getSession();
  if (!session) return new NextResponse("Não autenticado", { status: 401 });

  const { path: segments } = await params;
  // Expected: [empresaId, ownerType, ownerId, filename]
  if (segments.length !== 4) return new NextResponse("Not found", { status: 404 });

  const [empresaId, ownerType, ownerId, filename] = segments;

  // Multi-tenancy: ensure user belongs to this empresa
  if (empresaId !== session.empresaId) return new NextResponse("Proibido", { status: 403 });

  // Prevent path traversal
  const safeName = path.basename(filename);
  const dbUrl = process.env.DATABASE_URL || "file:/app/data/prumo.db";
  const dataDir = path.dirname(dbUrl.replace(/^file:/, ""));
  const filePath = path.join(dataDir, "uploads", empresaId, ownerType, ownerId, safeName);

  const buffer = await readFile(filePath).catch(() => null);
  if (!buffer) return new NextResponse("Not found", { status: 404 });

  const ext = path.extname(safeName).toLowerCase();
  const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${safeName}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
