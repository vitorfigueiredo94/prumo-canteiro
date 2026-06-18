# PrumoCanteiro — Roadmap de Produto e Especificação Técnica

> **Versão:** 2.3
> **Atualizado em:** 18/06/2026
> **Tag de produção:** `v1.0.0-prod` (commit `1d4f7ff`) — deploy estável na VM
> **Commits pós-tag:** `7288a9f` (contratos) · `e98a1d6` (logo) · `3ca7ccb` (RBAC/LGPD) · `0268d28` (audit v1) · `325f1dd` (audit v2) · `abacc86` (import Excel) · `9006108` (hotfix build) · `3c6504c` (notif WA) · `8b38953` (notif email) · `421eb09` (checklist edit) · `706e453` (alertas) · `e54d5f9` (relatório + portal)
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
| Auth | HMAC-SHA256 cookie (`__Host-prumo_sess`) — sem Supabase |
| WhatsApp | **Meta Cloud API** (Graph API v20.0) |
| Email | **nodemailer** + Zoho Mail SMTP (`smtp.zoho.com:587`) |
| IA | Gemini Flash (parecer de garantia pós-obra) |
| STT | OpenAI Whisper API (opcional) |
| PDF / Documentos | HTML otimizado para impressão (`buildContratoHTML`, `buildNotificacaoHTML`) |
| Import | **xlsx** — import em lote via Excel (.xlsx) para terrenos, vendas e compradores |
| Deploy | Docker + Nginx mTLS + Cloudflare Tunnel |
| Repo | [github.com/vitorfigueiredo94/prumo-canteiro](https://github.com/vitorfigueiredo94/prumo-canteiro) |

---

## Infraestrutura

- **VM:** Mesma VM do JurisMonitor (Hyper-V Ubuntu `172.26.111.214`)
- **Porta:** `3001` (JurisMonitor usa `8000`)
- **Padrão mTLS:** Nginx SSL (cert autoassinado) → `noTLSVerify: true` no cloudflared
- **Cloudflare Tunnel:** `501a7a76-113c-4539-868a-8b868b67cc9c`
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
- [x] **Logo da empresa** — upload PNG/JPG/SVG no UserMenu (base64 no DB, até 400 KB)

### Terrenos (`/terrenos`)
- [x] CRUD terrenos (localização, área, valor, status)
- [x] Tabs: Visão geral / Documentos / Checklist / Comprador
- [x] **Aba Comprador:** ficha completa com score interno, métricas, histórico e análise do contrato
- [x] **Mapa de terrenos** — toggle Lista/Mapa; Leaflet + OpenStreetMap; geocoding via Nominatim (server-side, cacheia `lat/lng` no DB); pins coloridos por status com popup; `GET /api/v1/terrenos/mapa`

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
- [x] Abas: Todas / Em dia / Em atraso / Pagas
- [x] Detecção de atraso por `vencimento < hoje` (nunca pelo campo `status` do DB)
- [x] Badge `atrasada` calculado client-side
- [x] Cobrança manual por parcela via WhatsApp
- [x] **Contrato de Compra e Venda** — botão "Ver contrato" abre HTML para impressão/PDF
- [x] **Registrar assinatura** — salva `contratoAssinadoEm`, exibe badge "Assinado em DD/MM/YYYY"

### Compradores (`/compradores`)
- [x] Listagem com 4 KPIs (total, recebido, em atraso, adimplentes)
- [x] Score interno: `max(0, round((noPrazo/vencidas)×100) − emAtraso×8)` — Excelente/Bom/Regular/Crítico
- [x] Filtros: Todos / Adimplentes / Em atraso + busca por nome, CPF, telefone, email
- [x] "Cobrar todos em atraso" — deduplicação 24h, resultado inline
- [x] "Novo comprador" — abre VendaForm com terrenos disponíveis
- [x] "Editar" (lápis) — modal leve para nome, CPF, telefone, email com atualização otimista
- [x] **Import Excel** — "Importar vendas" (cria nova venda) + "Atualizar compradores" (match por CPF)

### Financeiro (`/financeiro`)
- [x] KPIs: receitas, despesas, margem
- [x] Bar chart 12 meses + breakdown por obra + fluxo de caixa

### Dashboard (`/dashboard`)
- [x] KPIs reais: obras ativas, funcionários, faturamento
- [x] Alertas automáticos + cards NFs + parcelas vencidas

### Diário de Obra (`/diario`)
- [x] Registro diário com clima, equipe, atividades, fotos
- [x] Filtros por data e obra + impressão PDF
- [x] **Multi-foto por registro** — `<input multiple>`, `fotosJson JSON[]`, galeria inline com lightbox

### Pós-obra / Assistência Técnica (`/assistencia`)
- [x] Chamados: vincula comprador + componente defeituoso
- [x] Parecer IA via Gemini Flash (aceita/nega com base em CC 618 / CDC)
- [x] Configurar 11 componentes de garantia padrão
- [x] Notificação extrajudicial imprimível com citações legais + **logo da empresa**
- [x] **Agendamento de vistoria** — chamado aceito → campo `dataVistoria`, coluna na tabela, input inline

### Terrenos (`/terrenos`) — Import
- [x] **Import Excel** — botão "Importar" → modelo .xlsx → cria terrenos em lote (máx 500 linhas)

### Vendas (`/vendas`) — Import
- [x] **Import Excel** — botão "Importar" → modelo .xlsx → cria Venda + Parcelas por nome do terreno (máx 200)

### Insumos & QR Codes (`/insumos`)
- [x] Listar insumos com QR Code thumbnail, filtro por tipo (insumo/equipamento)
- [x] Criar insumo → gera PNG via `qrcode` lib, salva em `public/uploads/qrcodes/`
- [x] Vincular a obra (opcional), imprimir QR Code (abre PNG em nova aba), desativar
- [x] KPIs: total, materiais, equipamentos

### Cronograma de Obra (`/obras/[id]` — aba Cronograma)
- [x] `cronogramaJson TEXT` em `obras` — armazena datas por fase `{ OBRA_INICIO: { inicio, fim }, … }`
- [x] Gantt visual: barras planejado (fundo colorido) + realizado (fill % do checklist), linha do dia
- [x] Edição inline de datas por fase — PATCH `GET+PATCH /api/v1/obras/[id]/cronograma`

### Notas Fiscais (`/obras/[id]` — aba Notas)
- [x] **Exportar CSV** — botão ⬇ CSV na aba Notas e aba Equipe (pagamentos) de cada obra; rota `GET /api/v1/export/obra/[id]?tipo=notas|pagamentos`; BOM UTF-8, separador `;`, compatível com Excel PT-BR

### Portal do Cliente (`/portal`)
- [x] Gerar links de acesso com token único (nome + validade opcional)
- [x] Revogar tokens; último acesso registrado
- [x] Página pública `/portal?t=TOKEN` — sem login, mostra obras com progresso, status, datas, terreno
- [x] Notificação via `x-portal-token` header na API `/api/v1/portal/obras`

### Alertas de Parcelas (`sidebar`)
- [x] Badge vermelho (atrasadas) ou âmbar (vence hoje) no item "Compradores" da sidebar
- [x] Atualiza a cada mudança de rota (`useEffect` on `pathname`)

### Admin SaaS (`/superadmin`)
- [x] Console Super Admin multi-tenant
- [x] Gestão de empresas e usuários
- [x] Enforcement de planos com bloqueio de recursos e limites na sidebar
- [x] **Notificações de fatura** — `marcarFaturaPaga` / `marcarFaturaAtrasada` disparam WhatsApp para superadmin e gestor da empresa

---

## Contrato de Compra e Venda

**Geração:** `GET /api/contratos/[vendaId]` → HTML otimizado para impressão (Ctrl+P → PDF)
**Template:** `src/lib/contrato-pdf.ts` — `buildContratoHTML(params)`
**Número:** `CONT-{ano}-{6 últimos chars do ID da venda}` — único e estável

**Conteúdo do contrato:**
1. Cabeçalho — logo da empresa (se configurado) + nome + "Incorporação e Gestão Imobiliária"
2. Título + número + cidade + data por extenso
3. Cláusula I — Qualificação das partes (Vendedora + Compradora com CPF/telefone/email)
4. Cláusula II — Objeto (terreno: nome, município, área)
5. Cláusula III — Preço e forma de pagamento: tabela entrada + parcelas + tabela completa de vencimentos
6. Cláusula IV — Posse e transferência (escritura definitiva após quitação)
7. Cláusula V — Obrigações das partes
8. Cláusula VI — Rescisão (60 dias atraso → multa 20% sobre valores pagos, CDC art. 53)
9. Cláusula VII — Foro (comarca do terreno)
10. Assinaturas: Vendedora + Compradora + 2 Testemunhas

**Campos da venda envolvidos:**
- `dataContrato`, `nomeComprador`, `cpfCnpjComprador`, `telefoneComprador`, `emailComprador`
- `valorTotal`, `entrada`, `numeroParcelas`, `diaVencimento`
- `contratoAssinadoEm` — registrado via botão na venda detail

---

## Logo da Empresa

**Armazenamento:** base64 data URL no campo `empresas.logoEmpresa TEXT` (max 400 KB / ~533 KB base64)
**Upload:** UserMenu → seção "Logo da empresa" → file input (PNG/JPG/SVG) → FileReader → `salvarLogoEmpresa()`
**Onde aparece:**
- Sidebar: substitui o ícone PrumoCanteiro quando a sidebar está expandida
- Contrato PDF: centralizado no cabeçalho (substitui o nome em texto)
- Notificação extrajudicial: acima do título

---

## WhatsApp — Meta Cloud API

- **Endpoint:** `https://graph.facebook.com/v20.0/{phoneNumberId}/messages`
- **Auth:** Bearer token (`WHATSAPP_ACCESS_TOKEN`)
- **Variáveis necessárias no `.env` da VM:**

```env
WHATSAPP_ACCESS_TOKEN=EAAOn1GEI8M4...   # Token Meta
WHATSAPP_PHONE_NUMBER_ID=12345678       # ID do número no painel Meta
ADMIN_WHATSAPP_PHONE=11987654321        # Celular do superadmin (só dígitos)
CRON_SECRET=...                         # openssl rand -hex 32
GEMINI_API_KEY=...                      # Para parecer de garantia (opcional)

# Email — notificações ao superadmin (Zoho Mail)
ADMIN_NOTIFICATION_EMAIL=vitorfigueiredo_94@hotmail.com
EMAIL_FROM=PrumoCanteiro <notificacoes@prumocanteiro.com.br>
EMAIL_HOST=smtp.zoho.com
EMAIL_PORT=587
EMAIL_USER=notificacoes@prumocanteiro.com.br
EMAIL_PASS=zoho_app_password
```

**Fluxo de cobrança:**

| Trigger | Tipo | Deduplicação |
|---|---|---|
| T-5 (5 dias antes) | `lembrete_amigavel` | Lifetime por parcela |
| T+0 a T+30 | `aviso_atraso` | Lifetime por parcela |
| T+30+ | `notificacao_extrajudicial` | Lifetime por parcela |

- Notificação ao gestor: cópia para `empresa.telefoneGestor` após cada disparo
- "Cobrar todos em atraso" (/compradores): deduplicação 24h (diferente do cron)

---

## Schema Prisma — Modelos Principais

| Modelo | Campos-chave |
|---|---|
| `Empresa` | nome, **telefoneGestor TEXT**, **logoEmpresa TEXT** |
| `Venda` | nomeComprador, cpfCnpjComprador, telefoneComprador, emailComprador, valorTotal, entrada, numeroParcelas, diaVencimento, dataContrato, **contratoAssinadoEm DATETIME** |
| `Parcela` | valor, vencimento, status (`aberta`/`paga`), pagoEm |
| `CobrancaLog` | empresaId, parcelaId, tipo, canal, status, criadoEm |
| `GarantiaComponente` | empresaId, codigo, nome, prazoLegalMeses, prazoContratMeses |
| `ChamadoAssistencia` | empresaId, vendaId, componenteId, descricao, status, parecerTexto |
| `Plano` | nome, recursos[], limiteObras |
| `Assinatura` | empresaId, planoId, status |

### Migrações em produção — PRAGMA via `docker/init-db.js`

```sql
ALTER TABLE "empresas"  ADD COLUMN "telefoneGestor"    TEXT;
ALTER TABLE "empresas"  ADD COLUMN "logoEmpresa"       TEXT;
ALTER TABLE "vendas"    ADD COLUMN "contratoAssinadoEm" DATETIME;
ALTER TABLE "usuarios"  ADD COLUMN "bloqueado"         INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "diario_obras" ADD COLUMN "fotoUrl"        TEXT;
ALTER TABLE "usuarios"  ADD COLUMN "cargo"             TEXT NOT NULL DEFAULT 'admin';
ALTER TABLE "diario_obras" ADD COLUMN "fotosJson"       TEXT;
ALTER TABLE "chamados_assistencia" ADD COLUMN "dataVistoria" DATETIME;
ALTER TABLE "obras" ADD COLUMN "cronogramaJson" TEXT;
ALTER TABLE "terrenos" ADD COLUMN "lat" REAL;
ALTER TABLE "terrenos" ADD COLUMN "lng" REAL;
```

Novas **tabelas** → `docker/migrate.sql` (CREATE TABLE IF NOT EXISTS).
Nunca usar `prisma migrate` em produção — SQLite + Docker = PRAGMA only.

---

## Histórico de Versões

| Data | Versão / Tag | O que foi feito |
|------|-------------|----------------|
| 08/06/2026 | v0.1 | CRUD inicial: obras, terrenos, funcionários, NFs, vendas |
| 09/06/2026 | v0.2 | Checklist: 7 templates, state machine |
| 10/06/2026 | v0.3 | Documentos: upload/download |
| 13/06/2026 | v0.4 | Diário: fotos, PRAGMA fix SQLite Alpine |
| 14/06/2026 | v0.5 | Dashboard: donut + folha + parcelas vencendo |
| 15/06/2026 | v0.6 | Financeiro: 2 tabs + fluxo de caixa |
| 16/06/2026 | v0.7 | Design audit: dashboard BudgetBars |
| 16/06/2026 | v0.8 | Pós-obra: chamados + parecer IA + garantias; cron T-5/T+1/T+30 |
| 17/06/2026 | v0.9 | fix(cadastro): planos/assinaturas; fix(layout) barra fixa |
| 17/06/2026 | v1.0 | Enforcement de planos + temas claro/escuro |
| 17/06/2026 | v1.1 | Meta Cloud API; fix vendas "Em atraso" por data |
| 17/06/2026 | v1.2 | Ficha do Comprador; telefoneGestor; notificação gestor |
| 17/06/2026 | **v1.0.0-prod** ← TAG | Compradores CRUD; cobrar todos; cron lifetime dedup |
| 17/06/2026 | v1.3 | **Contrato de Compra e Venda** — template HTML, rota, registrar assinatura |
| 17/06/2026 | v1.4 | **Logo da empresa** — upload no UserMenu, sidebar, contratos e notificações |
| 17/06/2026 | v1.5 | **Segurança e LGPD** — RBAC, TenantGuard, ResponseMask, AuditLog, LLM PII strip |
| 17/06/2026 | v1.6 | **Auditoria de segurança** — SSRF, Path Traversal, MIME, SESSION_SECRET, CSP/HSTS |
| 17/06/2026 | v1.7 | **Auditoria estendida** — Rate limiting, brute force, timing attack, cookie __Host-, Next.js 15.3.9 |
| 18/06/2026 | hotfix | **Build fix** — SESSION_SECRET lazy (IIFE → função, falha em request não em build) |
| 18/06/2026 | v1.8 | **Import Excel** — terrenos (500 linhas), vendas (200), atualizar compradores por CPF; xlsx + ImportModal |
| 18/06/2026 | v1.9 | **Notificações superadmin** — WhatsApp (novo cadastro, fatura paga/atrasada) + Email via Zoho SMTP |
| 18/06/2026 | v2.0 | **Engajamento** — Relatório de obra HTML/print, Portal do cliente (tokens + pág pública), Checklist edição inline, badge alertas na sidebar |
| 18/06/2026 | v2.1 | **Operações** — Multi-foto no diário (galeria + lightbox + `fotosJson`), Exportar CSV (notas + pagamentos), Agendamento de vistoria pós-obra |
| 18/06/2026 | v2.2 | **Planejamento** — Cronograma Gantt por fase (`cronogramaJson` + linha do dia), UI de Insumos & QR Codes (gerar/imprimir/desativar) |
| 18/06/2026 | v2.3 | **Mapa de terrenos** — Leaflet + OpenStreetMap, geocoding Nominatim server-side com cache `lat/lng` no DB, pins por status |

---

## Auditoria Estendida — v1.7

### Vulnerabilidades corrigidas

| ID | Severidade | Correção | Arquivo |
|---|---|---|---|
| N-01 | 🟠 ALTO | Next.js 15.3.4 → 15.3.9 (patch bump, CVEs remanescentes não se aplicam: sem next/image, sem rewrites, sem nonces) | `package.json` |
| N-02 | 🟠 ALTO | Brute force login: rate limit 10 tentativas / 15 min por IP | `src/lib/rate-limiter.ts` + `login/actions.ts` |
| N-03 | 🟡 MÉDIO | Rate limit cadastro: 5 registros / 1h por IP | `cadastro/actions.ts` |
| N-04 | 🟡 MÉDIO | Timing attack cron: `timingSafeEqual` em vez de `!==` | `api/cron/cobranca/route.ts` |
| N-06 | 🔵 BAIXO | `@prisma/dev` falso positivo npm audit — documentado, sem ação | — |
| N-07 | 🔵 BAIXO | Cookie `prumo_sess` → `__Host-prumo_sess` (bloqueia subdomain injection) | `src/lib/auth.ts` + `middleware.ts` |

**Novo lib:** `src/lib/rate-limiter.ts` — Map em memória + TTL, limpeza automática a cada 60s, sem dependência externa.

**Nota:** Upgrade Next.js 16.x adicionado ao backlog (major version, avaliação necessária antes de produção).

---

## Import Excel — v1.8

### Arquivos novos

| Arquivo | Função |
|---|---|
| `src/lib/excel-import.ts` | Geradores de template + parsers para terrenos, vendas e compradores |
| `src/app/api/v1/import/terrenos/route.ts` | `GET` (template) + `POST` (import, máx 500 linhas) |
| `src/app/api/v1/import/vendas/route.ts` | `GET` (template) + `POST` (import, máx 200 linhas) |
| `src/app/api/v1/import/compradores/route.ts` | `GET` (template) + `POST` (atualiza campos do comprador por CPF) |
| `src/components/import/ImportModal.tsx` | Modal reutilizável: download template → upload Excel → feedback por linha |

### Comportamento

- **Terrenos:** cria Terreno + dispara `criarChecklistParaTerreno()`; revalida `/terrenos`
- **Vendas:** lookup do terreno por nome (`findFirst` tenant-isolado) → Prisma `$transaction` com Venda + `Parcela.createMany` + status terreno → "vendido"; revalida `/vendas`, `/terrenos`, `/compradores`
- **Compradores:** match por CPF normalizado (`str.replace(/\D/g,"")`) em todas as vendas da empresa; `updateMany` só atualiza campos não-nulos do Excel
- **Isolamento:** todas as rotas usam `session.empresaId` — nunca parâmetro do usuário
- **Parseadores:** `num()` aceita formato brasileiro (1.234,56) e internacional; `parseDate()` aceita objetos Date (xlsx cellDates), strings DD/MM/AAAA, strings ISO

---

## Notificações ao Superadmin — v1.9

### Arquivo: `src/lib/notificar-admin.ts`

Funções exportadas:

| Função | Canal | Trigger |
|---|---|---|
| `notificarAdmin(msg)` | WhatsApp → `ADMIN_WHATSAPP_PHONE` | Qualquer evento |
| `notificarGestor(tel, msg)` | WhatsApp → `empresa.telefoneGestor` | Fatura paga/atrasada |
| `emailAdmin(assunto, html, txt)` | Email SMTP → `ADMIN_NOTIFICATION_EMAIL` | Novo cadastro |

Builders de mensagem: `msgNovoCadastro`, `msgFaturaPaga`, `msgFaturaAtrasada`, `msgAssinaturaPagaGestor`, `msgAssinaturaAtrasadaGestor`, `emailNovoCadastroHtml`, `emailNovoCadastroTexto`

### Triggers

| Evento | WhatsApp superadmin | Email superadmin | WhatsApp gestor |
|---|---|---|---|
| Novo cadastro (ação `registerAction`) | ✅ | ✅ | — |
| Fatura marcada como paga | ✅ | — | ✅ |
| Fatura marcada como atrasada | ✅ | — | ✅ |

- Todas as chamadas são **fire-and-forget** (`void fn().catch(() => null)`) — nunca bloqueiam o `redirect()`
- Email silencioso se `EMAIL_HOST`/`EMAIL_USER`/`EMAIL_PASS`/`ADMIN_NOTIFICATION_EMAIL` não estiverem configurados
- WhatsApp silencioso se `ADMIN_WHATSAPP_PHONE` não estiver configurado

---

## Auditoria de Segurança — v1.6

### Vulnerabilidades corrigidas (commit `0268d28`)

| ID | Severidade | Correção | Arquivo |
|---|---|---|---|
| C-01 | 🔴 CRÍTICO | SSRF via `webhookUrl` → `ssrf-guard.ts` bloqueia IPs privados + DNS resolve | `src/lib/ssrf-guard.ts` |
| C-02 | 🔴 CRÍTICO | Path Traversal em uploads → allowlist `ownerType` + regex `ownerId` | `src/app/api/v1/documentos/route.ts` |
| A-01 | 🟠 ALTO | `SESSION_SECRET` sem fallback hardcoded → lança erro na inicialização | `src/lib/auth.ts` |
| A-02 | 🟠 ALTO | MIME via magic bytes reais em 4 rotas → `file-guard.ts` | `src/lib/file-guard.ts` + 4 rotas |
| M-01 | 🟡 MÉDIO | Security Headers → CSP, HSTS, X-Frame-Options, nosniff, Permissions-Policy | `next.config.ts` |
| M-02 | 🟡 MÉDIO | `.env` nunca commitado, `.gitignore` correto, histórico limpo | — |

**Novos arquivos de segurança:**
- `src/lib/ssrf-guard.ts` — `assertSafeUrl(url)`: valida protocolo HTTPS, bloqueia IPs privados (10.x, 172.16-31.x, 192.168.x, 169.254.x, ::1) e resolve DNS para verificar IP final
- `src/lib/file-guard.ts` — `assertFileType(file, allowed)`: lê magic bytes reais (não extensão), suporta PDF (`%PDF`), XML (`<?xml`), JPEG, PNG, GIF, WebP

---

## Arquitetura de Segurança e LGPD — v1.5

### Camadas implementadas

```
Request → M1 AuthGuard (cookie HMAC) → M2 TenantOwnershipGuard → M3 RbacGuard → M4 ResponseSanitizer
```

### RBAC (`src/lib/rbac.ts`)

| Role | obra_checklist | terreno_checklist | venda | comprador | financeiro |
|---|---|---|---|---|---|
| admin | R/W/D | R/W/D | R/W/D | R/W/D | R/W/D |
| engenheiro | R/W | R | R | R | R |
| corretor | R | R/W | R/W | R/W | R |
| cliente | R | R | R | R | — |

- `cargo TEXT DEFAULT 'admin'` em `usuarios` (PRAGMA migration)
- `checkPermission(role, resource, action)` — consulta matriz estática
- `parseRole(raw)` — fallback para `"cliente"` (menor privilégio)

### Tenant Guard (`src/lib/tenant-guard.ts`)

- `assertTenantOwnership(empresaId, type, resourceId)` — 1 query Prisma, lança `TenantViolationError` (403)
- Cobre 10 tipos: checklist, obra, terreno, venda, parcela, funcionario, nota_fiscal, diario, chamado, documento

### Response Mask (`src/lib/response-mask.ts`) — LGPD art. 5

| Role | CPF | Nome | Telefone | Email |
|---|---|---|---|---|
| admin | exposto | exposto | exposto | exposto |
| engenheiro/corretor | `***.***.***-**` | exposto | exposto | exposto |
| cliente | mascarado | `J*** S***` | `(**)****-****` | `j***@***.***` |

### LLM Safety (`src/lib/llm.ts`)

- `stripPII(text)` — remove CPF, CNPJ, telefone, email, nomes próprios antes de qualquer chamada
- `routeLLM(text, task)` — Tier 0 (regex, 0 tokens) → Tier 1 (Flash minimal ≤16 tokens) → Tier 2 (full)

### Audit Log (`src/lib/audit-log.ts` + `docker/migrate.sql`)

```sql
security_audit_logs: id, empresaId, userId, action, resourceType, resourceId,
                     result (allowed|denied), ipHash (SHA-256 primeiros 16 chars), criadoEm
```

- Fire-and-forget — não bloqueia a request
- Purge automático a cada restart do container (registros > 90 dias) — LGPD art. 15

### Checklist routes wrapadas

| Rota | Guarda adicionada |
|---|---|
| `PATCH /api/v1/checklist/item/[id]` | cargo lookup + RBAC por ownerType + logAudit |
| `POST /api/v1/checklist/obra/[id]/fase` | cargo lookup + `obra_checklist.write` + logAudit |
| `POST /api/v1/checklist/terreno/[id]/fase` | cargo lookup + `terreno_checklist.write` + logAudit |

---

## Pendências / Backlog

- [ ] **Terrenos: mapa** — integração Leaflet/Mapbox
- [ ] **Next.js 16** — major version, avaliar breaking changes antes de produção
- [ ] **Testes automatizados** — ainda sem suite

---

## Comandos de Operação (VM)

```bash
# Ver logs
docker compose -f /opt/prumo-canteiro/docker-compose.yml logs -f app

# Reiniciar
docker compose -f /opt/prumo-canteiro/docker-compose.yml restart

# Atualizar com novo código (git pull + rebuild)
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

**Após alterar schema.prisma:**
```bash
npx prisma db push && npx prisma generate
```
