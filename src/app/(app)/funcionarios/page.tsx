import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FuncionariosView } from "./funcionarios-view";

export const metadata: Metadata = { title: "Funcionários" };

export default async function FuncionariosPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const funcionarios = await prisma.funcionario.findMany({
    where: { empresaId: session.empresaId },
    include: {
      alocacoes: {
        where: { fim: null },
        include: { obra: { select: { id: true, nome: true } } },
        orderBy: { inicio: "desc" },
        take: 1,
      },
      pagamentos: { select: { valor: true } },
    },
    orderBy: { nome: "asc" },
  });

  const serialized = funcionarios.map((f: typeof funcionarios[0]) => ({
    ...f,
    salario: f.salario ? Number(f.salario) : null,
    admissao: f.admissao?.toISOString() ?? null,
    pagamentos: f.pagamentos.map((p: typeof f.pagamentos[0]) => ({ valor: Number(p.valor) })),
    alocacoes: f.alocacoes.map((a: typeof f.alocacoes[0]) => ({
      obra: a.obra,
      inicio: a.inicio?.toISOString() ?? null,
    })),
  }));

  return <FuncionariosView funcionarios={serialized as any} />;
}
