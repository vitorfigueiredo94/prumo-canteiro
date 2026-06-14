import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { buscarQrCode, desativarQrCode } from "@/features/qrcode-insumos/service";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const qr = await buscarQrCode(session.empresaId, id);
  if (!qr) return NextResponse.json({ error: "QR Code não encontrado" }, { status: 404 });
  return NextResponse.json(qr);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  await desativarQrCode(session.empresaId, id);
  return new NextResponse(null, { status: 204 });
}
