import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MateriaisView } from "./materiais-view";

export default async function MateriaisPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const obras = await prisma.obra.findMany({
    where: { empresaId: session.empresaId },
    select: { id: true, nome: true },
  });

  const obraNames = Object.fromEntries(obras.map((o) => [o.id, o.nome]));

  return <MateriaisView obraNames={obraNames} />;
}
