# Changelog — PrumoCanteiro

Notas de release por tag de produção. As versões de produto (vX.Y) ficam detalhadas em [`docs/roadmap.md`](docs/roadmap.md).

---

## v1.1.0-prod — 23/06/2026 · App mobile-first

Leva focada em **responsividade e uso no celular** (canteiro de obra). Toda a mudança ficou na **camada de apresentação** (`style` → `className` Tailwind em props de layout) — **sem alteração em Server Actions, rotas, banco ou lógica de negócio**. Desktop (≥768px) permanece idêntico.

### ✨ Novidades
- **Menu hambúrguer (☰) no mobile:** botão no topo abre uma **gaveta lateral** com todas as 14 seções do app (espelha a Sidebar do desktop). A barra inferior ficou enxuta, com 5 atalhos rápidos (Início, Obras, Financeiro, Vendas, Equipe).
- **Cobrança via WhatsApp no celular:** o botão de cobrar parcela abre o **WhatsApp do próprio aparelho** (`wa.me`) com a mensagem pronta, contornando a trava `#131030` da Cloud API (modo de teste). No desktop mantém o envio automático pela Cloud API.
- **Skeletons de carregamento** no Quadro (feedback imediato em 4G/5G de obra) — `@keyframes cnt-shimmer` + classe reutilizável `.cnt-skel`.

### 📱 Telas tornadas responsivas
- **Abas da obra:** Quadro (kanban empilha + alvos de toque ≥44px), Notas (tabela → cartões), Financeiro/Equipe (2 col → 1 col), Cronograma/Gantt.
- **Dashboard:** KPIs em 2 colunas, bloco principal empilha, paddings enxutos.
- **Listas:** Obras (kanban com scroll horizontal), Terrenos, Vendas — headers/paddings/KPIs.
- **Funcionários** e **Notas fiscais:** tabelas viram cartões empilhados < 768px.
- **Financeiro:** paddings, KPIs 2-col, blocos 2-col empilham.

### 🐛 Correções
- O erro da Cloud API de cobrança aparecia como **JSON cru** no extrato de parcelas; agora vira uma frase amigável (`parseWaError`), com a resposta crua preservada no `cobrancaLog` para depuração.

### 🏗️ Técnico
- Estilo: inline styles + **Tailwind v4** (utilities responsivas `md:`/`lg:`). Breakpoints: `md` 768px (tabela→cartão, grids) · `lg` 1024px (Sidebar ↔ MobileNav).
- Arquivos: `components/layout/mobile-menu.tsx` (novo), `mobile-nav.tsx`, `app/globals.css`, abas da obra, views de lista, `lib/cobranca-service.ts`, `vendas/[id]/venda-detail.tsx`.
- Commits: `d2bc4d2` · `91ad658` · `68f2261` · `4959c1a` · `085babf`

---

## v1.0.0-prod — 17/06/2026 · Primeiro deploy estável

Primeira tag de produção na VM (Compradores CRUD, cobrar todos, cron de cobrança com dedup lifetime). Histórico completo de produto em [`docs/roadmap.md`](docs/roadmap.md).
