import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export interface PortalSession {
  empresaId: string;
  tokenId: string;
  nome: string;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function verifyPortalToken(req: NextRequest): Promise<PortalSession | null> {
  const raw = req.headers.get("x-portal-token");
  if (!raw) return null;

  const record = await prisma.portalClienteToken.findFirst({
    where: { tokenHash: hashToken(raw), ativo: true },
  });

  if (!record) return null;
  if (record.expiraEm && record.expiraEm < new Date()) return null;

  // fire-and-forget last use update
  prisma.portalClienteToken
    .update({ where: { id: record.id }, data: { ultimoUso: new Date() } })
    .catch(() => {});

  return { empresaId: record.empresaId, tokenId: record.id, nome: record.nome };
}

export async function criarPortalToken(empresaId: string, nome: string, expiraEm?: Date) {
  const token = randomBytes(32).toString("hex");
  const record = await prisma.portalClienteToken.create({
    data: { empresaId, nome, tokenHash: hashToken(token), expiraEm },
  });
  // token raw é retornado UMA VEZ — nunca fica armazenado em texto plano
  return { id: record.id, nome: record.nome, expiraEm: record.expiraEm, token };
}

export async function listarTokens(empresaId: string) {
  return prisma.portalClienteToken.findMany({
    where: { empresaId },
    select: { id: true, nome: true, ativo: true, expiraEm: true, ultimoUso: true, criadoEm: true },
    orderBy: { criadoEm: "desc" },
  });
}

export async function revogarToken(empresaId: string, id: string) {
  return prisma.portalClienteToken.updateMany({
    where: { id, empresaId },
    data: { ativo: false },
  });
}
