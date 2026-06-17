import { fmtBRL } from "./format";

interface ContratoParams {
  numeroContrato: string;
  dataContrato: string;
  cidade: string;
  nomeEmpresa: string;
  logoEmpresa: string | null;
  nomeComprador: string;
  cpfCnpjComprador: string | null;
  telefoneComprador: string | null;
  emailComprador: string | null;
  nomeLote: string;
  cidadeLote: string;
  areaLote: string | null;
  valorTotal: number;
  entrada: number;
  numeroParcelas: number;
  diaVencimento: number;
  parcelas: Array<{ numero: number; valor: number; vencimento: string | null }>;
  observacoes: string | null;
  contratoAssinadoEm: string | null;
}

function ptDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function ptDateLong(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
}

function valorPorExtenso(n: number): string {
  if (n <= 0) return "zero reais";
  const inteiro = Math.floor(n);
  const centavos = Math.round((n - inteiro) * 100);
  const reaisStr = porExtenso(inteiro);
  if (centavos === 0) return `${reaisStr} reais`;
  return `${reaisStr} reais e ${porExtenso(centavos)} centavos`;
}

function porExtenso(n: number): string {
  if (n === 0) return "zero";
  const u = ["","um","dois","três","quatro","cinco","seis","sete","oito","nove","dez",
    "onze","doze","treze","quatorze","quinze","dezesseis","dezessete","dezoito","dezenove"];
  const d = ["","","vinte","trinta","quarenta","cinquenta","sessenta","setenta","oitenta","noventa"];
  const c = ["","cem","duzentos","trezentos","quatrocentos","quinhentos","seiscentos","setecentos","oitocentos","novecentos"];
  if (n < 20) return u[n];
  if (n < 100) return d[Math.floor(n/10)] + (n%10 ? " e " + u[n%10] : "");
  if (n < 1000) {
    const resto = n % 100;
    const cent = Math.floor(n/100);
    if (n === 100) return "cem";
    return c[cent] + (resto ? " e " + porExtenso(resto) : "");
  }
  if (n < 1000000) {
    const mil = Math.floor(n/1000);
    const resto = n % 1000;
    return (mil === 1 ? "mil" : porExtenso(mil) + " mil") + (resto ? " e " + porExtenso(resto) : "");
  }
  return String(n);
}

export function buildContratoHTML(d: ContratoParams): string {
  const valorParcela = d.numeroParcelas > 0
    ? (d.valorTotal - d.entrada) / d.numeroParcelas
    : 0;

  const tabelaParcelas = d.parcelas.map(p => `
    <tr>
      <td style="text-align:center">${p.numero}ª</td>
      <td style="text-align:center">${ptDate(p.vencimento)}</td>
      <td style="text-align:right">${fmtBRL(p.valor)}</td>
    </tr>`).join("");

  const assinaturaStatus = d.contratoAssinadoEm
    ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:10px 16px;margin-bottom:20px;font-size:10pt;color:#15803d;text-align:center">
        ✓ Contrato assinado digitalmente em ${ptDate(d.contratoAssinadoEm)}
       </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Contrato — ${d.nomeComprador} — ${d.nomeLote}</title>
  <style>
    @page { size: A4; margin: 2.5cm 2.2cm; }
    @media print { .no-print { display: none !important; } body { margin: 0; } }
    * { box-sizing: border-box; }
    body {
      font-family: "Times New Roman", Times, serif;
      font-size: 11.5pt;
      line-height: 1.75;
      color: #000;
      max-width: 860px;
      margin: 0 auto;
      padding: 32px 40px;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #1e3a5f;
      padding-bottom: 16px;
      margin-bottom: 22px;
    }
    .header-empresa {
      font-size: 13pt;
      font-weight: bold;
      color: #1e3a5f;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .header-sub { font-size: 9.5pt; color: #555; margin-top: 2px; }
    h1 {
      font-size: 13pt;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin: 0 0 4px;
      color: #000;
    }
    .num-contrato {
      text-align: center;
      font-size: 10pt;
      color: #444;
      margin-bottom: 22px;
    }
    .clausula-titulo {
      font-size: 11.5pt;
      font-weight: bold;
      text-transform: uppercase;
      margin: 22px 0 6px;
      border-bottom: 1px solid #ccc;
      padding-bottom: 3px;
      color: #1e3a5f;
    }
    p { margin: 0 0 10px; text-align: justify; }
    .qualif-box {
      border: 1px solid #bbb;
      border-radius: 4px;
      padding: 10px 16px;
      margin: 10px 0 14px;
      font-size: 10.5pt;
      line-height: 1.7;
      background: #fafafa;
    }
    .qualif-box .label { font-weight: bold; display: inline-block; min-width: 90px; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10.5pt;
      margin: 12px 0;
    }
    thead th {
      background: #1e3a5f;
      color: #fff;
      padding: 7px 10px;
      text-align: center;
      font-weight: 700;
    }
    tbody td { padding: 6px 10px; border-bottom: 1px solid #e5e7eb; }
    tbody tr:nth-child(even) td { background: #f8fafc; }
    .total-row td { font-weight: bold; border-top: 2px solid #1e3a5f; }
    .assinatura-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 60px;
    }
    .assinatura-item { text-align: center; }
    .assinatura-linha {
      border-top: 1px solid #000;
      margin-bottom: 6px;
      margin-top: 50px;
    }
    .assinatura-nome { font-weight: bold; font-size: 10.5pt; }
    .assinatura-cargo { font-size: 9.5pt; color: #555; }
    .testemunhas-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 48px;
    }
    .rodape {
      margin-top: 40px;
      font-size: 8.5pt;
      color: #888;
      border-top: 1px solid #ddd;
      padding-top: 8px;
      text-align: center;
    }
    .btn-print {
      display: block;
      margin: 0 auto 24px;
      padding: 10px 36px;
      background: #1e3a5f;
      color: #fff;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      cursor: pointer;
      font-family: sans-serif;
      letter-spacing: 0.5px;
    }
    .destaque { font-weight: bold; }
  </style>
</head>
<body>
  <button class="no-print btn-print" onclick="window.print()">🖨 Imprimir / Salvar como PDF</button>

  ${assinaturaStatus}

  <div class="header">
    ${d.logoEmpresa
      ? `<img src="${d.logoEmpresa}" alt="Logo" style="max-height:70px;max-width:220px;object-fit:contain;margin-bottom:8px;display:block;margin-left:auto;margin-right:auto" />`
      : `<div class="header-empresa">${d.nomeEmpresa}</div>`
    }
    <div class="header-sub">${d.logoEmpresa ? `<strong>${d.nomeEmpresa}</strong> — ` : ""}Incorporação e Gestão Imobiliária</div>
  </div>

  <h1>Contrato Particular de Promessa de Compra e Venda</h1>
  <div class="num-contrato">
    Contrato nº ${d.numeroContrato} &nbsp;·&nbsp; ${d.cidade}, ${ptDateLong(d.dataContrato)}
  </div>

  <div class="clausula-titulo">Cláusula I — Das Partes</div>

  <p>Pelo presente instrumento particular, as partes abaixo qualificadas celebram entre si o presente <strong>Contrato Particular de Promessa de Compra e Venda</strong> de imóvel/lote, que se rege pelas cláusulas e condições seguintes:</p>

  <p><strong>PROMITENTE VENDEDORA:</strong></p>
  <div class="qualif-box">
    <div><span class="label">Razão Social:</span> ${d.nomeEmpresa}</div>
    <div><span class="label">Natureza:</span> Pessoa Jurídica de direito privado</div>
  </div>

  <p><strong>PROMITENTE COMPRADORA:</strong></p>
  <div class="qualif-box">
    <div><span class="label">Nome:</span> ${d.nomeComprador}</div>
    ${d.cpfCnpjComprador ? `<div><span class="label">CPF/CNPJ:</span> ${d.cpfCnpjComprador}</div>` : ""}
    ${d.telefoneComprador ? `<div><span class="label">Telefone:</span> ${d.telefoneComprador}</div>` : ""}
    ${d.emailComprador ? `<div><span class="label">E-mail:</span> ${d.emailComprador}</div>` : ""}
  </div>

  <div class="clausula-titulo">Cláusula II — Do Objeto</div>

  <p>
    O presente contrato tem por objeto a promessa de venda e compra do seguinte imóvel/lote:
  </p>
  <div class="qualif-box">
    <div><span class="label">Identificação:</span> ${d.nomeLote}</div>
    <div><span class="label">Município/UF:</span> ${d.cidadeLote}</div>
    ${d.areaLote ? `<div><span class="label">Área total:</span> ${d.areaLote} m²</div>` : ""}
  </div>
  <p>
    A PROMITENTE VENDEDORA declara que o imóvel descrito acima está livre e desembaraçado
    de quaisquer ônus, dívidas, hipotecas, penhoras ou litígios que possam impedir ou
    afetar a transferência ao(à) PROMITENTE COMPRADORA.
  </p>

  <div class="clausula-titulo">Cláusula III — Do Preço e Forma de Pagamento</div>

  <p>
    O preço total da compra e venda é de <span class="destaque">${fmtBRL(d.valorTotal)}</span>
    (${valorPorExtenso(d.valorTotal)}), a ser pago da seguinte forma:
  </p>

  <table>
    <thead>
      <tr>
        <th style="width:30%">Modalidade</th>
        <th style="width:40%">Condição</th>
        <th style="width:30%">Valor</th>
      </tr>
    </thead>
    <tbody>
      ${d.entrada > 0 ? `
      <tr>
        <td>Entrada (sinal)</td>
        <td>Na assinatura do contrato</td>
        <td style="text-align:right">${fmtBRL(d.entrada)}</td>
      </tr>` : ""}
      <tr>
        <td>${d.numeroParcelas}x parcelas mensais</td>
        <td>Vencimento todo dia ${d.diaVencimento}</td>
        <td style="text-align:right">${fmtBRL(valorParcela)} / parcela</td>
      </tr>
      <tr class="total-row">
        <td colspan="2"><strong>Total</strong></td>
        <td style="text-align:right"><strong>${fmtBRL(d.valorTotal)}</strong></td>
      </tr>
    </tbody>
  </table>

  <p>
    As parcelas mensais serão pagas até o dia <strong>${d.diaVencimento}</strong> de cada mês,
    por depósito/transferência bancária ou boleto emitido pela PROMITENTE VENDEDORA.
    Sobre as parcelas em atraso incidirão <strong>juros de mora de 1% (um por cento) ao mês</strong>
    e <strong>multa de 2% (dois por cento)</strong> sobre o valor da parcela vencida, calculados
    pro rata die, independentemente de notificação judicial ou extrajudicial.
  </p>

  <p style="font-size:11pt;font-weight:bold;margin:16px 0 6px">Cronograma de parcelas:</p>
  <table>
    <thead>
      <tr><th>Parcela</th><th>Vencimento</th><th>Valor</th></tr>
    </thead>
    <tbody>
      ${tabelaParcelas}
    </tbody>
  </table>

  <div class="clausula-titulo">Cláusula IV — Da Posse e Transferência</div>

  <p>
    A posse do imóvel será transferida ao(à) PROMITENTE COMPRADOR(A) somente após a
    quitação integral do preço e assinatura da escritura definitiva de compra e venda,
    a ser lavrada em Cartório de Notas competente, às expensas do(a) comprador(a),
    incluindo ITBI, emolumentos e demais encargos legais.
  </p>
  <p>
    Enquanto não quitado o saldo devedor, o imóvel permanece na posse indireta da
    PROMITENTE VENDEDORA, respondendo o(a) comprador(a) por todos os tributos, taxas
    e encargos incidentes sobre o imóvel a partir da data de entrega das chaves ou
    da data deste contrato, o que ocorrer primeiro.
  </p>

  <div class="clausula-titulo">Cláusula V — Das Obrigações das Partes</div>

  <p>
    <strong>5.1 — Da PROMITENTE VENDEDORA:</strong> (i) manter o imóvel livre de ônus
    até a outorga da escritura definitiva; (ii) fornecer toda documentação necessária
    para a transferência; (iii) emitir recibos de cada pagamento efetuado.
  </p>
  <p>
    <strong>5.2 — Do(a) PROMITENTE COMPRADOR(A):</strong> (i) efetuar os pagamentos
    nas datas avençadas; (ii) não realizar benfeitorias no imóvel sem autorização prévia
    e por escrito da VENDEDORA, enquanto não outorgada a escritura definitiva; (iii)
    comunicar imediatamente qualquer alteração de dados cadastrais ou de contato.
  </p>

  <div class="clausula-titulo">Cláusula VI — Da Rescisão</div>

  <p>
    O presente contrato poderá ser rescindido nas seguintes hipóteses:
  </p>
  <p>
    <strong>6.1 — Por inadimplemento do(a) COMPRADOR(A):</strong> O atraso superior a
    <strong>60 (sessenta) dias</strong> no pagamento de qualquer parcela facultará à
    VENDEDORA rescindir o contrato de pleno direito, mediante notificação extrajudicial,
    retendo <strong>20% (vinte por cento)</strong> dos valores já pagos a título de
    cláusula penal compensatória e despesas administrativas, devolvendo o saldo
    remanescente no prazo de 90 (noventa) dias, em observância ao art. 53 do CDC.
  </p>
  <p>
    <strong>6.2 — Por acordo mútuo:</strong> As partes poderão resilir o contrato
    mediante instrumento particular assinado por ambas, definindo as condições de
    devolução dos valores pagos.
  </p>

  <div class="clausula-titulo">Cláusula VII — Do Foro</div>

  <p>
    As partes elegem o foro da Comarca de <strong>${d.cidadeLote}</strong> para dirimir
    quaisquer litígios decorrentes do presente contrato, com renúncia expressa a
    qualquer outro, por mais privilegiado que seja.
  </p>

  ${d.observacoes ? `
  <div class="clausula-titulo">Cláusula VIII — Disposições Adicionais</div>
  <p>${d.observacoes}</p>
  ` : ""}

  <p style="margin-top:22px">
    E por estarem justas e contratadas, as partes assinam o presente instrumento em
    2 (duas) vias de igual teor e forma, na presença de 2 (duas) testemunhas.
  </p>

  <p style="text-align:center;margin-top:8px">
    ${d.cidade}, ${ptDateLong(d.dataContrato)}
  </p>

  <div class="assinatura-grid">
    <div class="assinatura-item">
      <div class="assinatura-linha"></div>
      <div class="assinatura-nome">${d.nomeEmpresa}</div>
      <div class="assinatura-cargo">Promitente Vendedora</div>
    </div>
    <div class="assinatura-item">
      <div class="assinatura-linha"></div>
      <div class="assinatura-nome">${d.nomeComprador}</div>
      <div class="assinatura-cargo">Promitente Comprador(a)${d.cpfCnpjComprador ? `<br>CPF/CNPJ: ${d.cpfCnpjComprador}` : ""}</div>
    </div>
  </div>

  <div class="testemunhas-grid">
    <div class="assinatura-item">
      <div class="assinatura-linha"></div>
      <div class="assinatura-nome">Testemunha 1</div>
      <div class="assinatura-cargo">Nome: ____________________<br>CPF: ____________________</div>
    </div>
    <div class="assinatura-item">
      <div class="assinatura-linha"></div>
      <div class="assinatura-nome">Testemunha 2</div>
      <div class="assinatura-cargo">Nome: ____________________<br>CPF: ____________________</div>
    </div>
  </div>

  <div class="rodape">
    Documento gerado pelo sistema PrumoCanteiro · Contrato nº ${d.numeroContrato} ·
    ${d.nomeComprador} · ${d.nomeLote}, ${d.cidadeLote}
    ${d.contratoAssinadoEm ? `<br>Assinado digitalmente em ${ptDate(d.contratoAssinadoEm)}` : ""}
  </div>
</body>
</html>`;
}
