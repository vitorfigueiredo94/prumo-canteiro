#!/bin/sh
set -e

# Aplica schema no banco (cria tabelas se não existirem)
echo "[prumo] Aplicando schema..."
npx prisma db push --skip-generate --accept-data-loss

# Seed apenas se o banco ainda não tiver usuário demo
EXISTE=$(node -e "
const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const path = require('path');
const dbUrl = process.env.DATABASE_URL || 'file:/app/data/prumo.db';
const dbPath = dbUrl.replace(/^file:/, '');
const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const prisma = new PrismaClient({ adapter });
prisma.usuario.count().then(n => { console.log(n); prisma.\$disconnect(); }).catch(() => { console.log(0); });
" 2>/dev/null || echo 0)

if [ "$EXISTE" = "0" ]; then
  echo "[prumo] Executando seed inicial..."
  node -e "require('./prisma/seed.js')" 2>/dev/null || npx tsx prisma/seed.ts || true
fi

echo "[prumo] Iniciando servidor Next.js..."
exec node server.js
