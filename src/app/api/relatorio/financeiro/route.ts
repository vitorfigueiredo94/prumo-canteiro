import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtDate(iso: string | Date | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

const CAT_LABEL: Record<string, string> = {
  material: "Material", mao_obra: "Mão de obra", servicos: "Serviços",
  equipamentos: "Equipamentos", outros: "Outros",
};

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return new NextResponse("Não autorizado", { status: 401 });

  const { searchParams } = new URL(req.url);
  const de  = searchParams.get("de");
  const ate = searchParams.get("ate");

  const deDate  = de  ? new Date(de  + "T00:00:00") : new Date(new Date().getFullYear(), 0, 1);
  const ateDate = ate ? new Date(ate + "T23:59:59") : new Date();
  const ateFim  = new Date(ateDate); ateFim.setHours(23, 59, 59, 999);

  const [notas, parcelas, empresa] = await Promise.all([
    prisma.notaFiscal.findMany({
      where: { empresaId: session.empresaId, emitidaEm: { gte: deDate, lte: ateFim } },
      include: { obra: { select: { nome: true } } },
      orderBy: { emitidaEm: "desc" },
    }),
    prisma.parcela.findMany({
      where: {
        status: "paga",
        pagoEm: { gte: deDate, lte: ateFim },
        venda: { empresaId: session.empresaId },
      },
      include: { venda: { select: { nomeComprador: true, terrenoId: true, terreno: { select: { nome: true } } } } },
      orderBy: { pagoEm: "desc" },
    }),
    prisma.empresa.findUnique({ where: { id: session.empresaId }, select: { nome: true, logoEmpresa: true } }),
  ]);

  const totalReceitas = parcelas.reduce((s, p) => s + Number(p.valor), 0);
  const totalDespesas = notas.reduce((s, n) => s + Number(n.valor), 0);
  const saldo = totalReceitas - totalDespesas;

  // Agrupamento de despesas por categoria
  const porCategoria = notas.reduce<Record<string, number>>((acc, n) => {
    acc[n.categoria] = (acc[n.categoria] ?? 0) + Number(n.valor);
    return acc;
  }, {});

  const logoTag = empresa?.logoEmpresa
    ? `<img src="${empresa.logoEmpresa}" style="height:48px;object-fit:contain;margin-bottom:4px" />`
    : `<div style="font-size:22px;font-weight:700;color:#1e3a5f">${empresa?.nome ?? ""}</div>`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>Relatório Financeiro</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:system-ui,sans-serif;color:#1e293b;background:#fff;padding:40px 48px}
  @media print{body{padding:20px 28px}.no-print{display:none}}
  h1{font-size:22px;font-weight:700;color:#1e3a5f;margin-bottom:2px}
  h2{font-size:14px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;margin:28px 0 10px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th{padding:8px 12px;background:#f8fafc;color:#64748b;font-weight:700;text-transform:uppercase;font-size:11px;letter-spacing:.05em;border-bottom:2px solid #e2e8f0;text-align:left}
  th.r{text-align:right}
  td{padding:9px 12px;border-bottom:1px solid #f1f5f9;color:#334155}
  td.r{text-align:right;font-variant-numeric:tabular-nums}
  td.bold{font-weight:700;color:#1e293b}
  .kpi{display:inline-block;padding:16px 24px;border:1px solid #e2e8f0;border-radius:10px;margin-right:16px;margin-bottom:16px;min-width:160px}
  .kpi-label{font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px}
  .kpi-value{font-size:24px;font-weight:700;color:#1e3a5f}
  .saldo-pos{color:#16a34a}.saldo-neg{color:#dc2626}
  .badge{display:inline-block;padding:2px 9px;border-radius:99px;font-size:11px;font-weight:700}
  tfoot td{font-weight:700;border-top:2px solid #e2e8f0;background:#f8fafc}
</style>
</head>
<body>

<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid #e2e8f0">
  <div>
    ${logoTag}
    <h1 style="margin-top:12px">Relatório Financeiro</h1>
    <div style="font-size:13px;color:#64748b;margin-top:4px">Período: ${fmtDate(deDate)} a ${fmtDate(ateFim)}</div>
  </div>
  <button class="no-print" onclick="window.print()" style="height:40px;padding:0 20px;background:#1e3a5f;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer">
    Imprimir / Salvar PDF
  </button>
</div>

<!-- KPIs -->
<div style="margin-bottom:28px">
  <div class="kpi">
    <div class="kpi-label">Receitas</div>
    <div class="kpi-value" style="color:#16a34a">${fmtBRL(totalReceitas)}</div>
  </div>
  <div class="kpi">
    <div class="kpi-label">Despesas</div>
    <div class="kpi-value" style="color:#dc2626">${fmtBRL(totalDespesas)}</div>
  </div>
  <div class="kpi">
    <div class="kpi-label">Saldo</div>
    <div class="kpi-value ${saldo >= 0 ? "saldo-pos" : "saldo-neg"}">${fmtBRL(saldo)}</div>
  </div>
</div>

<!-- Despesas por categoria -->
${Object.keys(porCategoria).length > 0 ? `
<h2>Despesas por categoria</h2>
<table style="margin-bottom:24px">
  <thead><tr><th>Categoria</th><th class="r">Total</th><th class="r">%</th></tr></thead>
  <tbody>
    ${Object.entries(porCategoria).sort((a,b)=>b[1]-a[1]).map(([cat,val])=>`
    <tr>
      <td class="bold">${CAT_LABEL[cat]??cat}</td>
      <td class="r">${fmtBRL(val)}</td>
      <td class="r" style="color:#64748b">${totalDespesas > 0 ? ((val/totalDespesas)*100).toFixed(1) : 0}%</td>
    </tr>`).join("")}
  </tbody>
  <tfoot><tr><td class="bold">Total despesas</td><td class="r bold">${fmtBRL(totalDespesas)}</td><td></td></tr></tfoot>
</table>` : ""}

<!-- Receitas (parcelas pagas) -->
<h2>Receitas — parcelas recebidas (${parcelas.length})</h2>
${parcelas.length === 0 ? '<p style="color:#94a3b8;font-size:13px;margin-bottom:24px">Nenhuma parcela paga no período.</p>' : `
<table style="margin-bottom:24px">
  <thead><tr><th>Comprador</th><th>Terreno</th><th class="r">Valor</th><th class="r">Pago em</th></tr></thead>
  <tbody>
    ${parcelas.map(p=>`
    <tr>
      <td class="bold">${p.venda.nomeComprador}</td>
      <td style="color:#64748b">${p.venda.terreno?.nome??'—'}</td>
      <td class="r bold" style="color:#16a34a">${fmtBRL(Number(p.valor))}</td>
      <td class="r" style="color:#64748b">${fmtDate(p.pagoEm)}</td>
    </tr>`).join("")}
  </tbody>
  <tfoot><tr><td class="bold" colspan="2">Total receitas</td><td class="r bold" style="color:#16a34a">${fmtBRL(totalReceitas)}</td><td></td></tr></tfoot>
</table>`}

<!-- Despesas (notas fiscais) -->
<h2>Despesas — notas fiscais (${notas.length})</h2>
${notas.length === 0 ? '<p style="color:#94a3b8;font-size:13px">Nenhuma nota fiscal no período.</p>' : `
<table>
  <thead><tr><th>Fornecedor</th><th>Categoria</th><th>Obra</th><th class="r">Valor</th><th class="r">Data</th></tr></thead>
  <tbody>
    ${notas.map(n=>`
    <tr>
      <td class="bold">${n.fornecedor}</td>
      <td style="color:#64748b">${CAT_LABEL[n.categoria]??n.categoria}</td>
      <td style="color:#64748b">${n.obra?.nome??'—'}</td>
      <td class="r bold" style="color:#dc2626">${fmtBRL(Number(n.valor))}</td>
      <td class="r" style="color:#64748b">${fmtDate(n.emitidaEm)}</td>
    </tr>`).join("")}
  </tbody>
  <tfoot><tr><td class="bold" colspan="3">Total despesas</td><td class="r bold" style="color:#dc2626">${fmtBRL(totalDespesas)}</td><td></td></tr></tfoot>
</table>`}

<div style="margin-top:40px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center">
  Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})} · PrumoCanteiro
</div>
</body></html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
