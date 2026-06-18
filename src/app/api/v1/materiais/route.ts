import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const materiais = await prisma.materialObra.findMany({
    where: { empresaId: session.empresaId },
    orderBy: { criadoEm: "desc" },
  });

  const serialized = materiais.map((m) => ({
    ...m,
    quantidade: Number(m.quantidade),
    valorUnit:  Number(m.valorUnit),
    data:       m.data?.toISOString() ?? null,
  }));

  return NextResponse.json({ materiais: serialized });
}
