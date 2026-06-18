// src/lib/relatorio-obra.ts
// Gerador de HTML estático para impressão/PDF do relatório de obra.

interface ChecklistItem {
  descricao: string;
  concluido: boolean;
}

interface ChecklistFase {
  fase: string;
  total: number;
  concluidos: number;
  porcentagem: number;
  itens: ChecklistItem[];
}

export interface ObraRelatorio {
  obra: {
    id: string;
    nome: string;
    status: string;
    orcamento: number;
    progresso: number;
    inicio: string | null;
    prazo: string | null;
    responsavel: string | null;
    terreno: { nome: string; cidade: string; area?: number | null } | null;
  };
  empresa: { nome: string; logoEmpresa?: string | null };
  notas: Array<{
    fornecedor: string | null;
    categoria: string;
    valor: number;
    emitidaEm: string | null;
    status: string;
  }>;
  pagamentos: Array<{
    valor: number;
    descricao: string | null;
    pagoEm: string | null;
    funcionario: { nome: string } | null;
  }>;
  checklists: ChecklistFase[];
  diario: Array<{ data: string | null; conteudo: string; autor: string | null }>;
}

// ── helpers ──────────────────────────────────────────────────────────────────

const STATUS_OBRA: Record<string, string> = {
  planejamento: "Planejamento",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  suspensa: "Suspensa",
  cancelada: "Cancelada",
};

const CATEGORIA_LABEL: Record<string, string> = {
  material: "Material",
  mao_obra: "Mão de obra",
  servicos: "Serviços",
  equipamentos: "Equipamentos",
  outros: "Outros",
};

function fmtBRL(v: number): string {
  return (
    "R$ " +
    v
      .toFixed(2)
      .replace(".", ",")
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  );
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso.includes("T") ? iso : iso + "T12:00:00");
  return d.toLocaleDateString("pt-BR");
}

function esc(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── main builder ──────────────────────────────────────────────────────────────

export function buildRelatorioObraHTML(params: ObraRelatorio): string {
  const { obra, empresa, notas, pagamentos, checklists, diario } = params;

  const dataRelatorio = new Date().toLocaleDateString("pt-BR");

  const notasConfirmadas = notas.filter((n) => n.status === "confirmada");
  const totalNFs = notasConfirmadas.reduce((s, n) => s + n.valor, 0);
  const totalPagamentos = pagamentos.reduce((s, p) => s + p.valor, 0);
  const realizado = totalNFs + totalPagamentos;
  const saldo = obra.orcamento - realizado;

  const catTotals: Record<string, number> = {};
  for (const n of notasConfirmadas) {
    catTotals[n.categoria] = (catTotals[n.categoria] ?? 0) + n.valor;
  }

  const diarioSlice = [...diario]
    .sort((a, b) => (b.data ?? "").localeCompare(a.data ?? ""))
    .slice(0, 30);

  const headerSection = `
    <header class="header">
      <div class="header-logo">
        ${empresa.logoEmpresa ? `<img src="${esc(empresa.logoEmpresa)}" alt="${esc(empresa.nome)}" class="logo" />` : `<span class="empresa-nome">${esc(empresa.nome)}</span>`}
      </div>
      <div class="header-info">
        <h1 class="obra-nome">${esc(obra.nome)}</h1>
        <p class="data-relatorio">Relatório gerado em ${dataRelatorio}</p>
      </div>
      <div class="no-print print-btn-wrapper">
        <button onclick="window.print()" class="btn-imprimir">Imprimir / Salvar PDF</button>
      </div>
    </header>`;

  const infoGeralSection = `
    <section class="section">
      <h2 class="section-title">1. Informações gerais</h2>
      <table class="info-table">
        <tbody>
          <tr>
            <td class="info-label">Terreno</td>
            <td class="info-value">${obra.terreno ? esc(obra.terreno.nome) : "—"}</td>
            <td class="info-label">Cidade</td>
            <td class="info-value">${obra.terreno ? esc(obra.terreno.cidade) : "—"}</td>
          </tr>
          <tr>
            <td class="info-label">Responsável</td>
            <td class="info-value">${esc(obra.responsavel) || "—"}</td>
            <td class="info-label">Status</td>
            <td class="info-value">${esc(STATUS_OBRA[obra.status] ?? obra.status)}</td>
          </tr>
          <tr>
            <td class="info-label">Início</td>
            <td class="info-value">${fmtDate(obra.inicio)}</td>
            <td class="info-label">Prazo</td>
            <td class="info-value">${fmtDate(obra.prazo)}</td>
          </tr>
          ${obra.terreno?.area != null ? `<tr><td class="info-label">Área</td><td class="info-value">${obra.terreno.area} m²</td><td></td><td></td></tr>` : ""}
          <tr>
            <td class="info-label">Orçamento</td>
            <td class="info-value mono">${fmtBRL(obra.orcamento)}</td>
            <td class="info-label">Realizado</td>
            <td class="info-value mono">${fmtBRL(realizado)}</td>
          </tr>
          <tr>
            <td class="info-label">Saldo</td>
            <td class="info-value mono ${saldo < 0 ? "danger" : "green"}">${saldo < 0 ? "(" + fmtBRL(Math.abs(saldo)) + ") estouro" : fmtBRL(saldo)}</td>
            <td class="info-label">Execução física</td>
            <td class="info-value">${obra.progresso}%</td>
          </tr>
        </tbody>
      </table>
    </section>`;

  const checklistSection = `
    <section class="section page-break-before">
      <h2 class="section-title">2. Checklist por fase</h2>
      ${
        checklists.length === 0
          ? '<p class="empty">Nenhum checklist registrado.</p>'
          : checklists
              .map(
                (cl) => `
        <div class="checklist-fase">
          <div class="fase-header">
            <span class="fase-nome">${esc(cl.fase)}</span>
            <span class="fase-pct">${cl.concluidos}/${cl.total} — ${cl.porcentagem}%</span>
          </div>
          <div class="progress-bar-outer">
            <div class="progress-bar-inner" style="width:${cl.porcentagem}%;background:${cl.porcentagem === 100 ? "#16a34a" : "#1e3a5f"}"></div>
          </div>
          <ul class="checklist-items">
            ${cl.itens
              .map(
                (item) =>
                  `<li class="checklist-item ${item.concluido ? "done" : ""}">
                <span class="check-icon">${item.concluido ? "✓" : "○"}</span>
                <span class="check-desc">${esc(item.descricao)}</span>
              </li>`
              )
              .join("")}
          </ul>
        </div>`
              )
              .join("")
      }
    </section>`;

  const financeiroSection = `
    <section class="section page-break-before">
      <h2 class="section-title">3. Financeiro</h2>
      <table class="fin-table">
        <thead>
          <tr>
            <th class="fin-th">Categoria</th>
            <th class="fin-th right">Total NFs confirmadas</th>
          </tr>
        </thead>
        <tbody>
          ${
            Object.keys(catTotals).length === 0
              ? '<tr><td colspan="2" class="fin-td empty-cell">Nenhuma NF confirmada.</td></tr>'
              : Object.entries(catTotals)
                  .sort((a, b) => b[1] - a[1])
                  .map(
                    ([cat, val]) =>
                      `<tr>
                    <td class="fin-td">${esc(CATEGORIA_LABEL[cat] ?? cat)}</td>
                    <td class="fin-td right mono">${fmtBRL(val)}</td>
                  </tr>`
                  )
                  .join("")
          }
          <tr class="subtotal">
            <td class="fin-td">Subtotal NFs</td>
            <td class="fin-td right mono">${fmtBRL(totalNFs)}</td>
          </tr>
          <tr class="subtotal">
            <td class="fin-td">Total pagamentos funcionários</td>
            <td class="fin-td right mono">${fmtBRL(totalPagamentos)}</td>
          </tr>
          <tr class="total-row">
            <td class="fin-td"><strong>Total realizado</strong></td>
            <td class="fin-td right mono"><strong>${fmtBRL(realizado)}</strong></td>
          </tr>
          <tr class="${saldo < 0 ? "danger-row" : "green-row"}">
            <td class="fin-td"><strong>${saldo < 0 ? "Estouro de orçamento" : "Saldo disponível"}</strong></td>
            <td class="fin-td right mono"><strong>${fmtBRL(Math.abs(saldo))}</strong></td>
          </tr>
        </tbody>
      </table>
    </section>`;

  const diarioSection = `
    <section class="section page-break-before">
      <h2 class="section-title">4. Diário de obra${diario.length > 30 ? " (últimas 30 entradas)" : ""}</h2>
      ${
        diarioSlice.length === 0
          ? '<p class="empty">Nenhum registro no diário.</p>'
          : `<div class="diario-list">
          ${diarioSlice
            .map(
              (d) => `
            <div class="diario-entry">
              <div class="diario-meta">
                <span class="diario-data">${fmtDate(d.data)}</span>
                ${d.autor ? `<span class="diario-autor">${esc(d.autor)}</span>` : ""}
              </div>
              <p class="diario-conteudo">${esc(d.conteudo)}</p>
            </div>`
            )
            .join("")}
        </div>`
      }
    </section>`;

  const styles = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      font-size: 14px;
      color: #1a1f2e;
      background: #fff;
      padding: 32px 40px;
      max-width: 960px;
      margin: 0 auto;
    }
    h1 { font-size: 26px; font-weight: 600; color: #1a1f2e; }
    h2 { font-size: 18px; font-weight: 600; color: #1a1f2e; }
    .header { display: flex; align-items: flex-start; gap: 24px; border-bottom: 2px solid #1e3a5f; padding-bottom: 20px; margin-bottom: 28px; }
    .header-logo { flex-shrink: 0; }
    .logo { max-height: 64px; max-width: 180px; object-fit: contain; }
    .empresa-nome { font-size: 22px; font-weight: 700; color: #1e3a5f; }
    .header-info { flex: 1; }
    .obra-nome { margin-bottom: 4px; }
    .data-relatorio { font-size: 13px; color: #6b7280; }
    .btn-imprimir { padding: 8px 18px; background: #1e3a5f; color: #fff; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; }
    .section { margin-bottom: 36px; }
    .section-title { margin-bottom: 14px; padding-bottom: 6px; border-bottom: 1px solid #e5e7eb; font-size: 16px; }
    .empty { color: #9ca3af; font-size: 13.5px; }
    .info-table { width: 100%; border-collapse: collapse; }
    .info-table tr { border-bottom: 1px solid #f3f4f6; }
    .info-label { width: 22%; padding: 9px 12px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7280; background: #f9fafb; }
    .info-value { width: 28%; padding: 9px 12px; font-size: 14px; color: #1a1f2e; }
    .mono { font-variant-numeric: tabular-nums; }
    .green { color: #16a34a; font-weight: 700; }
    .danger { color: #dc2626; font-weight: 700; }
    .checklist-fase { margin-bottom: 22px; }
    .fase-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .fase-nome { font-size: 14.5px; font-weight: 600; }
    .fase-pct { font-size: 13px; color: #6b7280; }
    .progress-bar-outer { height: 8px; background: #e5e7eb; border-radius: 99px; overflow: hidden; margin-bottom: 10px; }
    .progress-bar-inner { height: 100%; border-radius: 99px; }
    .checklist-items { list-style: none; }
    .checklist-item { display: flex; gap: 10px; align-items: flex-start; padding: 5px 0; border-bottom: 1px solid #f3f4f6; }
    .check-icon { width: 18px; flex-shrink: 0; font-weight: 700; }
    .checklist-item.done .check-icon { color: #16a34a; }
    .checklist-item.done .check-desc { color: #9ca3af; text-decoration: line-through; }
    .check-desc { font-size: 13.5px; line-height: 1.5; }
    .fin-table { width: 100%; border-collapse: collapse; }
    .fin-th { padding: 9px 14px; font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7280; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
    .fin-td { padding: 11px 14px; font-size: 14px; border-bottom: 1px solid #f3f4f6; }
    .right { text-align: right; }
    .empty-cell { color: #9ca3af; font-style: italic; }
    .subtotal td { background: #f9fafb; }
    .total-row td { border-top: 2px solid #e5e7eb; font-size: 15px; }
    .green-row td { color: #16a34a; }
    .danger-row td { color: #dc2626; }
    .diario-list { display: flex; flex-direction: column; gap: 0; }
    .diario-entry { display: grid; grid-template-columns: 130px 1fr; gap: 12px; padding: 12px 0; border-bottom: 1px solid #f3f4f6; }
    .diario-meta { display: flex; flex-direction: column; gap: 3px; }
    .diario-data { font-size: 13px; font-weight: 700; color: #374151; }
    .diario-autor { font-size: 12px; color: #9ca3af; }
    .diario-conteudo { font-size: 13.5px; line-height: 1.6; color: #374151; }
    @media print {
      body { margin: 0; padding: 20px 28px; }
      .no-print { display: none !important; }
      .page-break-before { page-break-before: always; }
      a { color: inherit; text-decoration: none; }
    }
  `;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Relatório da Obra — ${esc(obra.nome)}</title>
  <style>${styles}</style>
</head>
<body>
  ${headerSection}
  ${infoGeralSection}
  ${checklistSection}
  ${financeiroSection}
  ${diarioSection}
</body>
</html>`;
}
