#!/bin/sh
set -e

echo "[prumo] Inicializando banco de dados..."
node /app/init-db.js

# Seed apenas se o banco ainda não tiver usuário demo
EXISTE=$(node -e "
const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const dbUrl = process.env.DATABASE_URL || 'file:/app/data/prumo.db';
const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const prisma = new PrismaClient({ adapter });
prisma.usuario.count().then(n => { console.log(n); prisma.\$disconnect(); }).catch(() => { console.log(0); });
" 2>/dev/null || echo 0)

if [ "$EXISTE" = "0" ]; then
  echo "[prumo] Executando seed inicial..."
  node /app/prisma/seed.cjs || true
fi

echo "[prumo] Iniciando servidor Next.js..."
exec node server.js
