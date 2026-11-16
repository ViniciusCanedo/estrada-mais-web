## Why

Com a entrega da autenticação (`03-autenticacao`), configurações do motorista (`04-configuracoes-e-perfil`), gestão de viagens (`05-viagens`) e diário de despesas (`06-despesas`), a página inicial (`/`) ainda exibe apenas o diagnóstico de saúde do servidor e a tela `/settings` ainda não conta com exportação contábil. Esta mudança implementa o **Painel Principal (Dashboard Mensal)** completo — consolidando custo operacional por quilômetro, os 8 indicadores secundários, a série histórica de 6 meses e as tabelas resumo — além da **Exportação Contábil** para IRPF / Livro-Caixa do Caminhoneiro (CSV UTF-8 com BOM e página de impressão A4 em PDF).

## What Changes

- Criar `shared/schemas/report.schema.ts` com `dashboardQuerySchema`, `monthlyTrendPointSchema`, `reportDriverProfileSchema`, `dashboardSummaryResponseSchema`, `dashboardFullPayloadSchema` e tipos inferidos via `z.infer`, reutilizando `competenceMonthSchema`, `tripDtoSchema` e `expenseDtoSchema`.
- Extrair funções puras e isomórficas de competência mensal e série de 6 meses para `shared/utils/competence.ts` (reexportadas por `app/composables/useCompetencePeriod.ts` sem duplicação).
- Criar `server/repositories/report.repository.ts` com agregações mensais Drizzle ORM sobre `trips` e `expenses` (`getMonthlyAggregates`, `getSixMonthsAggregates`, `listTripsForMonth`, `listExpensesForMonth`).
- Criar `server/services/report.service.ts` implementando as regras RN-DASH-01 a RN-DASH-06 (indicador mestre `R$/km`, proporções com soma exata `100%` ou `0%` sem `NaN`/`Infinity`, sobra líquida, série de 6 meses com virada de ano, top 5 viagens/despesas e geração de CSV UTF-8 BOM `;` com proteção contra CSV Injection).
- Criar os endpoints autenticados `GET /api/reports/dashboard` e `GET /api/reports/csv` usando `withAuthenticatedDriver` e `getValidatedQuery(event, dashboardQuerySchema.parse)`.
- Criar `app/composables/useDashboard.ts`, utilitários em `app/utils/dashboard.ts`, os 5 componentes em `app/components/dashboard/` (`HeroCostCard.vue`, `SecondaryStatsGrid.vue`, `CostTrendSvgChart.vue`, `RecentTripsTableCard.vue`, `RecentExpensesTableCard.vue`), `app/components/settings/AccountingExportCard.vue`, `app/layouts/print.vue` e `app/pages/reports/print.vue`.
- Atualizar `app/pages/index.vue` (painel completo com estados de loading, erro e vazio preservando `dashboard-max-cost-badge` e `dashboard-consumption-target`), `app/pages/settings.vue` (montando `AccountingExportCard.vue`) e invalidar `'dashboard-summary'` / `'expenses-ledger'` em `useAuthSession.ts`, `useDriverSettings.ts`, `useTrips.ts` e `useExpenses.ts`.
- Adicionar testes unitários (`report.repository.spec.ts`, `report.service.spec.ts`, `report.endpoints.spec.ts`), testes Nuxt (`dashboard.spec.ts` e atualização de `index.spec.ts`), testes E2E Playwright (`dashboard-and-export.spec.ts` e atualização de `home.spec.ts`) e incluir `/api/reports/dashboard` nos scripts `test/load/smoke.js` e `test/load/load.js`.

## Capabilities

### New Capabilities

- `dashboard-and-reports`: Consolidação mensal de telemetria e custos (`R$/km`, 8 indicadores secundários, gráfico SVG de evolução em 6 meses, top 5 viagens/despesas recentes com tratamento de estado vazio) e exportação contábil para IRPF / Livro-Caixa (`GET /api/reports/csv` em UTF-8 BOM com proteção anti-CSV Injection e página `/reports/print` formatada para A4 via `@media print`).

### Modified Capabilities

<!-- Nenhuma capacidade existente em openspec/specs/ tem seus requisitos removidos ou invalidados; metas de telemetria continuam sincronizadas entre /settings e /. -->

## Non-Goals

- Alterar o schema Drizzle (`server/database/schema.ts`), gerar novas migrations ou modificar `server/database/seed.ts` / `seed-data.ts`.
- Implementar envio automatizado de relatórios por e-mail ou geração binária de `.xlsx`/PDF server-side (impressão A4 utiliza CSS `@media print` + `window.print()`).
- Alterar fluxos ou tabelas das telas `/trips` e `/expenses` além da invalidação reativa dos caches `'dashboard-summary'` e `'expenses-ledger'`.

## Impact

- **Contratos compartilhados (`shared/`):** `shared/schemas/report.schema.ts`, `shared/utils/competence.ts`.
- **Servidor (`server/`):** `server/repositories/report.repository.ts`, `server/services/report.service.ts`, `server/services/trip.service.ts` (export do mapper `toTripDto`), `server/services/expense.service.ts` (export do mapper `toExpenseDto`), `server/api/reports/dashboard.get.ts`, `server/api/reports/csv.get.ts`.
- **Front-end (`app/`):** `app/composables/{useDashboard,useCompetencePeriod,useAuthSession,useDriverSettings,useTrips,useExpenses}.ts`, `app/utils/dashboard.ts`, `app/components/dashboard/*.vue`, `app/components/settings/AccountingExportCard.vue`, `app/layouts/print.vue`, `app/pages/reports/print.vue`, `app/pages/index.vue`, `app/pages/settings.vue`.
- **Testes e Carga (`test/`):** `test/unit/report.*.spec.ts`, `test/nuxt/{dashboard,index}.spec.ts`, `test/e2e/{dashboard-and-export,home}.spec.ts`, `test/load/{smoke,load}.js`.
