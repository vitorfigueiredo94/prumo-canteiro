#!/bin/bash
# deploy.sh — PrumoCanteiro na VM (Docker já instalado)
# Uso: bash deploy.sh
set -e

REPO="https://github.com/vitorfigueiredo94/prumo-canteiro.git"
DIR="/opt/prumo-canteiro"

echo "════════════════════════════════════════════"
echo "  PrumoCanteiro — Deploy"
echo "════════════════════════════════════════════"

# ── Clonar ou atualizar ──────────────────────────────────────────────────────
if [ ! -d "$DIR/.git" ]; then
    echo "[1/4] Clonando repositório..."
    git clone "$REPO" "$DIR"
else
    echo "[1/4] Atualizando repositório..."
    git -C "$DIR" pull
fi

cd "$DIR"

# ── Gerar certificado SSL (1x) ───────────────────────────────────────────────
if [ ! -f "docker/ssl/cert.pem" ]; then
    echo "[2/4] Gerando certificado SSL autoassinado..."
    bash docker/gen-cert.sh
else
    echo "[2/4] Certificado SSL já existe — pulando"
fi

# ── Configurar .env ──────────────────────────────────────────────────────────
if [ ! -f ".env" ]; then
    echo "[3/4] Criando .env..."
    cp .env.example .env
    SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 2>/dev/null || \
             python3 -c "import secrets; print(secrets.token_hex(32))")
    sed -i "s|troque-por-uma-string-aleatoria-de-64-chars!|$SECRET|" .env

    echo ""
    echo "  ⚠  Adicione sua GEMINI_API_KEY em $DIR/.env"
    echo "     (a mesma que usa no JurisMonitor)"
    echo ""
else
    echo "[3/4] .env já existe — pulando"
fi

# ── Subir containers ─────────────────────────────────────────────────────────
echo "[4/4] Subindo containers..."
docker compose pull 2>/dev/null || true
docker compose up -d --build

echo ""
echo "════════════════════════════════════════════"
echo "  ✅ PrumoCanteiro rodando!"
echo ""
echo "  Local:  https://localhost:3001"
echo "  Web:    https://prumocanteiro.com.br (após DNS propagar)"
echo ""
echo "  Logs: docker compose logs -f app"
echo "  Para: docker compose down"
echo "════════════════════════════════════════════"

# ── Mostrar IP para login de demo ────────────────────────────────────────────
echo ""
echo "  Login demo: admin@prumocanteiro.com.br / admin123"
echo ""
