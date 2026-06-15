FROM node:20-alpine AS base

# ── Dependências do sistema ───────────────────────────────────────────────────
# python3/make/g++ necessários para compilar better-sqlite3 (addon nativo)
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl python3 make g++
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── Build ─────────────────────────────────────────────────────────────────────
FROM base AS builder
RUN apk add --no-cache libc6-compat openssl python3 make g++
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Gera Prisma client
RUN npx prisma generate

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# DATABASE_URL dummy para o build (não acessa DB em build time)
ENV DATABASE_URL="file:/tmp/build.db"

RUN npm run build

# Compila seed.ts → seed.cjs para rodar no runner sem esbuild/tsx
RUN node_modules/.bin/esbuild prisma/seed.ts \
    --bundle \
    --platform=node \
    --target=node20 \
    --format=cjs \
    --external:@prisma/client \
    --external:@prisma/adapter-better-sqlite3 \
    --external:better-sqlite3 \
    --outfile=/app/prisma/seed.cjs

# Gera DDL SQL do schema — aplicado no runner sem CLI Prisma
RUN npx prisma migrate diff \
    --from-empty \
    --to-schema prisma/schema.prisma \
    --script > /app/init.sql

# ── Runner (imagem final mínima) ───────────────────────────────────────────────
FROM base AS runner
RUN apk add --no-cache openssl libc6-compat python3 make g++
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Cria diretório de dados e uploads com as permissões corretas
RUN mkdir -p /app/data /app/public/uploads && chown -R nextjs:nodejs /app/data /app/public/uploads

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma client nativo (sem CLI — schema aplicado via init.sql)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma/seed.cjs ./prisma/seed.cjs
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=builder /app/node_modules/@prisma/adapter-better-sqlite3 ./node_modules/@prisma/adapter-better-sqlite3

# SQL gerado no build + migrations incrementais + script de init
COPY --from=builder /app/init.sql ./init.sql
COPY docker/migrate.sql ./migrate.sql
COPY docker/init-db.js ./init-db.js

# Script de inicialização: init-db + seed + server
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/tsx ./node_modules/tsx
COPY docker/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["./entrypoint.sh"]
