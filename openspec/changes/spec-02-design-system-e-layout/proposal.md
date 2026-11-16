## Why

A fundação técnica do Estrada+ (Nuxt 4, Drizzle/SQLite e endpoint `/api/health`) está estabelecida, mas a aplicação ainda usa o visual padrão do template sem a identidade industrial **"Night Highway"**, sem shell de navegação persistente (`Sidebar` + `Top Bar`), sem estado reativo global de competência mensal e sem componentes base de telemetria (`AppUnitInput`, `AppRoadDivider`, `TelemetrySyncBadge`). Esta mudança implementa o sistema de design e o layout estrutural que servirão de base visual e interativa para autenticação, configurações, viagens, despesas e painel principal.

## What Changes

- Configurar os tokens visuais **"Night Highway"** (`asphalt`, `amber`, `expense-blue`, `highway`), fontes (`Oswald`, `Inter`, `JetBrains Mono`) e utilitários Tailwind CSS v4 (`@utility road-divider`, `@utility road-divider-subtle`, `@utility radar-pulse`) em `app/assets/css/main.css`, `app/app.config.ts` e `nuxt.config.ts` com tema escuro fixo.
- Criar os formatadores puros em `pt-BR` (`app/utils/formatters.ts`) reutilizando conversores escalados de `shared/utils/units.ts`, além dos composables reativos `useCompetencePeriod.ts`, `useGlobalModals.ts` e `useTelemetrySync.ts`.
- Implementar os componentes base de UI (`app/components/ui/AppRoadDivider.vue`, `app/components/ui/AppUnitInput.vue`) e de layout (`app/components/layout/TelemetrySyncBadge.vue`, `app/components/layout/AppSidebar.vue`, `app/components/layout/AppTopBar.vue`), compostos no shell `app/layouts/default.vue` com modais globais `UModal` funcionais.
- Criar o catálogo vivo `app/pages/design-system.vue` (restrito a `import.meta.dev === true`, redirecionando para `/` em produção) com suas 4 seções, estilizar `app/pages/index.vue` e `app/error.vue` em Night Highway, e adicionar stubs navegáveis em `app/pages/trips.vue`, `app/pages/expenses.vue` e `app/pages/settings.vue`.
- Adicionar cobertura completa de testes unitários (`test/unit/formatters.spec.ts`), Nuxt (`test/nuxt/layout.spec.ts`, `test/nuxt/unit-input.spec.ts`, `test/nuxt/index.spec.ts`) e E2E (`test/e2e/navigation.spec.ts`, `test/e2e/home.spec.ts`).

## Capabilities

### New Capabilities

- `design-system-layout`: Identidade visual fixa "Night Highway", hierarquia tipográfica (`Oswald`, `Inter`, `JetBrains Mono`), formatadores `pt-BR`, seletor global reativo de competência mensal, indicador de telemetria `SYNC OK` via `/api/health`, shell persistente (`AppSidebar`, `AppTopBar`, modais globais), componente `AppUnitInput` e catálogo `/design-system` restrito ao ambiente de desenvolvimento.

### Modified Capabilities

<!-- Nenhuma capacidade existente em openspec/specs/ tem seus requisitos alterados nesta mudança -->

## Non-Goals

- Fluxos de autenticação (`login`, `forgot-password`, `reset-password`, middleware de sessão e endpoint `/api/auth/*`, escopo de `03-autenticacao`).
- CRUD completo e formulários de domínio de Configurações (`04`), Viagens (`05`), Despesas (`06`) e Painel Principal / Relatórios (`07`).
- Alteração de schema Drizzle ou criação de novas tabelas SQLite.

## Impact

- Configuração e estilo: `app/assets/css/main.css`, `app/app.config.ts`, `app/app.vue`, `app/error.vue`, `nuxt.config.ts`.
- Utilitários e composables: `app/utils/formatters.ts`, `app/composables/useCompetencePeriod.ts`, `app/composables/useGlobalModals.ts`, `app/composables/useTelemetrySync.ts`.
- Componentes e layouts: `app/layouts/default.vue`, `app/components/ui/**`, `app/components/layout/**`, `app/components/design-system/**`.
- Páginas e testes: `app/pages/design-system.vue`, `app/pages/index.vue`, `app/pages/trips.vue`, `app/pages/expenses.vue`, `app/pages/settings.vue`, `test/unit/formatters.spec.ts`, `test/nuxt/*.spec.ts`, `test/e2e/*.spec.ts`.
