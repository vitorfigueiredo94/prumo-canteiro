import { prisma } from "@/lib/prisma";
import path from "path";
import fs from "fs/promises";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export interface SalvarFotoInput {
  empresaId: string;
  obraId: string;
  etapa?: string;
  metadata?: Record<string, unknown>;
  file: File;
}

export async function salvarMedicaoFoto(input: SalvarFotoInput) {
  if (!ALLOWED_TYPES.has(input.file.type)) {
    throw new Error("Tipo de arquivo não suportado. Use JPEG, PNG ou WebP.");
  }
  if (input.file.size > MAX_SIZE_BYTES) {
    throw new Error("Arquivo excede o limite de 10 MB.");
  }

  const uploadsDir = path.resolve(process.cwd(), "public/uploads/medicoes");
  await fs.mkdir(uploadsDir, { recursive: true });

  const ext = input.file.name.split(".").pop() ?? "jpg";
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  await fs.writeFile(path.join(uploadsDir, fileName), Buffer.from(await input.file.arrayBuffer()));

  return prisma.medicaoFoto.create({
    data: {
      empresaId: input.empresaId,
      obraId: input.obraId,
      fotoUrl: `/uploads/medicoes/${fileName}`,
      etapa: input.etapa,
      metadata: JSON.stringify(input.metadata ?? {}),
    },
  });
}

export async function listarMedicoes(empresaId: string, obraId: string) {
  return prisma.medicaoFoto.findMany({
    where: { empresaId, obraId },
    orderBy: { criadoEm: "desc" },
  });
}
