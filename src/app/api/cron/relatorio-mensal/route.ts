import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { timingSafeEqual } from "crypto";

export const runtime = "nodejs";

function verifyCronSecret(incoming: string | null): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected || !incoming) return false;
  try {
    const a = Buffer.from(incoming);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch { return false; }
}

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function enviarWhatsApp(telefone: string, mensagem: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId || !telefone) return;
  const numero = telefone.replace(/\D/g, "");
  const full = numero.startsWith("55") ? numero : `55${numero}`;
  await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: full, type: "text", text: { body: mensagem } }),
  });
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req.headers.get("x-cron-secret"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const agora = new Date();
  // Mês anterior
  const anoRef = agora.getMonth() === 0 ? agora.getFullYear() - 1 : agora.getFullYear();
  const mesRef = agora.getMonth() === 0 ? 11 : agora.getMonth() - 1;
  const de  = new Date(anoRef, mesRef, 1, 0, 0, 0);
  const ate = new Date(anoRef, mesRef + 1, 0, 23, 59, 59);
  const mesLabel = de.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const empresas = await prisma.empresa.findMany({
    select: { id: true, nome: true, telefoneGestor: true },
  });

  const resultados: Array<{ empresa: string; enviado: boolean; erro?: string }> = [];

  for (const empresa of empresas) {
    try {
      const [receitas, notas, pagamentos, vencidas] = await Promise.all([
        prisma.parcela.aggregate({
          where: { venda: { empresaId: empresa.id }, status: "paga", pagoEm: { gte: de, lte: ate } },
          _sum: { valor: true },
          _count: true,
        }),
        prisma.notaFiscal.aggregate({
          where: { empresaId: empresa.id, status: "confirmada", emitidaEm: { gte: de, lte: ate } },
          _sum: { valor: true },
        }),
        (prisma as any).pagamentoFuncionario.aggregate({
          where: { empresaId: empresa.id, pagoEm: { gte: de, lte: ate } },
          _sum: { valor: true },
        }),
        prisma.parcela.aggregate({
          where: { venda: { empresaId: empresa.id }, status: "aberta", vencimento: { lt: agora } },
          _sum: { valor: true },
          _count: true,
        }),
      ]);

      const totalReceita   = Number((receitas._sum as any).valor ?? 0);
      const totalNFs       = Number((notas._sum as any).valor ?? 0);
      const totalFolha     = Number((pagamentos._sum as any).valor ?? 0);
      const totalCusto     = totalNFs + totalFolha;
      const resultado      = totalReceita - totalCusto;
      const margem         = totalReceita > 0 ? (resultado / totalReceita) * 100 : 0;
      const inadimplencia  = Number((vencidas._sum as any).valor ?? 0);
      const qtdInad        = (vencidas._count as any) ?? 0;

      if (!empresa.telefoneGestor) {
        resultados.push({ empresa: empresa.nome, enviado: false, erro: "sem telefoneGestor" });
        continue;
      }

      const linhas = [
        `📊 *Relatório Mensal — ${mesLabel}*`,
        `*${empresa.nome}*`,
        ``,
        `💰 Receita recebida: ${fmtBRL(totalReceita)} (${receitas._count} parcelas)`,
        `📉 Despesas (NFs): ${fmtBRL(totalNFs)}`,
        `👷 Folha de pagamento: ${fmtBRL(totalFolha)}`,
        ``,
        `${resultado >= 0 ? "✅" : "❌"} Resultado: ${fmtBRL(resultado)} (margem ${margem.toFixed(1)}%)`,
      ];

      if (inadimplencia > 0) {
        linhas.push(``, `⚠️ Inadimplência: ${fmtBRL(inadimplencia)} (${qtdInad} parcelas em aberto)`);
      }

      linhas.push(``, `📱 Detalhes: prumocanteiro.com.br/financeiro`);

      await enviarWhatsApp(empresa.telefoneGestor, linhas.join("\n"));
      resultados.push({ empresa: empresa.nome, enviado: true });
    } catch (err: any) {
      resultados.push({ empresa: empresa.nome, enviado: false, erro: err?.message });
    }
  }

  return NextResponse.json({ ok: true, mes: mesLabel, resultados });
}
