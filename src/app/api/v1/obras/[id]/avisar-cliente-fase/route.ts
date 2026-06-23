import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notificarCliente, msgFaseObra } from "@/lib/notificar-admin";

const FASE_LABELS: Record<string, string> = {
  inicio: "Início da obra",
  execucao: "Execução da obra",
  entrega: "Entrega da obra",
};

// Avisa o comprador (via WhatsApp) que a obra avançou de fase — mesmo aviso que
// o checklist disparava, agora acionado pelo Quadro.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: obraId } = await params;

  const body = await req.json().catch(() => ({}));
  const label = FASE_LABELS[body.fase];
  if (!label) return NextResponse.json({ error: "Fase inválida" }, { status: 400 });

  const obra = await prisma.obra.findFirst({
    where: { id: obraId, empresaId: session.empresaId },
    select: { nome: true, terrenoId: true, clienteNome: true, clienteTelefone: true, empresa: { select: { nome: true } } },
  });
  if (!obra) return NextResponse.json({ error: "Obra não encontrada" }, { status: 404 });

  // 1º: contato do dono/cliente cadastrado direto na obra
  let nomeCliente = obra.clienteNome?.trim() || "";
  let telCliente = obra.clienteTelefone?.trim() || "";

  // 2º (fallback): comprador da venda do terreno vinculado
  if (!telCliente && obra.terrenoId) {
    const venda = await prisma.venda.findFirst({
      where: { terrenoId: obra.terrenoId, empresaId: session.empresaId },
      select: { nomeComprador: true, telefoneComprador: true },
      orderBy: { criadoEm: "desc" },
    });
    if (venda?.telefoneComprador) {
      nomeCliente = nomeCliente || venda.nomeComprador;
      telCliente = venda.telefoneComprador;
    }
  }

  if (!telCliente) {
    return NextResponse.json({ ok: false, erro: "Sem contato do cliente. Cadastre o WhatsApp do dono em Editar obra." });
  }

  const msg = msgFaseObra(obra.nome, nomeCliente || "cliente", label, obra.empresa.nome);

  // Tenta a Cloud API (funciona quando a conta WhatsApp estiver verificada) — best-effort
  void notificarCliente(telCliente, msg).catch(() => null);

  // E retorna um link wa.me para o gestor enviar pelo próprio WhatsApp (funciona já)
  const tel = telCliente.replace(/\D/g, "");
  const to = tel.startsWith("55") ? tel : `55${tel}`;
  const waUrl = `https://wa.me/${to}?text=${encodeURIComponent(msg)}`;

  return NextResponse.json({ ok: true, cliente: nomeCliente, waUrl });
}
