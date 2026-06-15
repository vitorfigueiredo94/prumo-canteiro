import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { scryptSync, randomBytes } from "crypto";

const dbUrl = process.env.DATABASE_URL || "file:/app/data/prumo.db";
const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

function hashPwd(pwd: string): string {
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(pwd, salt, 64) as Buffer;
  return `${salt}:${key.toString("hex")}`;
}

async function main() {
  // ── Planos ──────────────────────────────────────────────────────────────
  await prisma.plano.upsert({
    where: { id: "plano-basico" },
    update: {},
    create: {
      id: "plano-basico",
      nome: "Básico", preco: 99.0,
      limiteObras: 5, limiteUsuarios: 2,
      recursos: JSON.stringify(["Obras e terrenos", "Notas fiscais", "Funcionários"]),
    },
  });

  const planoPro = await prisma.plano.upsert({
    where: { id: "plano-pro" },
    update: {},
    create: {
      id: "plano-pro",
      nome: "Profissional", preco: 199.0,
      limiteObras: 20, limiteUsuarios: 5, destaque: true,
      recursos: JSON.stringify(["Tudo do Básico", "Vendas de terrenos", "Fluxo de caixa", "Diário de obra"]),
    },
  });

  await prisma.plano.upsert({
    where: { id: "plano-empresa" },
    update: {},
    create: {
      id: "plano-empresa",
      nome: "Empresa", preco: 399.0,
      recursos: JSON.stringify(["Tudo do Profissional", "Obras ilimitadas", "Suporte prioritário"]),
    },
  });

  // ── Empresa demo ────────────────────────────────────────────────────────
  const empresa = await prisma.empresa.upsert({
    where: { id: "empresa-demo" },
    update: {},
    create: { id: "empresa-demo", nome: "Construtora Demo Ltda." },
  });

  await prisma.assinatura.upsert({
    where: { empresaId: empresa.id },
    update: {},
    create: {
      empresaId: empresa.id, planoId: planoPro.id,
      status: "trial",
      proximaCobranca: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });

  // ── Usuário demo ─────────────────────────────────────────────────────────
  await prisma.usuario.upsert({
    where: { email: "demo@prumo.com" },
    update: {},
    create: {
      id: "usuario-demo",
      empresaId: empresa.id,
      nome: "Usuário Demo",
      email: "demo@prumo.com",
      passwordHash: hashPwd("demo123"),
    },
  });

  // ── Terrenos ────────────────────────────────────────────────────────────
  const t1 = await prisma.terreno.upsert({
    where: { id: "terreno-1" },
    update: {},
    create: {
      id: "terreno-1", empresaId: empresa.id,
      nome: "Lote 01 — Residencial Pinheiros", numero: "LT-01",
      endereco: "Rua das Acácias, 100", cidade: "São Paulo",
      area: 360.0, status: "em_obra",
      aquisicao: new Date("2024-03-15"), valorCompra: 280000.0,
    },
  });

  const t2 = await prisma.terreno.upsert({
    where: { id: "terreno-2" },
    update: {},
    create: {
      id: "terreno-2", empresaId: empresa.id,
      nome: "Lote 07 — Condomínio Serra Verde", numero: "LT-07",
      endereco: "Estrada da Serra, km 12", cidade: "Guarulhos",
      area: 520.0, status: "disponivel",
      aquisicao: new Date("2024-06-01"), valorCompra: 180000.0,
    },
  });

  const t3 = await prisma.terreno.upsert({
    where: { id: "terreno-3" },
    update: {},
    create: {
      id: "terreno-3", empresaId: empresa.id,
      nome: "Lote 12 — Centro Comercial", numero: "LT-12",
      endereco: "Av. Paulista, 2000", cidade: "São Paulo",
      area: 180.0, status: "vendido",
      aquisicao: new Date("2023-11-10"), valorCompra: 450000.0,
    },
  });

  const t4 = await prisma.terreno.upsert({
    where: { id: "terreno-4" },
    update: {},
    create: {
      id: "terreno-4", empresaId: empresa.id,
      nome: "Lote 05 — Jardim das Flores", numero: "LT-05",
      endereco: "Rua Ipê Amarelo, 250", cidade: "Campinas",
      area: 420.0, status: "em_obra",
      aquisicao: new Date("2024-01-20"), valorCompra: 195000.0,
    },
  });

  // ── Obras ───────────────────────────────────────────────────────────────
  const o1 = await prisma.obra.upsert({
    where: { id: "obra-1" },
    update: {},
    create: {
      id: "obra-1", empresaId: empresa.id, terrenoId: t1.id,
      nome: "Casa Residencial — Pinheiros",
      status: "em_andamento", orcamento: 380000.0,
      inicio: new Date("2024-04-01"), prazo: new Date("2024-12-31"),
      progresso: 62, responsavel: "Eng. Carlos Mendes",
    },
  });

  const o2 = await prisma.obra.upsert({
    where: { id: "obra-2" },
    update: {},
    create: {
      id: "obra-2", empresaId: empresa.id, terrenoId: t2.id,
      nome: "Galpão Industrial — Guarulhos",
      status: "planejamento", orcamento: 620000.0,
      inicio: new Date("2025-02-01"), prazo: new Date("2025-09-30"),
      progresso: 0, responsavel: "Eng. Ana Souza",
    },
  });

  const o3 = await prisma.obra.upsert({
    where: { id: "obra-3" },
    update: {},
    create: {
      id: "obra-3", empresaId: empresa.id, terrenoId: t4.id,
      nome: "Sobrado Duplex — Campinas",
      status: "em_andamento", orcamento: 290000.0,
      inicio: new Date("2024-02-15"), prazo: new Date("2024-10-15"),
      progresso: 85, responsavel: "Eng. Carlos Mendes",
    },
  });

  const o4 = await prisma.obra.upsert({
    where: { id: "obra-4" },
    update: {},
    create: {
      id: "obra-4", empresaId: empresa.id, terrenoId: t1.id,
      nome: "Reforma Fachada — Pinheiros",
      status: "concluida", orcamento: 45000.0,
      inicio: new Date("2024-01-10"), prazo: new Date("2024-03-20"),
      progresso: 100, responsavel: "Tec. Roberto Lima",
    },
  });

  // ── Funcionários ────────────────────────────────────────────────────────
  const f1 = await prisma.funcionario.upsert({
    where: { id: "func-1" },
    update: {},
    create: {
      id: "func-1", empresaId: empresa.id,
      nome: "João Silva", cargo: "Pedreiro",
      cpf: "123.456.789-01",
      telefone: "(11) 97777-1111", salario: 3200.0, status: "ativo",
      admissao: new Date("2024-04-01"),
    },
  });

  const f2 = await prisma.funcionario.upsert({
    where: { id: "func-2" },
    update: {},
    create: {
      id: "func-2", empresaId: empresa.id,
      nome: "Pedro Oliveira", cargo: "Mestre de Obras",
      cpf: "234.567.890-02",
      telefone: "(11) 98888-2222", salario: 5200.0, status: "ativo",
      admissao: new Date("2024-04-01"),
    },
  });

  const f3 = await prisma.funcionario.upsert({
    where: { id: "func-3" },
    update: {},
    create: {
      id: "func-3", empresaId: empresa.id,
      nome: "Maria Costa", cargo: "Servente",
      cpf: "345.678.901-03",
      telefone: "(11) 96666-3333", salario: 2100.0, status: "ativo",
      admissao: new Date("2024-05-10"),
    },
  });

  const f4 = await prisma.funcionario.upsert({
    where: { id: "func-4" },
    update: {},
    create: {
      id: "func-4", empresaId: empresa.id,
      nome: "Carlos Ramos", cargo: "Eletricista",
      cpf: "456.789.012-04",
      telefone: "(11) 95555-4444", salario: 4100.0, status: "ativo",
      admissao: new Date("2024-03-01"),
    },
  });

  const f5 = await prisma.funcionario.upsert({
    where: { id: "func-5" },
    update: {},
    create: {
      id: "func-5", empresaId: empresa.id,
      nome: "Ana Lima", cargo: "Pintora",
      cpf: "567.890.123-05",
      telefone: "(11) 94444-5555", salario: 2800.0, status: "ativo",
      admissao: new Date("2024-06-15"),
    },
  });

  const f6 = await prisma.funcionario.upsert({
    where: { id: "func-6" },
    update: {},
    create: {
      id: "func-6", empresaId: empresa.id,
      nome: "Roberto Santos", cargo: "Encanador",
      cpf: "678.901.234-06",
      telefone: "(11) 93333-6666", salario: 3600.0, status: "inativo",
      admissao: new Date("2024-01-10"),
    },
  });

  // ── Alocações ───────────────────────────────────────────────────────────
  const alocacoes = [
    { id: "aloc-f1-o1", funcionarioId: f1.id, obraId: o1.id, cargo: "Pedreiro", inicio: new Date("2024-04-01") },
    { id: "aloc-f2-o1", funcionarioId: f2.id, obraId: o1.id, cargo: "Mestre de obras", inicio: new Date("2024-04-01") },
    { id: "aloc-f3-o1", funcionarioId: f3.id, obraId: o1.id, cargo: "Servente", inicio: new Date("2024-04-01") },
    { id: "aloc-f4-o1", funcionarioId: f4.id, obraId: o1.id, cargo: "Eletricista", inicio: new Date("2024-06-01") },
    { id: "aloc-f1-o3", funcionarioId: f1.id, obraId: o3.id, cargo: "Pedreiro", inicio: new Date("2024-02-15") },
    { id: "aloc-f5-o3", funcionarioId: f5.id, obraId: o3.id, cargo: "Pintora", inicio: new Date("2024-07-01") },
    { id: "aloc-f2-o3", funcionarioId: f2.id, obraId: o3.id, cargo: "Mestre de obras", inicio: new Date("2024-02-15") },
  ];
  for (const a of alocacoes) {
    await prisma.alocacaoFuncionario.upsert({ where: { id: a.id }, update: {}, create: a });
  }

  // ── Notas fiscais ────────────────────────────────────────────────────────
  const notas = [
    { id: "nf-1", obraId: o1.id, fornecedor: "Madeiras São João Ltda.", numero: "001234", categoria: "material", valor: 12500.0, emitidaEm: new Date("2024-05-10"), status: "confirmada", descricao: "Madeira para estrutura" },
    { id: "nf-2", obraId: o1.id, fornecedor: "Eletro Construções ME", numero: "005678", categoria: "servicos", valor: 8200.0, emitidaEm: new Date("2024-06-05"), status: "confirmada", descricao: "Instalação elétrica fase 1" },
    { id: "nf-3", obraId: o1.id, fornecedor: "Cimento Forte", numero: null, categoria: "material", valor: 5800.0, emitidaEm: new Date("2024-07-20"), status: "pendente", descricao: "Cimento CP-II 50 sacos" },
    { id: "nf-4", obraId: o1.id, fornecedor: "Hidráulica Total", numero: "009012", categoria: "servicos", valor: 6400.0, emitidaEm: new Date("2024-07-01"), status: "confirmada", descricao: "Instalação hidráulica" },
    { id: "nf-5", obraId: o1.id, fornecedor: "Ferragens Bonfim", numero: "003456", categoria: "material", valor: 2300.0, emitidaEm: new Date("2024-08-10"), status: "confirmada", descricao: "Ferragens e parafusos" },
    { id: "nf-6", obraId: o3.id, fornecedor: "Tintas Coral", numero: "007890", categoria: "material", valor: 3800.0, emitidaEm: new Date("2024-08-05"), status: "confirmada", descricao: "Tinta acrílica 25L x 6" },
    { id: "nf-7", obraId: o3.id, fornecedor: "Eletro Construções ME", numero: "011234", categoria: "servicos", valor: 4100.0, emitidaEm: new Date("2024-09-01"), status: "pendente", descricao: "Instalação elétrica fase 2" },
    { id: "nf-8", obraId: o4.id, fornecedor: "Massa Certa", numero: "000111", categoria: "material", valor: 1200.0, emitidaEm: new Date("2024-01-20"), status: "confirmada", descricao: "Massa fina e texturas" },
  ];
  for (const n of notas) {
    const { obraId, ...rest } = n;
    await prisma.notaFiscal.upsert({
      where: { id: n.id },
      update: {},
      create: { ...rest, empresaId: empresa.id, obraId },
    });
  }

  // ── Pagamentos ──────────────────────────────────────────────────────────
  const pagamentos = [
    { id: "pag-1", funcionarioId: f1.id, obraId: o1.id, valor: 3200.0, descricao: "Salário maio/2024", pagoEm: new Date("2024-05-31") },
    { id: "pag-2", funcionarioId: f1.id, obraId: o1.id, valor: 3200.0, descricao: "Salário junho/2024", pagoEm: new Date("2024-06-28") },
    { id: "pag-3", funcionarioId: f2.id, obraId: o1.id, valor: 5200.0, descricao: "Salário maio/2024", pagoEm: new Date("2024-05-31") },
    { id: "pag-4", funcionarioId: f2.id, obraId: o1.id, valor: 5200.0, descricao: "Salário junho/2024", pagoEm: new Date("2024-06-28") },
    { id: "pag-5", funcionarioId: f3.id, obraId: o1.id, valor: 2100.0, descricao: "Salário junho/2024", pagoEm: new Date("2024-06-28") },
    { id: "pag-6", funcionarioId: f4.id, obraId: o1.id, valor: 4100.0, descricao: "Salário julho/2024", pagoEm: new Date("2024-07-31") },
    { id: "pag-7", funcionarioId: f1.id, obraId: o3.id, valor: 3200.0, descricao: "Salário julho/2024", pagoEm: new Date("2024-07-31") },
    { id: "pag-8", funcionarioId: f5.id, obraId: o3.id, valor: 2800.0, descricao: "Salário agosto/2024", pagoEm: new Date("2024-08-30") },
  ];
  for (const p of pagamentos) {
    const { funcionarioId, obraId, ...rest } = p;
    await prisma.pagamentoFuncionario.upsert({
      where: { id: p.id },
      update: {},
      create: { ...rest, empresaId: empresa.id, funcionarioId, obraId },
    });
  }

  // ── Vendas ────────────────────────────────────────────────────────────────
  const venda = await prisma.venda.upsert({
    where: { id: "venda-1" },
    update: {},
    create: {
      id: "venda-1", empresaId: empresa.id, terrenoId: t3.id,
      nomeComprador: "Ricardo Almeida",
      cpfCnpjComprador: "123.456.789-00",
      telefoneComprador: "(11) 98765-4321",
      emailComprador: "ricardo.almeida@email.com",
      valorTotal: 580000.0, entrada: 80000.0,
      numeroParcelas: 12, diaVencimento: 5,
      dataContrato: new Date("2024-08-01"),
      observacoes: "Venda à vista com financiamento bancário parcial. Escritura em cartório em 30 dias.",
    },
  });

  for (let i = 0; i < 12; i++) {
    await prisma.parcela.upsert({
      where: { id: `parc-${i + 1}` },
      update: {},
      create: {
        id: `parc-${i + 1}`, vendaId: venda.id,
        numero: i + 1, vencimento: new Date(2024, 8 + i, 5),
        valor: 41666.67,
        status: i < 4 ? "paga" : "aberta",
        pagoEm: i < 4 ? new Date(2024, 8 + i, 3) : null,
      },
    });
  }

  // ── Diário de Obra ───────────────────────────────────────────────────────
  const entradas = [
    { id: "diario-1", obraId: o1.id, data: new Date("2024-07-15"), conteudo: "Concretagem da laje do primeiro pavimento concluída. Sem intercorrências.", autor: "Eng. Carlos Mendes", clima: "Ensolarado", equipePresente: 8 },
    { id: "diario-2", obraId: o1.id, data: new Date("2024-07-22"), conteudo: "Início do levantamento de paredes do segundo pavimento. Aguardando entrega de tijolos.", autor: "Eng. Carlos Mendes", clima: "Nublado", equipePresente: 6 },
    { id: "diario-3", obraId: o1.id, data: new Date("2024-08-01"), conteudo: "Instalação elétrica fase 1 concluída. Eletricista Carlos finalizou quadro de distribuição.", autor: "Eng. Carlos Mendes", clima: "Ensolarado", equipePresente: 7 },
    { id: "diario-4", obraId: o1.id, data: new Date("2024-08-12"), conteudo: "Chuva forte paralisou obras durante a tarde. Equipe realizou serviços internos.", autor: "Pedro Oliveira", clima: "Chuvoso", equipePresente: 5 },
    { id: "diario-5", obraId: o3.id, data: new Date("2024-08-10"), conteudo: "Pintura interna do quarto principal finalizada. Primeira demão na sala.", autor: "Eng. Carlos Mendes", clima: "Ensolarado", equipePresente: 4 },
    { id: "diario-6", obraId: o3.id, data: new Date("2024-08-20"), conteudo: "Acabamentos finais iniciados. Colocação de rodapés e soleiras.", autor: "Pedro Oliveira", clima: "Parcialmente nublado", equipePresente: 5 },
  ];
  for (const e of entradas) {
    const { obraId, ...rest } = e;
    await prisma.diarioObra.upsert({
      where: { id: e.id },
      update: {},
      create: { ...rest, empresaId: empresa.id, obraId },
    });
  }

  console.log("✅ Seed concluído.");
  console.log("   Login demo: demo@prumo.com  /  demo123");
  console.log("   4 obras | 4 terrenos | 6 funcionários | 8 notas fiscais | 1 venda | 12 parcelas");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
