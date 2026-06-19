// src/lib/relatorio-obra.ts
// Gerador de HTML estático para impressão/PDF do relatório de obra (v2).

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
    cronogramaJson?: string | null;
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
  diario: Array<{ data: string | null; conteudo: string; autor: string | null; fotos?: string[] }>;
  materiais?: Array<{
    nome: string;
    quantidade: number;
    unidade: string;
    valorUnit: number;
    fornecedor: string | null;
    data: string | null;
  }>;
  orcamento?: Array<{
    categoria: string;
    descricao: string;
    unidade: string;
    quantidade: number;
    valorUnit: number;
  }>;
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
  material:     "Material",
  mao_obra:     "Mão de obra",
  servicos:     "Serviços",
  equipamentos: "Equipamentos",
  outros:       "Outros",
};

function fmtBRL(v: number): string {
  return (
    "R$ " +
    v.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  );
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso.includes("T") ? iso : iso + "T12:00:00");
  return d.toLocaleDateString("pt-BR");
}

function esc(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s.includes("T") ? s : s + "T12:00:00");
  return isNaN(d.getTime()) ? null : d;
}

// ── main builder ──────────────────────────────────────────────────────────────

export function buildRelatorioObraHTML(params: ObraRelatorio): string {
  const { obra, empresa, notas, pagamentos, checklists, diario, materiais = [], orcamento = [] } = params;

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

  // ── Section numbering
  let sectionNum = 0;
  const sec = (title: string) => `${++sectionNum}. ${title}`;

  // ── 1. Header ────────────────────────────────────────────────────────────
  const headerSection = `
    <header class="header">
      <div class="header-logo">
        ${empresa.logoEmpresa
          ? `<img src="${esc(empresa.logoEmpresa)}" alt="${esc(empresa.nome)}" class="logo" />`
          : `<span class="empresa-nome">${esc(empresa.nome)}</span>`}
      </div>
      <div class="header-info">
        <h1 class="obra-nome">${esc(obra.nome)}</h1>
        <p class="data-relatorio">Relatório gerado em ${dataRelatorio}</p>
      </div>
      <div class="no-print print-btn-wrapper">
        <button onclick="window.print()" class="btn-imprimir">Imprimir / Salvar PDF</button>
      </div>
    </header>`;

  // ── 2. Informações gerais ─────────────────────────────────────────────────
  const infoGeralSection = `
    <section class="section">
      <h2 class="section-title">${sec("Informações gerais")}</h2>
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
          ${obra.terreno?.area != null
            ? `<tr><td class="info-label">Área</td><td class="info-value">${obra.terreno.area} m²</td><td></td><td></td></tr>`
            : ""}
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

  // ── 3. Cronograma (Gantt) ────────────────────────────────────────────────
  const FASES_GANTT = [
    { key: "OBRA_INICIO", label: "Início da obra",  color: "#1e3a5f" },
    { key: "OBRA_MEIO",   label: "Execução (meio)", color: "#b45309" },
    { key: "OBRA_FIM",    label: "Entrega (fim)",   color: "#047857" },
  ];

  let ganttSection = "";
  if (obra.cronogramaJson) {
    const crono: Record<string, { inicio: string | null; fim: string | null }> = JSON.parse(obra.cronogramaJson);
    const fasesDates = FASES_GANTT.flatMap((f) => {
      const entry = crono[f.key];
      if (!entry) return [];
      const d1 = parseDate(entry.inicio);
      const d2 = parseDate(entry.fim);
      if (!d1 && !d2) return [];
      return [{ ...f, inicio: entry.inicio, fim: entry.fim, d1, d2 }];
    });

    if (fasesDates.length > 0) {
      const allDates = fasesDates.flatMap((f) => [f.d1, f.d2].filter(Boolean) as Date[]);
      const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
      const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));
      const span = Math.max(1, maxDate.getTime() - minDate.getTime());

      const rows = fasesDates.map((f) => {
        const startMs = f.d1 ? f.d1.getTime() - minDate.getTime() : 0;
        const endMs   = f.d2 ? f.d2.getTime() - minDate.getTime() : span;
        const left  = Math.round((startMs / span) * 100);
        const width = Math.max(2, Math.round(((endMs - startMs) / span) * 100));
        const today = new Date();
        const done  = f.d2 ? f.d2 < today : false;
        const cl = checklists.find((c) => c.fase === f.key);
        const pct = cl ? cl.porcentagem : 0;

        return `
          <tr class="gantt-row">
            <td class="gantt-label">${esc(f.label)}</td>
            <td class="gantt-dates">${fmtDate(f.inicio)} → ${fmtDate(f.fim)}</td>
            <td class="gantt-bar-cell">
              <div class="gantt-bar-track">
                <div class="gantt-bar" style="left:${left}%;width:${width}%;background:${done ? "#16a34a" : f.color}">
                  ${pct > 0 ? `<span class="gantt-pct">${pct}%</span>` : ""}
                </div>
              </div>
            </td>
          </tr>`;
      });

      ganttSection = `
        <section class="section">
          <h2 class="section-title">${sec("Cronograma")}</h2>
          <table class="gantt-table">
            <thead>
              <tr>
                <th class="gantt-th" style="width:22%">Fase</th>
                <th class="gantt-th" style="width:24%">Período</th>
                <th class="gantt-th">Linha do tempo</th>
              </tr>
            </thead>
            <tbody>${rows.join("")}</tbody>
          </table>
          <div class="gantt-axis">
            <span>${fmtDate(minDate.toISOString())}</span>
            <span>${fmtDate(maxDate.toISOString())}</span>
          </div>
        </section>`;
    }
  }

  // ── 4. Checklist ─────────────────────────────────────────────────────────
  const checklistSection = `
    <section class="section ${ganttSection ? "" : "page-break-before"}">
      <h2 class="section-title">${sec("Checklist por fase")}</h2>
      ${checklists.length === 0
        ? '<p class="empty">Nenhum checklist registrado.</p>'
        : checklists.map((cl) => `
          <div class="checklist-fase">
            <div class="fase-header">
              <span class="fase-nome">${esc(cl.fase)}</span>
              <span class="fase-pct">${cl.concluidos}/${cl.total} — ${cl.porcentagem}%</span>
            </div>
            <div class="progress-bar-outer">
              <div class="progress-bar-inner" style="width:${cl.porcentagem}%;background:${cl.porcentagem === 100 ? "#16a34a" : "#1e3a5f"}"></div>
            </div>
            <ul class="checklist-items">
              ${cl.itens.map((item) =>
                `<li class="checklist-item ${item.concluido ? "done" : ""}">
                  <span class="check-icon">${item.concluido ? "✓" : "○"}</span>
                  <span class="check-desc">${esc(item.descricao)}</span>
                </li>`).join("")}
            </ul>
          </div>`).join("")}
    </section>`;

  // ── 5. Financeiro ────────────────────────────────────────────────────────
  const financeiroSection = `
    <section class="section page-break-before">
      <h2 class="section-title">${sec("Financeiro")}</h2>
      <table class="fin-table">
        <thead>
          <tr>
            <th class="fin-th">Categoria</th>
            <th class="fin-th right">Total NFs confirmadas</th>
          </tr>
        </thead>
        <tbody>
          ${Object.keys(catTotals).length === 0
            ? '<tr><td colspan="2" class="fin-td empty-cell">Nenhuma NF confirmada.</td></tr>'
            : Object.entries(catTotals).sort((a, b) => b[1] - a[1]).map(([cat, val]) =>
                `<tr>
                  <td class="fin-td">${esc(CATEGORIA_LABEL[cat] ?? cat)}</td>
                  <td class="fin-td right mono">${fmtBRL(val)}</td>
                </tr>`).join("")}
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

      ${orcamento.length > 0 ? `
      <h3 style="font-size:14px;font-weight:700;margin:22px 0 10px;color:#374151">Orçamento detalhado por categoria</h3>
      <table class="fin-table">
        <thead>
          <tr>
            <th class="fin-th">Categoria</th>
            <th class="fin-th">Descrição</th>
            <th class="fin-th right">Qtde</th>
            <th class="fin-th">Unid.</th>
            <th class="fin-th right">Val. unit.</th>
            <th class="fin-th right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${orcamento.map((o) => `
            <tr>
              <td class="fin-td" style="font-size:12px;color:#6b7280">${esc(CATEGORIA_LABEL[o.categoria] ?? o.categoria)}</td>
              <td class="fin-td">${esc(o.descricao)}</td>
              <td class="fin-td right mono">${o.quantidade % 1 === 0 ? o.quantidade.toFixed(0) : o.quantidade.toFixed(2)}</td>
              <td class="fin-td" style="font-size:12px;color:#6b7280">${esc(o.unidade)}</td>
              <td class="fin-td right mono">${fmtBRL(o.valorUnit)}</td>
              <td class="fin-td right mono" style="font-weight:700">${fmtBRL(o.quantidade * o.valorUnit)}</td>
            </tr>`).join("")}
        </tbody>
        <tfoot>
          <tr class="total-row">
            <td class="fin-td" colspan="5"><strong>Total orçado</strong></td>
            <td class="fin-td right mono"><strong>${fmtBRL(orcamento.reduce((s, o) => s + o.quantidade * o.valorUnit, 0))}</strong></td>
          </tr>
        </tfoot>
      </table>` : ""}
    </section>`;

  // ── 6. Materiais ─────────────────────────────────────────────────────────
  let materiaisSection = "";
  if (materiais.length > 0) {
    const totalMat = materiais.reduce((s, m) => s + m.quantidade * m.valorUnit, 0);
    materiaisSection = `
      <section class="section page-break-before">
        <h2 class="section-title">${sec("Materiais utilizados")}</h2>
        <table class="fin-table">
          <thead>
            <tr>
              <th class="fin-th">Material</th>
              <th class="fin-th right">Qtde</th>
              <th class="fin-th">Unid.</th>
              <th class="fin-th right">Val. unit.</th>
              <th class="fin-th right">Total</th>
              <th class="fin-th">Fornecedor</th>
              <th class="fin-th">Data</th>
            </tr>
          </thead>
          <tbody>
            ${materiais.map((m) => `
              <tr>
                <td class="fin-td">${esc(m.nome)}</td>
                <td class="fin-td right mono">${m.quantidade % 1 === 0 ? m.quantidade.toFixed(0) : m.quantidade.toFixed(2)}</td>
                <td class="fin-td" style="font-size:12px;color:#6b7280">${esc(m.unidade)}</td>
                <td class="fin-td right mono">${fmtBRL(m.valorUnit)}</td>
                <td class="fin-td right mono" style="font-weight:700">${fmtBRL(m.quantidade * m.valorUnit)}</td>
                <td class="fin-td" style="font-size:12px;color:#6b7280">${esc(m.fornecedor) || "—"}</td>
                <td class="fin-td" style="font-size:12px;color:#6b7280">${fmtDate(m.data)}</td>
              </tr>`).join("")}
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td class="fin-td" colspan="4"><strong>Total materiais</strong></td>
              <td class="fin-td right mono"><strong>${fmtBRL(totalMat)}</strong></td>
              <td class="fin-td" colspan="2"></td>
            </tr>
          </tfoot>
        </table>
      </section>`;
  }

  // ── 7. Diário ────────────────────────────────────────────────────────────
  const diarioComFotos = diarioSlice.filter((d) => (d.fotos ?? []).length > 0);
  const diarioSemFotos = diarioSlice;

  const fotosSection = diarioComFotos.length > 0 ? `
    <section class="section page-break-before">
      <h2 class="section-title">${sec("Fotos do diário de obra")}</h2>
      ${diarioComFotos.map((d) => `
        <div style="margin-bottom:20px">
          <div class="diario-data" style="margin-bottom:8px;font-weight:700;font-size:13px;color:#374151">${fmtDate(d.data)}${d.autor ? ` · ${esc(d.autor)}` : ""}</div>
          <p style="font-size:13px;color:#6b7280;margin-bottom:10px;line-height:1.5">${esc(d.conteudo)}</p>
          <div style="display:flex;flex-wrap:wrap;gap:8px">
            ${(d.fotos ?? []).map((url) =>
              `<img src="${esc(url)}" style="width:220px;height:160px;object-fit:cover;border-radius:6px;border:1px solid #e5e7eb" />`
            ).join("")}
          </div>
        </div>`).join("")}
    </section>` : "";

  const diarioSection = `
    <section class="section page-break-before">
      <h2 class="section-title">${sec(`Diário de obra${diario.length > 30 ? " (últimas 30 entradas)" : ""}`)}</h2>
      ${diarioSemFotos.length === 0
        ? '<p class="empty">Nenhum registro no diário.</p>'
        : `<div class="diario-list">
            ${diarioSemFotos.map((d) => `
              <div class="diario-entry">
                <div class="diario-meta">
                  <span class="diario-data">${fmtDate(d.data)}</span>
                  ${d.autor ? `<span class="diario-autor">${esc(d.autor)}</span>` : ""}
                </div>
                <p class="diario-conteudo">${esc(d.conteudo)}${(d.fotos ?? []).length > 0 ? ` <span style="font-size:11px;color:#9ca3af">[${d.fotos!.length} foto(s)]</span>` : ""}</p>
              </div>`).join("")}
          </div>`}
    </section>`;

  // ── Styles ────────────────────────────────────────────────────────────────
  const styles = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      font-size: 14px; color: #1a1f2e; background: #fff;
      padding: 32px 40px; max-width: 980px; margin: 0 auto;
    }
    h1 { font-size: 26px; font-weight: 600; color: #1a1f2e; }
    h2 { font-size: 17px; font-weight: 600; color: #1a1f2e; }
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
    .gantt-table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
    .gantt-th { padding: 8px 12px; font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7280; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
    .gantt-row td { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
    .gantt-label { font-size: 13.5px; font-weight: 600; color: #374151; }
    .gantt-dates { font-size: 12px; color: #6b7280; white-space: nowrap; }
    .gantt-bar-cell { padding-right: 8px !important; }
    .gantt-bar-track { position: relative; height: 20px; background: #f3f4f6; border-radius: 4px; overflow: hidden; }
    .gantt-bar { position: absolute; top: 0; height: 100%; border-radius: 4px; display: flex; align-items: center; padding: 0 6px; min-width: 8px; }
    .gantt-pct { font-size: 11px; color: #fff; font-weight: 700; white-space: nowrap; }
    .gantt-axis { display: flex; justify-content: space-between; font-size: 11px; color: #9ca3af; margin-top: 2px; padding: 0 12px; }
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
    .fin-td { padding: 11px 14px; font-size: 13.5px; border-bottom: 1px solid #f3f4f6; }
    .right { text-align: right; }
    .empty-cell { color: #9ca3af; font-style: italic; }
    .subtotal td { background: #f9fafb; }
    .total-row td { border-top: 2px solid #e5e7eb; font-size: 15px; }
    .green-row td { color: #16a34a; }
    .danger-row td { color: #dc2626; }
    .diario-list { display: flex; flex-direction: column; gap: 0; }
    .diario-entry { display: grid; grid-template-columns: 110px 1fr; gap: 12px; padding: 11px 0; border-bottom: 1px solid #f3f4f6; }
    .diario-meta { display: flex; flex-direction: column; gap: 3px; }
    .diario-data { font-size: 13px; font-weight: 700; color: #374151; }
    .diario-autor { font-size: 12px; color: #9ca3af; }
    .diario-conteudo { font-size: 13.5px; line-height: 1.6; color: #374151; }
    @media print {
      body { margin: 0; padding: 20px 28px; }
      .no-print { display: none !important; }
      .page-break-before { page-break-before: always; }
      a { color: inherit; text-decoration: none; }
      img { max-width: 100%; }
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
  ${ganttSection}
  ${checklistSection}
  ${financeiroSection}
  ${materiaisSection}
  ${fotosSection}
  ${diarioSection}
</body>
</html>`;
}
