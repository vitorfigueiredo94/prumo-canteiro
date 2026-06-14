#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# setup-vm.sh — Ubuntu 22.04 — JurisMonitor + PrumoCanteiro na mesma VM
#
# Uso (rodar como root ou com sudo):
#   chmod +x setup-vm.sh
#   sudo bash setup-vm.sh
# ─────────────────────────────────────────────────────────────────────────────
set -e

PRUMO_REPO="https://github.com/vitorfigueiredo94/prumo-canteiro.git"
PRUMO_DIR="/opt/prumo-canteiro"

echo ""
echo "══════════════════════════════════════════════════════"
echo "  Setup VM — JurisMonitor + PrumoCanteiro"
echo "══════════════════════════════════════════════════════"

# ── 1. Sistema ────────────────────────────────────────────────────────────────
echo "[1/6] Atualizando sistema..."
apt-get update -qq && apt-get upgrade -y -qq
apt-get install -y -qq curl git nginx certbot python3-certbot-nginx ufw

# ── 2. Docker ─────────────────────────────────────────────────────────────────
echo "[2/6] Instalando Docker..."
if ! command -v docker &>/dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker && systemctl start docker
fi
docker --version
docker compose version

# Grupo docker sem sudo
REAL_USER="${SUDO_USER:-$USER}"
usermod -aG docker "$REAL_USER" 2>/dev/null || true

# ── 3. Node.js 20 ────────────────────────────────────────────────────────────
echo "[3/6] Instalando Node.js 20..."
if ! command -v node &>/dev/null || [[ "$(node -v)" != v20* ]]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1
    apt-get install -y nodejs -qq
fi
echo "Node: $(node -v)"

# ── 4. PrumoCanteiro ──────────────────────────────────────────────────────────
echo "[4/6] Configurando PrumoCanteiro..."

if [ ! -d "$PRUMO_DIR/.git" ]; then
    git clone "$PRUMO_REPO" "$PRUMO_DIR"
else
    git -C "$PRUMO_DIR" pull
fi

cd "$PRUMO_DIR"

if [ ! -f ".env" ]; then
    cp .env.example .env
    SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    sed -i "s|troque-por-uma-string-aleatoria-de-64-chars!|$SECRET|" .env
    echo "  → .env criado com SESSION_SECRET aleatório"
    echo "  → Edite o domínio: nano $PRUMO_DIR/.env"
fi

docker compose up -d --build
echo "  → PrumoCanteiro rodando na porta 3001"

# ── 5. Nginx ──────────────────────────────────────────────────────────────────
echo "[5/6] Configurando Nginx..."

cp "$PRUMO_DIR/docker/nginx-vm.conf" /etc/nginx/sites-available/saas
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/saas /etc/nginx/sites-enabled/saas

nginx -t && systemctl enable nginx && systemctl reload nginx
echo "  → Nginx ativo para os dois domínios"

# ── 6. Firewall ───────────────────────────────────────────────────────────────
echo "[6/6] Configurando firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# ── Resumo ────────────────────────────────────────────────────────────────────
IP=$(hostname -I | awk '{print $1}')
echo ""
echo "══════════════════════════════════════════════════════"
echo "  ✅ Setup completo!"
echo ""
echo "  JurisMonitor  → http://jurismonitorpro.com.br"
echo "  PrumoCanteiro → http://prumocanteiro.com.br"
echo "  (ou por IP temporariamente: http://$IP:3001)"
echo ""
echo "  Próximos passos:"
echo "  1. Editar domínio no .env do PrumoCanteiro:"
echo "       nano $PRUMO_DIR/.env"
echo ""
echo "  2. Certificado SSL gratuito:"
echo "       sudo certbot --nginx \\"
echo "         -d jurismonitorpro.com.br \\"
echo "         -d prumocanteiro.com.br"
echo ""
echo "  3. Fazer logout/login para ativar grupo docker sem sudo"
echo "══════════════════════════════════════════════════════"
