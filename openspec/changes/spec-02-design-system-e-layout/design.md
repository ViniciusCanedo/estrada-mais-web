## Context

A mudança `01-configuracao-projeto` consolidou a fundação Nuxt 4 + Drizzle ORM + SQLite (`better-sqlite3`), schemas Zod compartilhados (`shared/schemas/common.schema.ts` e `shared/schemas/health.schema.ts`), conversores escalados (`shared/utils/units.ts`) e o endpoint em 3 camadas `GET /api/health` (com suporte opcional a `?month=AAAA-MM` e `navigationCounts`). Atualmente, `app/assets/css/main.css` possui apenas os imports do Tailwind e `@nuxt/ui`, `app/layouts/default.vue` é apenas um wrapper vazio e `app/pages/index.vue` usa tema genérico com `<UColorModeButton />`.

Restrições da `.agents/CONSTITUTION.md` e gates aplicáveis:

- `eslint-plugin-better-tailwindcss` valida todas as classes Tailwind contra `app/assets/css/main.css`.
- `eslint-plugin-vuejs-accessibility` exige `<label for>` associado a `id` de inputs e `aria-label` em botões de ícone.
- `app/components/**` é proibido de chamar `useApiFetch`, `useFetch`, `useAsyncData` ou `$fetch` (verificado por ESLint e `dependency-cruiser`).
- Limite máximo de `250` linhas por arquivo `.vue` (excluindo comentários/linhas em branco) e `<= 8` props recomendadas por componente.
- Cobertura mínima global `>= 80%` (`>= 75%` branches) e `>= 90%` em `shared/**`, `server/services/**` e `server/repositories/**`.

## Goals / Non-Goals

**Goals:**

- Configurar os tokens **Night Highway**, fontes (`Oswald`, `Inter`, `JetBrains Mono`) e utilitários `@utility` compatíveis com Tailwind CSS v4 e `@nuxt/ui` v4 em tema escuro fixo.
- Disponibilizar formatadores `pt-BR` puros (`app/utils/formatters.ts`) reutilizando `shared/utils/units.ts` e normalizando espaço não-quebrável (`\u00a0`) em moeda BRL.
- Implementar os composables `useCompetencePeriod`, `useGlobalModals` e `useTelemetrySync` com estado SSR-safe via `useState`.
- Construir os componentes `AppRoadDivider`, `AppUnitInput`, `TelemetrySyncBadge`, `AppSidebar`, `AppTopBar` e compor o shell em `app/layouts/default.vue` com modais `UModal` globais funcionais.
- Criar `/design-system` (fiel ao mockup e restrito a `dev`), atualizar `/`, `app/error.vue` e disponibilizar stubs em `/trips`, `/expenses` e `/settings` para navegação ponta a ponta.

**Non-Goals:**

- Autenticação real (`/login`, sessão, logout na API) — escopo da spec `03-autenticacao` (o botão `Desconectar` e perfil do motorista ficam preparados via props/emits).
- Formulários completos de Viagens e Despesas dentro dos modais globais — escopo das specs `05` e `06` (os modais abrem/fecham e fornecem estrutura pronta para acoplamento).
- Gráficos, KPIs e tabelas das telas finais — escopo das specs `04`, `05`, `06` e `07`.

## Decisions

### 1. Tema Escuro Fixo via `ui.colorMode: false`, `htmlAttrs.class = 'dark'` e Tokens `--ui-*` em `main.css`

- **Decisão:** Desativar o alternador `@nuxtjs/color-mode` em `nuxt.config.ts` (`ui: { colorMode: false }`), fixar `htmlAttrs: { lang: 'pt-BR', class: 'dark' }`, declarar os tokens da spec no bloco `@theme` de `app/assets/css/main.css` e mapear as variáveis semânticas `--ui-*` (`--ui-bg`, `--ui-bg-elevated`, `--ui-border`, `--ui-primary`, `--ui-text*`) em `:root, .dark`.
- **Motivação:** Garante conformidade estrita com `RN-DS-01` (tema escuro industrial fixo), elimina flash de tema claro em navegadores com `prefers-color-scheme: light` (inclusive Playwright headless) e evita script inline de detecção de tema sob `nuxt-security`.
- **Alternativas consideradas:** Manter `@nuxtjs/color-mode` com `preference: 'dark'` (descartado porque valores prévios em `localStorage` poderiam sobrescrever para claro e o projeto não possui modo claro).

### 2. Uso de `@utility` do Tailwind CSS v4 para classes customizadas (`road-divider`, `road-divider-subtle`, `radar-pulse`)

- **Decisão:** Definir `.road-divider`, `.road-divider-subtle` e `.radar-pulse` com a diretiva `@utility` do Tailwind v4 em `app/assets/css/main.css`.
- **Motivação:** O plugin `eslint-plugin-better-tailwindcss` rejeita classes CSS simples não registradas na árvore de utilitários do Tailwind v4; `@utility` registra essas classes nativamente no motor do Tailwind v4 e passa no gate G2 (`lint`).
- **Alternativas consideradas:** Usar classes CSS comuns e desabilitar a regra do ESLint (proibido pela §9 da Constituição).

### 3. Normalização de espaço não-quebrável em `formatCurrencyFromCents` e suporte a execução pura em `useCompetencePeriod`

- **Decisão:** Em `app/utils/formatters.ts`, formatar moeda com `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })` substituindo `\u00a0` por espaço ASCII `' '`, reutilizando `fromCents`, `fromDeciliters` e `fromMilliKmL` de `#shared/utils/units`. Em `app/composables/useCompetencePeriod.ts`, extrair funções puras `shiftCompetenceMonth` e `formatCompetenceMonthLabel` e usar fallback seguro para `ref` caso `useState` não esteja disponível fora do runtime Nuxt.
- **Motivação:** Evita falhas sutis de igualdade de string (`'R$\u00a04,82'` vs `'R$ 4,82'`) em testes e asserções DOM, elimina duplicação de fatores de escala (`DRY`) e permite testar `useCompetencePeriod` diretamente tanto no projeto Vitest `unit` (`node`) quanto no projeto `nuxt` (`happy-dom`).
- **Alternativas consideradas:** Formatação manual de string sem `Intl` (descartado por ser mais propenso a erros de separador de milhar e sinal negativo).

### 4. Isolamento de I/O em `useTelemetrySync` e `default.vue` (Componentes puramente apresentacionais)

- **Decisão:** Apenas `app/composables/useTelemetrySync.ts` realiza chamadas a `/api/health` (usando `useApiFetch` para SSR/reatividade no `selectedMonth` e `$fetch` em `refreshSync()` para polling de 60s, foco da janela e reconexão `online`). `app/layouts/default.vue` inicializa `useTelemetrySync()` e `useGlobalModals()`, repassando estado via props para `AppSidebar` e `TelemetrySyncBadge`.
- **Motivação:** Cumpre rigorosamente `.dependency-cruiser.cjs` (`components-no-direct-io`) e `eslint.config.mjs` (`no-restricted-globals` em `app/components/**`), além de simplificar testes de componente com props explícitas.
- **Alternativas consideradas:** Chamar `useTelemetrySync()` dentro de `AppSidebar.vue` (descartado porque introduziria I/O indireto dentro de `app/components/` e acoplaria testes da Sidebar ao ciclo de polling).

### 5. Modularização da página `/design-system` em subcomponentes para respeitar o limite de 250 linhas

- **Decisão:** Dividir o catálogo vivo `app/pages/design-system.vue` em 4 subcomponentes focados em `app/components/design-system/` (`ColorPaletteSection.vue`, `TypographySection.vue`, `FormInputsSection.vue`, `ButtonMatrixSection.vue`) e proteger a rota com middleware inline verificando `import.meta.dev`.
- **Motivação:** O HTML completo das 4 seções excederia facilmente 250 linhas em um único SFC `.vue`, violando o Gate G4 (`max-lines: 250`). A divisão mantém cada `.vue` abaixo de 110 linhas e sem duplicação.
- **Alternativas consideradas:** Manter tudo em `design-system.vue` compactando classes (prejudicaria legibilidade e ficaria no limite de `max-lines`).

## Risks / Trade-offs

- **Risco:** `nuxt-security` ou build offline afetar carregamento das fontes `@nuxt/fonts` (`Oswald`, `Inter`, `JetBrains Mono`). → **Mitigação:** Configurar explicitamente `fonts.families` em `nuxt.config.ts` e validar `npm run build` + `npm run test:e2e` no ambiente real.
- **Risco:** `eslint-plugin-better-tailwindcss` sinalizar classes arbitrárias (ex.: `shadow-[0_0_15px_rgba(255,180,0,0.3)]`) ou conflito entre classes. → **Mitigação:** Executar `npm run lint` continuamente após criar CSS e componentes e usar utilitários Tailwind v4 válidos ou `@utility` dedicados quando necessário.
- **Risco:** Testes existentes (`test/nuxt/index.spec.ts` e `test/e2e/home.spec.ts`) quebrarem se seletores de `/api/health` na página inicial forem removidos. → **Mitigação:** Preservar os `data-testid` e fluxo de verificação do `/api/health` em `app/pages/index.vue` sob o novo visual Night Highway até a chegada da Spec `07`.
- **Risco:** Em produção (`nuxt build` usado pelo Playwright E2E), `import.meta.dev` é `false`, ocultando `Sistema de Design [SPEC]` e redirecionando `/design-system`. → **Mitigação:** Testar renderização da página `/design-system` e visibilidade em `dev` nos testes Nuxt (`test/nuxt/layout.spec.ts`) e testar ocultação/redirecionamento em produção nos testes E2E (`test/e2e/navigation.spec.ts`).
