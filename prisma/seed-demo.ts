/**
 * seed-demo.ts — Massa de dados para validação em produção
 *
 * Descobre a primeira empresa cadastrada e insere obras, terrenos
 * e vendas com estados variados (em andamento, parada, quitada, atrasada…).
 *
 * Idempotente: todos os registros usam upsert com IDs estáticos prefixados
 * com "sx-" — seguro rodar mais de uma vez.
 *
 * Uso na VM:
 *   docker exec -it prumo-canteiro-app-1 node /app/prisma/seed-demo.cjs
 */

import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const dbUrl = process.env.DATABASE_URL || "file:/app/data/prumo.db";
const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  const empresa = await prisma.empresa.findFirst({ orderBy: { criadoEm: "asc" } });
  if (!empresa) { console.error("Nenhuma empresa encontrada. Crie uma conta primeiro."); process.exit(1); }
  const eid = empresa.id;
  console.log(`\n→ Empresa: ${empresa.nome} (${eid})\n`);

  // ── Terrenos ──────────────────────────────────────────────────────────────
  const t = {
    t1: await prisma.terreno.upsert({ where: { id: "sx-t1" }, update: {}, create: {
      id: "sx-t1", empresaId: eid,
      nome: "Lote 03 — Residencial Aurora", numero: "LT-03",
      endereco: "Rua das Palmeiras, 320", cidade: "Ribeirão Preto",
      area: 450.0, status: "em_obra",
      aquisicao: new Date("2024-01-10"), valorCompra: 220000,
    }}),
    t2: await prisma.terreno.upsert({ where: { id: "sx-t2" }, update: {}, create: {
      id: "sx-t2", empresaId: eid,
      nome: "Quadra 8 — Park Sul", numero: "QD-08",
      endereco: "Av. do Contorno, 1.400", cidade: "Goiânia",
      area: 680.0, status: "disponivel",
      aquisicao: new Date("2024-05-22"), valorCompra: 310000,
    }}),
    t3: await prisma.terreno.upsert({ where: { id: "sx-t3" }, update: {}, create: {
      id: "sx-t3", empresaId: eid,
      nome: "Gleba Rural — Fazenda Boa Vista", numero: "GL-02",
      endereco: "Estrada Municipal s/n, km 4", cidade: "Uberaba",
      area: 2400.0, status: "negociacao",
      aquisicao: null, valorCompra: 480000,
    }}),
    t4: await prisma.terreno.upsert({ where: { id: "sx-t4" }, update: {}, create: {
      id: "sx-t4", empresaId: eid,
      nome: "Lote Comercial — Centro", numero: "LC-01",
      endereco: "Rua XV de Novembro, 88", cidade: "Curitiba",
      area: 200.0, status: "vendido",
      aquisicao: new Date("2023-08-15"), valorCompra: 540000,
    }}),
    t5: await prisma.terreno.upsert({ where: { id: "sx-t5" }, update: {}, create: {
      id: "sx-t5", empresaId: eid,
      nome: "Lote 11 — Parque das Nações", numero: "LT-11",
      endereco: "Rua Ipê Roxo, 90", cidade: "Belo Horizonte",
      area: 380.0, status: "em_obra",
      aquisicao: new Date("2023-11-30"), valorCompra: 175000,
    }}),
  };

  console.log("✓ 5 terrenos");

  // ── Obras ──────────────────────────────────────────────────────────────────
  const o = {
    o1: await prisma.obra.upsert({ where: { id: "sx-o1" }, update: {}, create: {
      id: "sx-o1", empresaId: eid, terrenoId: t.t1.id,
      nome: "Casa Térrea — Residencial Aurora",
      status: "em_andamento", orcamento: 320000,
      inicio: new Date("2024-03-01"), prazo: new Date("2024-11-30"),
      progresso: 71, responsavel: "Eng. Marcos Vinicius",
    }}),
    o2: await prisma.obra.upsert({ where: { id: "sx-o2" }, update: {}, create: {
      id: "sx-o2", empresaId: eid, terrenoId: t.t5.id,
      nome: "Sobrado 3 Qts — Parque das Nações",
      status: "em_andamento", orcamento: 480000,
      inicio: new Date("2024-01-10"), prazo: new Date("2024-10-31"),
      progresso: 88, responsavel: "Eng. Patrícia Rocha",
    }}),
    o3: await prisma.obra.upsert({ where: { id: "sx-o3" }, update: {}, create: {
      id: "sx-o3", empresaId: eid, terrenoId: t.t2.id,
      nome: "Galpão Logístico — Park Sul",
      status: "planejamento", orcamento: 950000,
      inicio: new Date("2025-01-15"), prazo: new Date("2025-10-30"),
      progresso: 0, responsavel: "Eng. André Campos",
    }}),
    o4: await prisma.obra.upsert({ where: { id: "sx-o4" }, update: {}, create: {
      id: "sx-o4", empresaId: eid, terrenoId: t.t4.id,
      nome: "Loja Comercial — Centro Curitiba",
      status: "concluida", orcamento: 180000,
      inicio: new Date("2023-09-01"), prazo: new Date("2024-03-31"),
      progresso: 100, responsavel: "Tec. Fernanda Alves",
    }}),
    o5: await prisma.obra.upsert({ where: { id: "sx-o5" }, update: {}, create: {
      id: "sx-o5", empresaId: eid, terrenoId: t.t1.id,
      nome: "Muro de Divisa — Aurora",
      status: "parada", orcamento: 28000,
      inicio: new Date("2024-05-01"), prazo: new Date("2024-06-30"),
      progresso: 40, responsavel: "Tec. Bruno Soares",
    }}),
    o6: await prisma.obra.upsert({ where: { id: "sx-o6" }, update: {}, create: {
      id: "sx-o6", empresaId: eid, terrenoId: t.t5.id,
      nome: "Edícula de Serviço — Parque das Nações",
      status: "em_andamento", orcamento: 95000,
      inicio: new Date("2024-06-01"), prazo: new Date("2024-09-30"),
      progresso: 55, responsavel: "Eng. Patrícia Rocha",
    }}),
  };

  console.log("✓ 6 obras");

  // ── Notas Fiscais ─────────────────────────────────────────────────────────
  const notas = [
    { id: "sx-nf1",  obraId: o.o1.id, fornecedor: "Areia & Brita Ltda",     numero: "NF-0421", categoria: "material",     valor: 8400,   emitidaEm: new Date("2024-03-15"), status: "confirmada",  descricao: "Areia lavada e brita 0" },
    { id: "sx-nf2",  obraId: o.o1.id, fornecedor: "Esquadrias Boa Vista",    numero: "NF-1102", categoria: "material",     valor: 14800,  emitidaEm: new Date("2024-05-08"), status: "confirmada",  descricao: "Janelas e portas" },
    { id: "sx-nf3",  obraId: o.o1.id, fornecedor: "Construtora Serviços ME", numero: null,      categoria: "servicos",    valor: 22000,  emitidaEm: new Date("2024-07-01"), status: "em_revisao",  descricao: "Serviços de alvenaria" },
    { id: "sx-nf4",  obraId: o.o2.id, fornecedor: "Revestimentos Premium",   numero: "NF-0882", categoria: "material",     valor: 31000,  emitidaEm: new Date("2024-02-20"), status: "confirmada",  descricao: "Porcelanato 90x90 sala e quartos" },
    { id: "sx-nf5",  obraId: o.o2.id, fornecedor: "Instaladora Elétrica RS",  numero: "NF-3311", categoria: "servicos",    valor: 18500,  emitidaEm: new Date("2024-04-15"), status: "confirmada",  descricao: "Instalação elétrica completa" },
    { id: "sx-nf6",  obraId: o.o2.id, fornecedor: "Cobertura Total",          numero: "NF-0771", categoria: "servicos",    valor: 12300,  emitidaEm: new Date("2024-06-10"), status: "confirmada",  descricao: "Estrutura metálica e telhas" },
    { id: "sx-nf7",  obraId: o.o2.id, fornecedor: "Pintura Coral LTDA",       numero: null,      categoria: "servicos",    valor: 9800,   emitidaEm: new Date("2024-08-22"), status: "pendente",    descricao: "Pintura externa e interna" },
    { id: "sx-nf8",  obraId: o.o4.id, fornecedor: "Vidraçaria Cristal",       numero: "NF-0234", categoria: "material",     valor: 11200,  emitidaEm: new Date("2023-10-05"), status: "confirmada",  descricao: "Fachada envidraçada" },
    { id: "sx-nf9",  obraId: o.o4.id, fornecedor: "Ar Condicionado Total",    numero: "NF-0456", categoria: "equipamentos", valor: 24600,  emitidaEm: new Date("2024-01-12"), status: "confirmada",  descricao: "Instalação de 4 splits inverter" },
    { id: "sx-nf10", obraId: o.o5.id, fornecedor: "Blocos & Tijolos SP",      numero: "NF-9901", categoria: "material",     valor: 6200,   emitidaEm: new Date("2024-05-03"), status: "confirmada",  descricao: "Blocos de vedação" },
    { id: "sx-nf11", obraId: o.o6.id, fornecedor: "Hidráulica & Conexões",    numero: "NF-0611", categoria: "servicos",    valor: 7400,   emitidaEm: new Date("2024-06-18"), status: "em_revisao",  descricao: "Instalação hidráulica completa" },
  ];
  for (const n of notas) {
    const { obraId, ...rest } = n;
    await prisma.notaFiscal.upsert({ where: { id: n.id }, update: {}, create: { ...rest, empresaId: eid, obraId } });
  }

  console.log("✓ 11 notas fiscais");

  // ── Vendas ────────────────────────────────────────────────────────────────
  // v1 — Quitada (100%)
  const v1 = await prisma.venda.upsert({ where: { id: "sx-v1" }, update: {}, create: {
    id: "sx-v1", empresaId: eid, terrenoId: t.t4.id,
    nomeComprador: "Fernanda Mota Carvalho",
    cpfCnpjComprador: "321.654.987-00",
    telefoneComprador: "(41) 99811-2233",
    emailComprador: "fernanda.mota@email.com",
    valorTotal: 620000, entrada: 120000,
    numeroParcelas: 10, diaVencimento: 10,
    dataContrato: new Date("2023-09-01"),
    observacoes: "Comprador pagou todas as parcelas antecipadamente. Escritura lavrada.",
  }});
  for (let i = 0; i < 10; i++) {
    await prisma.parcela.upsert({ where: { id: `sx-v1-p${i+1}` }, update: {}, create: {
      id: `sx-v1-p${i+1}`, vendaId: v1.id,
      numero: i + 1, vencimento: new Date(2023, 8 + i, 10),
      valor: 50000, status: "paga", pagoEm: new Date(2023, 8 + i, 8),
    }});
  }

  // v2 — Em pagamento normal (40% pago)
  const v2 = await prisma.venda.upsert({ where: { id: "sx-v2" }, update: {}, create: {
    id: "sx-v2", empresaId: eid, terrenoId: t.t1.id,
    nomeComprador: "Ricardo Alencar Pinto",
    cpfCnpjComprador: "456.123.789-11",
    telefoneComprador: "(16) 98822-4455",
    emailComprador: "ricardo.alencar@email.com",
    valorTotal: 380000, entrada: 50000,
    numeroParcelas: 18, diaVencimento: 15,
    dataContrato: new Date("2024-01-15"),
  }});
  for (let i = 0; i < 18; i++) {
    const venc = new Date(2024, 0 + i, 15);
    const paga = venc < new Date();
    await prisma.parcela.upsert({ where: { id: `sx-v2-p${i+1}` }, update: {}, create: {
      id: `sx-v2-p${i+1}`, vendaId: v2.id,
      numero: i + 1, vencimento: venc,
      valor: 18333.33, status: paga ? "paga" : "aberta",
      pagoEm: paga ? new Date(venc.getTime() - 2 * 86400000) : null,
    }});
  }

  // v3 — Em atraso (tem parcelas vencidas não pagas)
  const v3 = await prisma.venda.upsert({ where: { id: "sx-v3" }, update: {}, create: {
    id: "sx-v3", empresaId: eid, terrenoId: t.t5.id,
    nomeComprador: "Gustavo Henrique Lemos",
    cpfCnpjComprador: "789.456.123-22",
    telefoneComprador: "(31) 98833-5566",
    emailComprador: "gustavo.lemos@construtora.com",
    valorTotal: 290000, entrada: 40000,
    numeroParcelas: 12, diaVencimento: 5,
    dataContrato: new Date("2024-02-01"),
    observacoes: "Comprador solicitou renegociação em junho. Aguardando resposta.",
  }});
  for (let i = 0; i < 12; i++) {
    const venc = new Date(2024, 1 + i, 5);
    const passado = venc < new Date();
    const pago = passado && i < 3; // apenas 3 primeiras pagas
    await prisma.parcela.upsert({ where: { id: `sx-v3-p${i+1}` }, update: {}, create: {
      id: `sx-v3-p${i+1}`, vendaId: v3.id,
      numero: i + 1, vencimento: venc,
      valor: 20833.33,
      status: pago ? "paga" : passado ? "atrasada" : "aberta",
      pagoEm: pago ? new Date(venc.getTime() - 86400000) : null,
    }});
  }

  // v4 — Início recente, 2 parcelas pagas
  const v4 = await prisma.venda.upsert({ where: { id: "sx-v4" }, update: {}, create: {
    id: "sx-v4", empresaId: eid, terrenoId: t.t3.id,
    nomeComprador: "Cláudia Regina Borges",
    cpfCnpjComprador: "147.258.369-33",
    telefoneComprador: "(34) 99744-6677",
    emailComprador: "claudia.borges@email.com",
    valorTotal: 520000, entrada: 70000,
    numeroParcelas: 24, diaVencimento: 20,
    dataContrato: new Date("2024-04-20"),
  }});
  for (let i = 0; i < 24; i++) {
    const venc = new Date(2024, 3 + i, 20);
    const pago = i < 2;
    await prisma.parcela.upsert({ where: { id: `sx-v4-p${i+1}` }, update: {}, create: {
      id: `sx-v4-p${i+1}`, vendaId: v4.id,
      numero: i + 1, vencimento: venc,
      valor: 18750,
      status: pago ? "paga" : "aberta",
      pagoEm: pago ? new Date(venc.getTime() - 86400000) : null,
    }});
  }

  // v5 — Atraso severo (5 parcelas atrasadas)
  const v5 = await prisma.venda.upsert({ where: { id: "sx-v5" }, update: {}, create: {
    id: "sx-v5", empresaId: eid, terrenoId: t.t2.id,
    nomeComprador: "Márcio Augusto Ferreira",
    cpfCnpjComprador: "963.852.741-44",
    telefoneComprador: "(62) 98855-7788",
    emailComprador: "marcio.ferreira@email.com",
    valorTotal: 410000, entrada: 60000,
    numeroParcelas: 20, diaVencimento: 1,
    dataContrato: new Date("2023-12-01"),
    observacoes: "Inadimplente desde março/2024. Notificação extrajudicial enviada.",
  }});
  for (let i = 0; i < 20; i++) {
    const venc = new Date(2023, 11 + i, 1);
    const passado = venc < new Date();
    const pago = i < 3; // só 3 pagas
    await prisma.parcela.upsert({ where: { id: `sx-v5-p${i+1}` }, update: {}, create: {
      id: `sx-v5-p${i+1}`, vendaId: v5.id,
      numero: i + 1, vencimento: venc,
      valor: 17500,
      status: pago ? "paga" : passado ? "atrasada" : "aberta",
      pagoEm: pago ? new Date(venc.getTime() - 86400000) : null,
    }});
  }

  console.log("✓ 5 vendas (quitada, em pagamento, 2× em atraso, recente)");

  console.log(`
✅ Seed-demo concluído para "${empresa.nome}"
   5 terrenos · 6 obras · 11 NFs · 5 vendas (89 parcelas)
  `);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
