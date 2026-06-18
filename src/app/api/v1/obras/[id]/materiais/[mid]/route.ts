import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; mid: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { mid } = await params;
  await prisma.materialObra.deleteMany({ where: { id: mid, empresaId: session.empresaId } });
  return NextResponse.json({ ok: true });
}
