"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { dispararCobranca } from "@/lib/cobranca-service";

export async function cobrarTodosEmAtraso(): Promise<{
  ok: number; pulados: number; erro: number; semFone: number;
}> {
  const session = await getSession();
  if (!session) return { ok: 0, pulados: 0, erro: 0, semFone: 0 };

  const eid = session.empresaId;
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const limite24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Todas as parcelas em atraso desta empresa
  const parcelas = await prisma.parcela.findMany({
    where: {
      status: { not: "paga" },
      vencimento: { lt: hoje },
      venda: { empresaId: eid },
    },
    select: {
      id: true, numero: true, valor: true, vencimento: true,
      venda: { select: { id: true, empresaId: true, nomeComprador: true, telefoneComprador: true } },
    },
  });

  if (parcelas.length === 0) return { ok: 0, pulados: 0, erro: 0, semFone: 0 };

  // Já notificadas nas últimas 24h (evita disparo duplo)
  const logs = await prisma.cobrancaLog.findMany({
    where: {
      empresaId: eid,
      tipo: "aviso_atraso",
      criadoEm: { gte: limite24h },
    },
    select: { parcelaId: true },
  });
  const jaEnviados = new Set(logs.map((l: { parcelaId: string }) => l.parcelaId));

  let ok = 0, pulados = 0, erro = 0, semFone = 0;

  for (const p of parcelas) {
    if (jaEnviados.has(p.id)) { pulados++; continue; }
    if (!p.venda.telefoneComprador) { semFone++; continue; }

    const result = await dispararCobranca({ ...p, valor: Number(p.valor) }, "aviso_atraso");
    if (result.ok) ok++;
    else if (result.reason === "sem_telefone") semFone++;
    else erro++;
  }

  return { ok, pulados, erro, semFone };
}
