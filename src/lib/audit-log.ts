import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";
import type { Action, Resource } from "@/lib/rbac";

interface AuditContext {
  empresaId: string;
  userId: string;
  ip?: string | null;
}

export async function logAudit(
  ctx: AuditContext,
  action: Action,
  resourceType: Resource,
  resourceId: string | null,
  result: "allowed" | "denied"
): Promise<void> {
  const ipHash = ctx.ip
    ? createHash("sha256").update(ctx.ip).digest("hex").slice(0, 16)
    : null;

  // fire-and-forget — não bloqueia a request
  prisma.$queryRawUnsafe(
    `INSERT INTO "security_audit_logs"
       ("id","empresaId","userId","action","resourceType","resourceId","result","ipHash","criadoEm")
     VALUES (lower(hex(randomblob(16))),?,?,?,?,?,?,?,CURRENT_TIMESTAMP)`,
    ctx.empresaId,
    ctx.userId,
    action,
    resourceType,
    resourceId ?? null,
    result,
    ipHash
  ).catch(() => {
    // nunca lançar — log é best-effort
  });
}
