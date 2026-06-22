"use server";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function enviarWhatsApp(telefone: string, mensagem: string): Promise<{ ok: boolean; erro?: string }> {
  const accessToken   = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!accessToken || !phoneNumberId) {
    return { ok: false, erro: "WhatsApp não configurado no servidor (WHATSAPP_ACCESS_TOKEN/PHONE_NUMBER_ID)." };
  }

  const payload = {
    messaging_product: "whatsapp",
    to: telefone.startsWith("55") ? telefone : `55${telefone}`,
    type: "text",
    text: { body: mensagem },
  };
  try {
    const res = await fetch(
      `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000),
      }
    );
    if (res.ok) return { ok: true };

    // Captura o motivo real da Meta para diagnóstico
    const data = await res.json().catch(() => null);
    const metaErr = data?.error;
    const code = metaErr?.code;
    console.error("[notificar-funcionario] Meta API falhou:", JSON.stringify(metaErr ?? data));

    // Mensagens amigáveis para os erros mais comuns
    let erro = metaErr?.message ?? `HTTP ${res.status}`;
    if (code === 131047 || code === 131051) {
      erro = "O funcionário precisa ter enviado uma mensagem para o número da empresa nas últimas 24h, OU é necessário um modelo (template) aprovado para mensagens proativas no WhatsApp.";
    } else if (code === 131030) {
      erro = "Número não autorizado: em modo de teste, o número precisa estar cadastrado como destinatário no painel da Meta.";
    } else if (code === 100 || code === 33) {
      erro = "Número inválido ou não é um WhatsApp válido. Confira o telefone do funcionário.";
    }
    return { ok: false, erro };
  } catch (e) {
    console.error("[notificar-funcionario] erro de rede:", e);
    return { ok: false, erro: "Falha de conexão com o WhatsApp. Tente novamente." };
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: obraId } = await params;
  const body = await req.json();
  const { funcionarioId, tarefa, data } = body as { funcionarioId: string; tarefa: string; data?: string };

  if (!funcionarioId || !tarefa?.trim()) {
    return NextResponse.json({ error: "funcionarioId e tarefa são obrigatórios." }, { status: 400 });
  }

  const [obra, funcionario] = await Promise.all([
    prisma.obra.findFirst({
      where: { id: obraId, empresaId: session.empresaId },
      select: { nome: true, endereco: true, cidade: true, cep: true, responsavel: true },
    }),
    prisma.funcionario.findFirst({
      where: { id: funcionarioId, empresaId: session.empresaId },
      select: { nome: true, telefone: true },
    }),
  ]);

  if (!obra) return NextResponse.json({ error: "Obra não encontrada." }, { status: 404 });
  if (!funcionario) return NextResponse.json({ error: "Funcionário não encontrado." }, { status: 404 });

  const tel = funcionario.telefone?.replace(/\D/g, "");
  if (!tel) return NextResponse.json({ error: "Funcionário sem telefone cadastrado." }, { status: 422 });

  // Build address lines
  const endParts = [obra.endereco, obra.cep, obra.cidade].filter(Boolean);
  const endLine = endParts.length > 0 ? endParts.join(", ") : "Endereço não informado";
  const mapsQuery = endParts.join("+").replace(/\s/g, "+");
  const mapsLink = `https://maps.google.com/?q=${encodeURIComponent(endParts.join(", "))}`;

  const dataFormatada = data
    ? new Date(data).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })
    : "A confirmar";

  const mensagem = [
    `🏗️ *Designação de obra — ${obra.nome}*`,
    ``,
    `Olá, ${funcionario.nome}! Você foi designado(a) para a seguinte obra:`,
    ``,
    `📍 *Endereço:* ${endLine}`,
    endParts.length > 0 ? `🗺️ *Google Maps:* ${mapsLink}` : null,
    ``,
    `📅 *Data/hora:* ${dataFormatada}`,
    ``,
    `📋 *O que fazer:*`,
    tarefa.trim(),
    obra.responsavel ? `\n👷 *Responsável da obra:* ${obra.responsavel}` : null,
    ``,
    `_Mensagem automática — PrumoCanteiro_`,
  ].filter((l) => l !== null).join("\n");

  const { ok, erro } = await enviarWhatsApp(tel, mensagem);

  return NextResponse.json({ ok, erro, funcionario: funcionario.nome });
}
