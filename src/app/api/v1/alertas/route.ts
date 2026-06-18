import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const em7dias = new Date(hoje);
  em7dias.setDate(hoje.getDate() + 7);

  const amanha = new Date(hoje);
  amanha.setDate(hoje.getDate() + 1);

  const [atrasadas, vencendoHoje, vencendo7dias] = await Promise.all([
    prisma.parcela.count({
      where: {
        venda: { empresaId: session.empresaId },
        status: "aberta",
        vencimento: { lt: hoje },
      },
    }),
    prisma.parcela.count({
      where: {
        venda: { empresaId: session.empresaId },
        status: "aberta",
        vencimento: { gte: hoje, lt: amanha },
      },
    }),
    prisma.parcela.count({
      where: {
        venda: { empresaId: session.empresaId },
        status: "aberta",
        vencimento: { gte: amanha, lt: em7dias },
      },
    }),
  ]);

  return NextResponse.json({ atrasadas, vencendoHoje, vencendo7dias });
}
