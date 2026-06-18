import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listarQrCodes } from "@/features/qrcode-insumos/service";
import { prisma } from "@/lib/prisma";
import { InsumosView } from "./insumos-view";

export const metadata: Metadata = { title: "Insumos & QR Codes" };

export default async function InsumosPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [insumos, obras] = await Promise.all([
    listarQrCodes(session.empresaId),
    prisma.obra.findMany({
      where: { empresaId: session.empresaId },
      select: { id: true, nome: true },
      orderBy: { nome: "asc" },
    }),
  ]);

  return (
    <InsumosView
      insumos={insumos.map((i) => ({
        id: i.id,
        nome: i.nome,
        tipo: i.tipo,
        descricao: i.descricao ?? null,
        obraId: i.obraId ?? null,
        qrImageUrl: i.qrImageUrl ?? null,
        codigo: i.codigo,
        criadoEm: i.criadoEm.toISOString(),
      }))}
      obras={obras}
    />
  );
}
