import { prisma } from "@/lib/prisma";
import { UsuariosView } from "./usuarios-view";

export default async function UsuariosPage() {
  const usuarios = await prisma.usuario.findMany({
    include: { empresa: { select: { nome: true } } },
    orderBy: { criadoEm: "desc" },
  });

  const serialized = usuarios.map(u => ({
    id: u.id,
    nome: u.nome,
    email: u.email,
    empresaNome: u.empresa.nome,
    superAdmin: u.superAdmin,
    bloqueado: u.bloqueado,
    criadoEm: u.criadoEm.toISOString(),
  }));

  return <UsuariosView usuarios={serialized} />;
}
