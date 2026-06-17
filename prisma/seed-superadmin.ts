/**
 * seed-superadmin.ts — Cria/atualiza o usuário Super Admin do SaaS
 *
 * Lê SUPERADMIN_EMAIL e SUPERADMIN_PASSWORD do ambiente.
 * Idempotente: seguro rodar múltiplas vezes (upsert).
 *
 * Uso na VM após rebuild:
 *   docker exec -it prumo-canteiro-app-1 \
 *     sh -c "SUPERADMIN_EMAIL=... SUPERADMIN_PASSWORD=... node /app/prisma/seed-superadmin.cjs"
 *
 * Ou configure no .env e rode:
 *   docker exec -it prumo-canteiro-app-1 node /app/prisma/seed-superadmin.cjs
 */

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
  const email = process.env.SUPERADMIN_EMAIL;
  const password = process.env.SUPERADMIN_PASSWORD;

  if (!email || !password) {
    console.error(
      "\n❌ SUPERADMIN_EMAIL e SUPERADMIN_PASSWORD são obrigatórios.\n" +
      "   Defina no .env ou passe inline:\n" +
      "   SUPERADMIN_EMAIL=admin@prumo.com SUPERADMIN_PASSWORD=sua-senha node seed-superadmin.cjs\n"
    );
    process.exit(1);
  }

  // Empresa interna do operador — isolada dos tenants
  await prisma.empresa.upsert({
    where: { id: "empresa-operador" },
    update: {},
    create: { id: "empresa-operador", nome: "PrumoCanteiro Operador" },
  });

  const existente = await prisma.usuario.findUnique({ where: { email } });

  await prisma.usuario.upsert({
    where: { email },
    update: {
      passwordHash: hashPwd(password),
      superAdmin: true,
      bloqueado: false,
    },
    create: {
      empresaId: "empresa-operador",
      nome: "Super Admin",
      email,
      passwordHash: hashPwd(password),
      superAdmin: true,
    },
  });

  console.log(`\n✅ Super admin ${existente ? "atualizado" : "criado"}: ${email}`);
  console.log(`   Acesse: /superadmin\n`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
