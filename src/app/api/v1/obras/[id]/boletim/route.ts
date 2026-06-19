import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await params;

  const [servicos, medicoes] = await Promise.all([
    prisma.bolServico.findMany({
      where: { obraId: id, empresaId: session.empresaId },
      orderBy: [{ ordem: "asc" }, { criadoEm: "asc" }],
    }),
    prisma.medicao.findMany({
      where: { obraId: id, empresaId: session.empresaId },
      orderBy: { numero: "asc" },
    }),
  ]);

  const linhas = servicos.length > 0
    ? await prisma.medicaoLinha.findMany({
        where: { servicoId: { in: servicos.map((s) => s.id) } },
      })
    : [];

  return NextResponse.json({
    servicos: servicos.map((s) => ({
      ...s,
      qtdeContratada: Number(s.qtdeContratada),
      valorUnit: Number(s.valorUnit),
    })),
    medicoes: medicoes.map((m) => ({
      ...m,
      data: m.data.toISOString(),
      criadoEm: m.criadoEm.toISOString(),
      linhas: linhas
        .filter((l) => l.medicaoId === m.id)
        .map((l) => ({ id: l.id, servicoId: l.servicoId, qtdeMedida: Number(l.qtdeMedida) })),
    })),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await params;

  const body = await req.json();

  if (body.tipo === "servico") {
    const s = await prisma.bolServico.create({
      data: {
        empresaId: session.empresaId,
        obraId: id,
        descricao: body.descricao,
        unidade: body.unidade ?? "un",
        qtdeContratada: body.qtdeContratada ?? 1,
        valorUnit: body.valorUnit ?? 0,
        ordem: body.ordem ?? 0,
      },
    });
    return NextResponse.json({ servico: { ...s, qtdeContratada: Number(s.qtdeContratada), valorUnit: Number(s.valorUnit) } });
  }

  if (body.tipo === "medicao") {
    const last = await prisma.medicao.findFirst({
      where: { obraId: id, empresaId: session.empresaId },
      orderBy: { numero: "desc" },
    });
    const numero = (last?.numero ?? 0) + 1;

    const med = await prisma.medicao.create({
      data: {
        empresaId: session.empresaId,
        obraId: id,
        numero,
        data: body.data ? new Date(body.data) : new Date(),
        obs: body.obs ?? null,
      },
    });

    const linhas = (body.linhas as { servicoId: string; qtdeMedida: number }[]) ?? [];
    if (linhas.length > 0) {
      await prisma.medicaoLinha.createMany({
        data: linhas.map((l) => ({
          id: crypto.randomUUID(),
          medicaoId: med.id,
          servicoId: l.servicoId,
          qtdeMedida: l.qtdeMedida,
        })),
      });
    }

    const linhasCriadas = await prisma.medicaoLinha.findMany({ where: { medicaoId: med.id } });
    return NextResponse.json({
      medicao: {
        ...med,
        data: med.data.toISOString(),
        criadoEm: med.criadoEm.toISOString(),
        linhas: linhasCriadas.map((l) => ({ id: l.id, servicoId: l.servicoId, qtdeMedida: Number(l.qtdeMedida) })),
      },
    });
  }

  return NextResponse.json({ error: "tipo inválido" }, { status: 400 });
}
