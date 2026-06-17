# PrumoCanteiro — Roadmap de Produto e Especificação Técnica

> **Versão:** 1.3
> **Atualizado em:** 17/06/2026
> **Tag de produção:** `v1.0.0-prod` (commit `1d4f7ff`) — **deploy estável na VM**
> **Status:** Em produção ativo (`prumocanteiro.com.br`)

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
| Framework | Next.js 15 App Router (Server Actions + Route Handlers) |
| Banco | SQLite (`better-sqlite3`) + Prisma v7.8 |
| Auth | HMAC-SHA256 cookie (`prumo_sess`) — sem Supabase |
| WhatsApp | **Meta Cloud API** (Graph API v20.0) |
| IA | Gemini Flash (parecer de garantia pós-obra) |
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
- **DNS:** `prumocanteiro.com.br` — em produção
- **Deploy:** `/opt/prumo-canteiro` + `docker compose up -d --build`
- **Crontab VM:** `0 8 * * * curl -s -H "x-cron-secret: $SECRET" http://localhost:3000/api/cron/cobranca`

```
Cloudflare → Tunnel → Nginx:3001 (SSL) → Next.js:3000 (HTTP)
```

---

## Módulos Implementados — Estado Completo

### Fundação (Etapas 1–3)
- [x] Design System com tokens CSS custom properties (sem Tailwind)
- [x] Auth HMAC-SHA256 — cookie `prumo_sess`, sem JWT externo
- [x] App Shell — sidebar colapsável, header, layout responsivo
- [x] Temas claro/escuro com persistência (superadmin sempre escuro)

### Terrenos (`/terrenos`)
- [x] CRUD terrenos (localização, área, valor, status)
- [x] Tabs: Visão geral / Documentos / Checklist / **Comprador**
- [x] **Aba Comprador:** ficha completa do comprador com score interno, métricas, histórico de parcelas e análise do contrato

### Obras (`/obras`)
- [x] CRUD obras vinculadas a terrenos
- [x] Status: planejamento → execução → concluída → cancelada
- [x] Stepper de fases + aba Checklist + donut SVG

### Funcionários (`/funcionarios`)
- [x] CRUD + alocação por obra + registro de pagamentos

### Notas Fiscais (`/notas`)
- [x] Upload e parse XML NF-e
- [x] Status flow: rascunho → emitida → cancelada → inutilizada

### Vendas (`/vendas`)
- [x] Registro de vendas com parcelamento automático
- [x] Abas: Todas / Em dia / **Em atraso** / Pagas
- [x] Detecção de atraso por `vencimento < hoje` (nunca pelo campo `status` do DB)
- [x] Badge `atrasada` calculado client-side
- [x] **Cobrança manual por parcela:** botão WhatsApp em cada parcela em atraso

### Compradores (`/compradores`)
- [x] Listagem com 4 KPIs (total, recebido, em atraso, adimplentes)
- [x] **Score interno** por comprador: `max(0, round((noPrazo/vencidas)×100) − emAtraso×8)` — Excelente/Bom/Regular/Crítico
- [x] Filtros: Todos / Adimplentes / Em atraso
- [x] Busca por nome, CPF, telefone, email
- [x] **"Cobrar todos em atraso":** deduplicação 24h via `cobranca_logs`, resultado inline
- [x] **"Novo comprador":** abre VendaForm com terrenos disponíveis (sem venda)
- [x] **"Editar"** (ícone lápis em cada card): modal leve para nome, CPF, telefone, email — atualização otimista sem reload

### Financeiro (`/financeiro`)
- [x] KPIs: receitas, despesas, margem
- [x] Bar chart 12 meses + breakdown por obra + fluxo de caixa

### Dashboard (`/dashboard`)
- [x] KPIs reais: obras ativas, funcionários, faturamento
- [x] Alertas automáticos + cards NFs + parcelas vencidas

### Diário de Obra (`/diario`)
- [x] Registro diário com clima, equipe, atividades, fotos
- [x] Filtros por data e obra + impressão PDF

### Pós-obra / Assistência Técnica (`/assistencia`)
- [x] Chamados: vincula comprador + componente defeituoso
- [x] Parecer IA via Gemini Flash (aceita/nega com base em CC 618 / CDC)
- [x] Configurar 11 componentes de garantia padrão
- [x] Notificação extrajudicial imprimível (HTML com citações legais)

### Admin SaaS (`/superadmin`)
- [x] Console Super Admin multi-tenant
- [x] Gestão de empresas e usuários
- [x] Enforcement de planos com bloqueio de recursos e limites na sidebar

---

## WhatsApp — Meta Cloud API

**Migração de Evolution API → Meta Cloud API** (17/06/2026)

- **Endpoint:** `https://graph.facebook.com/v20.0/{phoneNumberId}/messages`
- **Auth:** Bearer token (`WHATSAPP_ACCESS_TOKEN`)
- **Variáveis necessárias no `.env` da VM:**

```env
WHATSAPP_ACCESS_TOKEN=EAAOn1GEI8M4...   # Token Meta
WHATSAPP_PHONE_NUMBER_ID=12345678       # ID do número no painel Meta
CRON_SECRET=...                         # openssl rand -hex 32
GEMINI_API_KEY=...                      # Para parecer de garantia (opcional)
```

- **Fluxo de cobrança:**

| Trigger | Tipo | Descrição |
|---|---|---|
| T-5 (5 dias antes) | `lembrete_amigavel` | Lembrete amigável antes do vencimento |
| T+0 a T+30 | `aviso_atraso` | Aviso de atraso |
| T+30+ | `notificacao_extrajudicial` | Notificação com teor jurídico |

- **Deduplicação:** cada tipo de mensagem é enviado **uma única vez por parcela** (lifetime, não diário)
- **Notificação ao gestor:** após cada cobrança, cópia é enviada para `empresa.telefoneGestor` (configurável no UserMenu)

---

## Schema Prisma — Modelos Principais

| Modelo | Campos-chave |
|---|---|
| `Empresa` | nome, **telefoneGestor** ← adicionado via PRAGMA |
| `Venda` | nomeComprador, cpfCnpjComprador, telefoneComprador, emailComprador, valorTotal, entrada, numeroParcelas, diaVencimento, dataContrato |
| `Parcela` | valor, vencimento, status (`aberta`/`paga`), pagoEm |
| `CobrancaLog` | empresaId, parcelaId, tipo, canal, status, criadoEm |
| `GarantiaComponente` | empresaId, codigo, nome, prazoLegalMeses, prazoContratMeses |
| `ChamadoAssistencia` | empresaId, vendaId, componenteId, descricao, status, parecerTexto |

### Migrações em produção (via `init-db.js` no startup Docker)
```sql
ALTER TABLE "empresas" ADD COLUMN "telefoneGestor" TEXT;
```

---

## Histórico de Versões

| Data | Versão / Tag | O que foi feito |
|------|-------------|----------------|
| 08/06/2026 | v0.1 | CRUD inicial: obras, terrenos, funcionários, NFs, vendas |
| 09/06/2026 | v0.2 | Checklist: 7 templates, state machine, obras + terrenos |
| 10/06/2026 | v0.3 | Documentos: upload/download por empresa/ownerType/owner |
| 13/06/2026 | v0.4 | Diário: upload de fotos (fotoUrl), PRAGMA fix SQLite Alpine |
| 14/06/2026 | v0.5 | Dashboard: donut categoria + folha do mês + parcelas vencendo |
| 15/06/2026 | v0.6 | Financeiro: 2 tabs (Por obra + Fluxo de caixa), donut |
| 16/06/2026 | v0.7 | Audit de design: dashboard card esquerdo → obras em andamento com BudgetBars |
| 16/06/2026 | v0.8 | Pós-obra: chamados + parecer IA + garantias; cron T-5/T+1/T+30 + PDF extrajudicial |
| 17/06/2026 | v0.9 | fix(cadastro): tabelas planos/assinaturas no migrate.sql; fix(layout) barra fixa |
| 17/06/2026 | v1.0 | feat: enforcement de planos; temas claro/escuro |
| 17/06/2026 | v1.1 | feat: Meta Cloud API (WhatsApp); fix vendas "Em atraso" por data |
| 17/06/2026 | v1.2 | feat: Ficha do Comprador (score + histórico); telefoneGestor + notificação gestor |
| 17/06/2026 | **v1.0.0-prod** ← TAG | feat: Compradores CRUD (novo + editar); cobrar todos; cron deduplicação lifetime |

---

## Pendências / Backlog

- [ ] **DNS** `prumocanteiro.com.br` — verificar propagação completa
- [ ] **Telas superadmin** — QR Codes (F1) e Portal tokens (F2) ainda sem UI
- [ ] **Relatórios PDF** — gerar PDF de obra (resumo financeiro + checklist + diário)
- [ ] **Notificações in-app** — toast/badge para parcelas vencendo em 7 dias
- [ ] **Multi-foto no diário** — galeria com lightbox
- [ ] **Exportar CSV** — NFs e pagamentos por obra
- [ ] **Terrenos: mapa** — integração Leaflet/Mapbox
- [ ] **Contratos digitais** — modelo contrato com assinatura digital
- [ ] **Cronograma de obra** — Gantt simplificado por fase
- [ ] **Cobrança: email** — canal adicional além de WhatsApp
- [ ] **Assistência: agendamento** — vincular chamado aceito a data de vistoria
- [ ] **Testes automatizados** — ainda sem suite de testes

---

## Comandos de Operação (VM)

```bash
# Ver logs
docker compose -f /opt/prumo-canteiro/docker-compose.yml logs -f app

# Reiniciar
docker compose -f /opt/prumo-canteiro/docker-compose.yml restart

# Atualizar com novo código
cd /opt/prumo-canteiro && git pull && docker compose up -d --build

# Verificar crontab
crontab -l

# Login demo
# Email: admin@prumocanteiro.com.br  Senha: admin123
```

---

## Como rodar localmente

```bash
cd C:\Users\Vitor\Documents\Pessoal\prumo-canteiro

npm install
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts
npm run dev   # http://localhost:3000
```

**Login demo:** vitor@empresa.com / `123456`
