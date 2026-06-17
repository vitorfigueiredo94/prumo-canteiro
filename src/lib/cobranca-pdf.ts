import { fmtBRL } from "./format";

interface NotificacaoParams {
  nomeEmpresa: string;
  cnpjEmpresa: string;
  logoEmpresa?: string | null;
  nomeComprador: string;
  cpfComprador: string | null;
  enderecoComprador: string;
  numeroParcela: number;
  valorParcela: number;
  dataVencimento: string;
  diasAtraso: number;
  numeroContrato: string;
  cidade: string;
  dataAtual: string;
}

export function buildNotificacaoHTML(d: NotificacaoParams): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Notificação Extrajudicial — Parcela ${d.numeroParcela}</title>
  <style>
    @page { size: A4; margin: 3cm 2.5cm; }
    @media print { .no-print { display: none !important; } body { margin: 0; } }
    * { box-sizing: border-box; }
    body { font-family: "Times New Roman", Times, serif; font-size: 12pt; line-height: 1.8; color: #000; max-width: 820px; margin: 32px auto; padding: 0 40px; }
    h1 { font-size: 14pt; text-align: center; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 4px; }
    .subtitulo { text-align: center; font-size: 10pt; color: #444; margin: 0 0 28px; }
    .dados { border: 1px solid #000; padding: 12px 16px; margin-bottom: 22px; font-size: 11pt; line-height: 1.6; }
    .dados strong { display: inline-block; min-width: 130px; }
    p { margin: 0 0 14px; text-align: justify; }
    .valor-destaque { font-weight: bold; }
    .assinatura { margin-top: 64px; text-align: center; }
    .assinatura .linha { display: inline-block; width: 280px; border-top: 1px solid #000; margin-top: 4px; }
    .rodape { margin-top: 36px; font-size: 9pt; color: #666; border-top: 1px solid #ccc; padding-top: 8px; }
    .btn-print { display: block; margin: 20px auto; padding: 10px 32px; background: #1e3a5f; color: #fff; border: none; border-radius: 6px; font-size: 13px; cursor: pointer; font-family: sans-serif; }
  </style>
</head>
<body>
  <button class="no-print btn-print" onclick="window.print()">Imprimir / Salvar como PDF</button>

  ${d.logoEmpresa ? `<div style="text-align:center;margin-bottom:16px"><img src="${d.logoEmpresa}" alt="Logo" style="max-height:64px;max-width:200px;object-fit:contain" /></div>` : ""}
  <h1>Notificação Extrajudicial</h1>
  <p class="subtitulo">Nos termos do Código Civil art. 397 c/c CDC arts. 42 e 43</p>

  <div class="dados">
    <div><strong>NOTIFICANTE:</strong> ${d.nomeEmpresa} — CNPJ ${d.cnpjEmpresa}</div>
    <div><strong>NOTIFICADO(A):</strong> ${d.nomeComprador}${d.cpfComprador ? ` — CPF ${d.cpfComprador}` : ""}</div>
    <div><strong>ENDEREÇO:</strong> ${d.enderecoComprador}</div>
    <div><strong>CONTRATO:</strong> Nº ${d.numeroContrato}</div>
    <div><strong>REFERÊNCIA:</strong> Parcela nº ${d.numeroParcela} — vencimento ${d.dataVencimento}</div>
  </div>

  <p>
    Pela presente, <strong>${d.nomeEmpresa}</strong> (doravante "NOTIFICANTE"), qualificada acima,
    vem, nos termos do artigo 397 do Código Civil Brasileiro (Lei nº 10.406/2002), artigos 42
    e 43 do Código de Defesa do Consumidor (Lei nº 8.078/1990) e demais disposições legais
    aplicáveis, <strong>NOTIFICAR EXTRAJUDICIALMENTE</strong> V.Sa., qualificado acima
    (doravante "NOTIFICADO"), acerca do que segue.
  </p>

  <p>
    Consta nos registros da NOTIFICANTE que a <strong>parcela nº ${d.numeroParcela}</strong>
    referente ao contrato de compra e venda de imóvel/lote nº ${d.numeroContrato},
    no valor de <span class="valor-destaque">${fmtBRL(d.valorParcela)}</span>,
    com data de vencimento em <strong>${d.dataVencimento}</strong>, encontra-se em aberto
    há <strong>${d.diasAtraso} (${porExtenso(d.diasAtraso)}) dias corridos</strong>,
    caracterizando inadimplemento contratual, nos termos da cláusula de pagamento avençada.
  </p>

  <p>
    Diante do exposto, fica V.Sa. formalmente <strong>NOTIFICADO(A)</strong> a proceder
    à quitação integral do débito acima mencionado, acrescido dos encargos moratórios
    previstos em contrato — correspondentes a juros de mora de 1% (um por cento) ao mês
    e multa contratual de 2% (dois por cento) sobre o valor em atraso —,
    no prazo <strong>improrrogável de 72 (setenta e duas) horas</strong>
    a contar do recebimento da presente notificação.
  </p>

  <p>
    Advertimos que o não atendimento da presente notificação no prazo estipulado acarretará,
    sem necessidade de nova comunicação: (i) encaminhamento do título para
    <strong>protesto no Cartório de Títulos e Documentos</strong> competente;
    (ii) negativação nos órgãos de proteção ao crédito (SPC/Serasa), nos termos do
    art. 43 do CDC; e (iii) ajuizamento de ação de cobrança e/ou execução extrajudicial,
    com imputação ao débito principal de custas processuais e honorários advocatícios
    na forma do art. 395 do Código Civil.
  </p>

  <p>
    A presente notificação é enviada ao endereço cadastrado e por meios eletrônicos
    (WhatsApp/e-mail), valendo como notificação formal para todos os fins de direito,
    nos termos do art. 1º da Lei nº 9.507/1997 e art. 246, §1º do CPC.
  </p>

  <div class="assinatura">
    <p>${d.cidade}, ${d.dataAtual}</p>
    <br>
    <p>
      <div class="linha"></div><br>
      <strong>${d.nomeEmpresa}</strong><br>
      Setor Jurídico-Financeiro<br>
      CNPJ: ${d.cnpjEmpresa}
    </p>
  </div>

  <div class="rodape">
    Documento gerado automaticamente pelo sistema PrumoCanteiro em ${d.dataAtual}.
    Esta notificação extrajudicial tem validade jurídica nos termos da legislação vigente.
    Ref.: Parcela ${d.numeroParcela} | Contrato ${d.numeroContrato} | ${d.diasAtraso} dias em atraso
  </div>
</body>
</html>`;
}

function porExtenso(n: number): string {
  const u = ["zero","um","dois","três","quatro","cinco","seis","sete","oito","nove","dez",
    "onze","doze","treze","quatorze","quinze","dezesseis","dezessete","dezoito","dezenove"];
  const d = ["","","vinte","trinta","quarenta","cinquenta","sessenta","setenta","oitenta","noventa"];
  if (n < 20) return u[n];
  if (n < 100) return d[Math.floor(n/10)] + (n%10 ? " e " + u[n%10] : "");
  return `${n}`;
}
