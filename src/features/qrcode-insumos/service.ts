import { randomUUID } from "crypto";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import path from "path";
import fs from "fs/promises";

export interface CriarQrCodeInput {
  empresaId: string;
  nome: string;
  tipo?: "insumo" | "equipamento";
  descricao?: string;
  obraId?: string;
}

export async function criarQrCode(input: CriarQrCodeInput) {
  const codigo = randomUUID();
  const uploadsDir = path.resolve(process.cwd(), "public/uploads/qrcodes");
  await fs.mkdir(uploadsDir, { recursive: true });

  const fileName = `${codigo}.png`;
  await QRCode.toFile(path.join(uploadsDir, fileName), codigo, { width: 300 });

  return prisma.qrCodeInsumo.create({
    data: {
      empresaId: input.empresaId,
      codigo,
      nome: input.nome,
      tipo: input.tipo ?? "insumo",
      descricao: input.descricao,
      obraId: input.obraId,
      qrImageUrl: `/uploads/qrcodes/${fileName}`,
    },
  });
}

export async function listarQrCodes(empresaId: string) {
  return prisma.qrCodeInsumo.findMany({
    where: { empresaId, ativo: true },
    orderBy: { criadoEm: "desc" },
  });
}

export async function buscarQrCode(empresaId: string, id: string) {
  return prisma.qrCodeInsumo.findFirst({ where: { id, empresaId } });
}

export async function desativarQrCode(empresaId: string, id: string) {
  return prisma.qrCodeInsumo.updateMany({
    where: { id, empresaId },
    data: { ativo: false },
  });
}
