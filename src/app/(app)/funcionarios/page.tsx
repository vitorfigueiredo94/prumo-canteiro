import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { FuncionariosView } from "./funcionarios-view";

export const metadata: Metadata = { title: "Funcionários" };

export default async function FuncionariosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const usuario = await prisma.usuario.findUnique({
    where: { id: user.id },
    select: { empresaId: true },
  });
  if (!usuario) redirect("/login");

  const funcionarios = await prisma.funcionario.findMany({
    where: { empresaId: usuario.empresaId },
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
