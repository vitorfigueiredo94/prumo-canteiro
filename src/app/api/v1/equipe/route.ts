import { NextRequest, NextResponse } from "next/server";
import { getSession, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const usuarios = await prisma.usuario.findMany({
    where: { empresaId: session.empresaId, superAdmin: false },
    select: { id: true, nome: true, email: true, cargo: true, bloqueado: true, criadoEm: true },
    orderBy: { criadoEm: "asc" },
  });

  return NextResponse.json(usuarios.map((u) => ({ ...u, criadoEm: u.criadoEm.toISOString() })));
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { nome, email, cargo, senha } = await req.json();
    if (!nome || !email || !senha)
      return NextResponse.json({ error: "Campos obrigatórios: nome, email, senha" }, { status: 400 });

    const passwordHash = await hashPassword(senha);
    const user = await prisma.usuario.create({
      data: { empresaId: session.empresaId, nome, email, passwordHash, cargo: cargo ?? "admin" },
      select: { id: true, nome: true, email: true, cargo: true },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (err: any) {
    if (err?.code === "P2002")
      return NextResponse.json({ error: "E-mail já cadastrado" }, { status: 409 });
    return NextResponse.json({ error: "Erro ao criar membro" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
  if (id === session.userId)
    return NextResponse.json({ error: "Não é possível remover a si mesmo" }, { status: 400 });

  await prisma.usuario.deleteMany({
    where: { id, empresaId: session.empresaId, superAdmin: false },
  });

  return NextResponse.json({ ok: true });
}
