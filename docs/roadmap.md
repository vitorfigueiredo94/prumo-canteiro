# PrumoCanteiro — Roadmap de Produto e Especificação Técnica

> **Versão:** 1.1
> **Atualizado em:** 14/06/2026
> **Status:** Em deploy ativo na VM (`prumocanteiro.com.br` — aguardando DNS)

---

## Visão Geral

**PrumoCanteiro** é um SaaS B2B de gestão de obras para construtoras pequenas e médias.
Resolve a dor de controlar múltiplas obras simultaneamente com orçamento, equipe, materiais,
financeiro e diário de obra — tudo em um único lugar.

**Modelo de negócio:** Multi-tenant por empresa (`empresaId`), planos mensais.
**Público:** Construtoras, incorporadoras, empreiteiros autônomos.

---

## Stack Técnica

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 16 App Router (Server Actions + Route Handlers) |
| Banco | SQLite (`better-sqlite3`) + Prisma v7.8 |
| Auth | HMAC-SHA256 cookie (`prumo_sess`) — sem Supabase |
| IA | Gemini Flash (compartilhado com JurisMonitor) |
| STT | OpenAI Whisper API (opcional) |
| PDF | `pdf-parse@1.1.1` + geração própria |
| Deploy | Docker + Nginx mTLS + Cloudflare Tunnel |
| Repo | [github.com/vitorfigueiredo94/prumo-canteiro](https://github.com/vitorfigueiredo94/prumo-canteiro) |

---

## Infraestrutura

- **VM:** Mesma VM do JurisMonitor (Hyper-V Ubuntu `172.26.111.214`)
- **Porta:** `3001` (JurisMonitor usa `8000`)
- **Padrão mTLS:** Nginx SSL (cert autoassinado) → `noTLSVerify: true` no cloudflared
- **Cloudflare Tunnel:** `501a7a76-113c-4539-868a-8b868b67cc9c` (mesmo tunnel do JurisMonitor)
- **DNS:** `prumocanteiro.com.br` — em propagação (14/06/2026)
- **Deploy:** `/opt/prumo-canteiro` + `docker compose up -d`

```
Cloudflare → Tunnel → Nginx:3001 (SSL) → Next.js:3000 (HTTP)
```

---

## Módulos Implementados (Etapas 1–12)

### Etapas 1–3 — Fundação
- [x] Design System com Tailwind CSS (tokens, componentes, tipografia)
- [x] Auth HMAC-SHA256 — cookie `prumo_sess`, sem JWT externo
- [x] App Shell — sidebar, header, layout responsivo

### Etapa 4 — Terrenos
- [x] CRUD terrenos (localização, área, valor, status)
- [x] Lista + detalhe com tabs

### Etapa 5 — Obras
- [x] CRUD obras vinculadas a terrenos
- [x] Status: planejamento → execução → concluída → cancelada
- [x] List + detail + actions + mapa de status

### Etapa 6 — Funcionários
- [x] CRUD funcionários
- [x] Alocação por obra
- [x] Registro de pagamentos

### Etapa 7 — Notas Fiscais (NF-e)
- [x] Upload e parse XML NF-e
- [x] CRUD manual de notas
- [x] Status flow: rascunho → emitida → cancelada → inutilizada

### Etapa 8 — Vendas
- [x] Registro de vendas por obra/unidade
- [x] Parcelamento automático
- [x] Extrato por comprador

### Etapa 9 — Financeiro
- [x] KPIs: receitas, despesas, margem
- [x] Bar chart 12 meses
- [x] Breakdown por obra

### Etapa 10 — Dashboard
- [x] KPIs reais: obras ativas, funcionários, faturamento
- [x] Alertas automáticos (prazo, pagamento)
- [x] Cards NFs + parcelas vencidas

### Etapa 11 — Diário de Obra
- [x] Registro diário com clima, equipe, atividades
- [x] Filtros por data e obra
- [x] Impressão layout PDF

### Etapa 12 — Admin SaaS
- [x] Console Super Admin (multi-tenant)
- [x] Schema Prisma reescrito com modelos corretos
- [x] Gestão de empresas e usuários

---

## Fase 2 — 7 Features Avançadas (v1.1)

### F1 — QR Code de Insumos
- [x] Modelo `QrCodeInsumo` + API `GET /api/qr/[token]`
- [x] Geração de QR Code por material/equipamento
- Pendente: tela de gestão de QR codes

### F2 — Portal do Cliente
- [x] Modelo `PortalClienteToken` (SHA-256 hash, expira configurável)
- [x] API `GET /api/portal/obra/[obraId]` autenticada por `X-Portal-Token`
- [x] `POST /api/portal/tokens` — criação de tokens
- Pendente: tela de geração de tokens para o construtor

### F3 — Predição de Atraso (IA)
- [x] Modelo `PredicaoAtraso` — armazena histórico por obra
- [x] Integração Gemini Flash (`GEMINI_API_KEY`)
- [x] API `POST /api/predicao/[obraId]` — gera predição
- [x] API `GET /api/predicao/[obraId]` — última predição

### F4 — Diário por Áudio (STT)
- [x] Modelo `TranscricaoAudio` vinculado ao diário
- [x] API `POST /api/audio/transcrever` — Whisper API
- [x] Fallback: placeholder quando sem `OPENAI_API_KEY`

### F5 — Cotação Inteligente (PDF)
- [x] Modelo `CotacaoInsumo` — extrai insumos de PDF de cotação
- [x] API `POST /api/cotacao/processar` — parse + armazenamento
- [x] pdf-parse@1.1.1 (função direta, sem instância)

### F6 — Medição por Foto
- [x] Modelo `MedicaoFoto` — vincula foto a área/dimensão medida
- [x] API `POST /api/medicao` e `GET /api/medicao/[obraId]`

### F7 — Rateio de NF-e
- [x] Modelo `RateioNFe` — divide custos de NF por obra/centro de custo
- [x] API `POST /api/rateio/[nfeId]` e `GET /api/rateio/[nfeId]`
- [x] Validação: percentuais somam 100%

---

## Histórico de Versões

| Data | Versão | O que foi feito |
|------|--------|----------------|
| 14/06/2026 | v1.0 | Etapas 1–12 completas; auth HMAC; SQLite+Prisma v7; deploy Docker |
| 14/06/2026 | v1.1 | 7 features avançadas: QR Code, Portal Cliente, IA Atraso, STT, PDF, Foto, NF-e |
| 14/06/2026 | v1.1 | Git criado; deploy na VM; cloudflared config atualizado; domínio em propagação |

---

## Pendências

- [ ] DNS `prumocanteiro.com.br` propagar (até 24-48h após 14/06/2026)
- [ ] Adicionar GEMINI_API_KEY no `.env` da VM (`/opt/prumo-canteiro/.env`)
- [ ] Telas de gestão para F1 (QR Codes) e F2 (Portal tokens)
- [ ] Testes automatizados (ainda sem suite de testes)

---

## Comandos de Operação (VM)

```bash
# Logs
docker compose -f /opt/prumo-canteiro/docker-compose.yml logs -f app

# Reiniciar
docker compose -f /opt/prumo-canteiro/docker-compose.yml restart

# Atualizar com novo código
cd /opt/prumo-canteiro && git pull && docker compose up -d --build

# Login demo
# Email: admin@prumocanteiro.com.br  Senha: admin123
```
