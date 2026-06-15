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
  if (!segments || segments.length < 2) return new NextResponse("Not found", { status: 404 });

  // Prevent path traversal
  if (segments.some((s) => s.includes(".."))) return new NextResponse("Bad request", { status: 400 });

  const [empresaId, ...rest] = segments;
  if (empresaId !== session.empresaId) return new NextResponse("Proibido", { status: 403 });

  const dbUrl = process.env.DATABASE_URL || "file:/app/data/prumo.db";
  const dataDir = path.dirname(dbUrl.replace(/^file:/, ""));
  const filePath = path.join(dataDir, "uploads", empresaId, ...rest);

  const buffer = await readFile(filePath).catch(() => null);
  if (!buffer) return new NextResponse("Not found", { status: 404 });

  const ext = path.extname(rest[rest.length - 1] ?? "").toLowerCase();
  const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";
  const filename = rest[rest.length - 1] ?? "file";

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
