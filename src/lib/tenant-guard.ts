import { prisma } from "@/lib/prisma";

export class TenantViolationError extends Error {
  readonly status = 403;
  constructor(resource: string, id: string) {
    super(`IDOR_DENIED: ${resource}/${id} does not belong to this empresa`);
    this.name = "TenantViolationError";
  }
}

type ResourceType =
  | "checklist"
  | "obra"
  | "terreno"
  | "venda"
  | "parcela"
  | "funcionario"
  | "nota_fiscal"
  | "diario"
  | "chamado"
  | "documento";

async function resolveEmpresaId(type: ResourceType, id: string): Promise<string | null> {
  switch (type) {
    case "checklist":
      return (await prisma.checklist.findUnique({ where: { id }, select: { empresaId: true } }))?.empresaId ?? null;
    case "obra":
      return (await prisma.obra.findUnique({ where: { id }, select: { empresaId: true } }))?.empresaId ?? null;
    case "terreno":
      return (await prisma.terreno.findUnique({ where: { id }, select: { empresaId: true } }))?.empresaId ?? null;
    case "venda":
      return (await prisma.venda.findUnique({ where: { id }, select: { empresaId: true } }))?.empresaId ?? null;
    case "parcela": {
      const p = await prisma.parcela.findUnique({ where: { id }, select: { venda: { select: { empresaId: true } } } });
      return p?.venda?.empresaId ?? null;
    }
    case "funcionario":
      return (await prisma.funcionario.findUnique({ where: { id }, select: { empresaId: true } }))?.empresaId ?? null;
    case "nota_fiscal":
      return (await prisma.notaFiscal.findUnique({ where: { id }, select: { empresaId: true } }))?.empresaId ?? null;
    case "diario":
      return (await prisma.diarioObra.findUnique({ where: { id }, select: { empresaId: true } }))?.empresaId ?? null;
    case "chamado":
      return (await prisma.chamadoAssistencia.findUnique({ where: { id }, select: { empresaId: true } }))?.empresaId ?? null;
    case "documento":
      return (await prisma.documento.findUnique({ where: { id }, select: { empresaId: true } }))?.empresaId ?? null;
    default:
      return null;
  }
}

export async function assertTenantOwnership(
  sessionEmpresaId: string,
  type: ResourceType,
  resourceId: string
): Promise<void> {
  const owner = await resolveEmpresaId(type, resourceId);
  if (owner === null || owner !== sessionEmpresaId) {
    throw new TenantViolationError(type, resourceId);
  }
}
