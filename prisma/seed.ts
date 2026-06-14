import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { scryptSync, randomBytes } from "crypto";
import path from "path";

const dbPath = path.resolve(process.cwd(), "prisma/dev.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
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

  await prisma.obra.upsert({
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

  // ── Funcionários ────────────────────────────────────────────────────────
  const f1 = await prisma.funcionario.upsert({
    where: { id: "func-1" },
    update: {},
    create: {
      id: "func-1", empresaId: empresa.id,
      nome: "João Silva", cargo: "Pedreiro",
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
      telefone: "(11) 96666-3333", salario: 2100.0, status: "ativo",
      admissao: new Date("2024-05-10"),
    },
  });

  // ── Alocações ───────────────────────────────────────────────────────────
  for (const [fid, cargo] of [[f1.id, "Pedreiro"], [f2.id, "Mestre de obras"], [f3.id, "Servente"]]) {
    await prisma.alocacaoFuncionario.upsert({
      where: { id: `aloc-${fid}` },
      update: {},
      create: {
        id: `aloc-${fid}`, funcionarioId: fid as string,
        obraId: o1.id, cargo: cargo as string,
        inicio: new Date("2024-04-01"),
      },
    });
  }

  // ── Notas fiscais ────────────────────────────────────────────────────────
  for (const n of [
    { id: "nf-1", fornecedor: "Madeiras São João Ltda.", numero: "001234", categoria: "material", valor: 12500.0, emitidaEm: new Date("2024-05-10"), status: "confirmada", descricao: "Madeira para estrutura" },
    { id: "nf-2", fornecedor: "Eletro Construções ME", numero: "005678", categoria: "servicos", valor: 8200.0, emitidaEm: new Date("2024-06-05"), status: "confirmada", descricao: "Instalação elétrica fase 1" },
    { id: "nf-3", fornecedor: "Cimento Forte", numero: null, categoria: "material", valor: 5800.0, emitidaEm: new Date("2024-07-20"), status: "pendente", descricao: null },
  ]) {
    await prisma.notaFiscal.upsert({
      where: { id: n.id },
      update: {},
      create: { ...n, empresaId: empresa.id, obraId: o1.id },
    });
  }

  // ── Pagamentos ──────────────────────────────────────────────────────────
  await prisma.pagamentoFuncionario.upsert({
    where: { id: "pag-1" },
    update: {},
    create: {
      id: "pag-1", empresaId: empresa.id,
      funcionarioId: f1.id, obraId: o1.id,
      valor: 3200.0, descricao: "Salário maio/2024",
      pagoEm: new Date("2024-05-31"),
    },
  });

  // ── Venda ────────────────────────────────────────────────────────────────
  const venda = await prisma.venda.upsert({
    where: { id: "venda-1" },
    update: {},
    create: {
      id: "venda-1", empresaId: empresa.id, terrenoId: t3.id,
      nomeComprador: "Ricardo Almeida",
      cpfCnpjComprador: "123.456.789-00",
      telefoneComprador: "(11) 98765-4321",
      valorTotal: 580000.0, entrada: 80000.0,
      numeroParcelas: 12, diaVencimento: 5,
      dataContrato: new Date("2024-08-01"),
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
        status: i < 3 ? "paga" : "aberta",
        pagoEm: i < 3 ? new Date(2024, 8 + i, 3) : null,
      },
    });
  }

  // ── Diário ───────────────────────────────────────────────────────────────
  await prisma.diarioObra.upsert({
    where: { id: "diario-1" },
    update: {},
    create: {
      id: "diario-1", empresaId: empresa.id, obraId: o1.id,
      data: new Date("2024-07-15"),
      conteudo: "Concretagem da laje do primeiro pavimento concluída. Equipe de 8 pessoas.",
      autor: "Eng. Carlos Mendes", clima: "Ensolarado", equipePresente: 8,
    },
  });

  console.log("✅ Seed concluído.");
  console.log("   Login: demo@prumo.com  /  Senha: demo123");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
