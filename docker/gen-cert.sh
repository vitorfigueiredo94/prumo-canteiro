#!/bin/bash
# Gera certificado autoassinado para uso local com Cloudflare Tunnel
# Executar 1x na VM antes de subir o docker compose
#
# Uso: bash docker/gen-cert.sh

set -e

CERT_DIR="$(dirname "$0")/ssl"
mkdir -p "$CERT_DIR"

openssl req -x509 -nodes -newkey rsa:2048 \
  -keyout "$CERT_DIR/key.pem" \
  -out "$CERT_DIR/cert.pem" \
  -days 3650 \
  -subj "/C=BR/ST=SP/L=SaoPaulo/O=PrumoCanteiro/CN=prumocanteiro.local"

chmod 600 "$CERT_DIR/key.pem"
chmod 644 "$CERT_DIR/cert.pem"

echo "✅ Certificado gerado em $CERT_DIR"
echo "   cert.pem  — certificado público"
echo "   key.pem   — chave privada"
