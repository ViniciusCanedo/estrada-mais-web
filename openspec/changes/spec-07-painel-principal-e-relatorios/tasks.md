## 1. Schemas Zod e Utilitários Compartilhados

- [x] 1.1 Criar `shared/schemas/report.schema.ts` com `dashboardQuerySchema`, `monthlyTrendPointSchema`, `reportDriverProfileSchema`, `dashboardSummaryResponseSchema`, `dashboardFullPayloadSchema` e tipos inferidos reutilizando `competenceMonthSchema`, `tripDtoSchema` e `expenseDtoSchema`
- [x] 1.2 Extrair lógica pura de competência mensal e série de 6 meses para `shared/utils/competence.ts` e reexportar `shiftCompetenceMonth` / `formatCompetenceMonthLabel` em `app/composables/useCompetencePeriod.ts`

## 2. Repository, Service e Endpoints HTTP

- [x] 2.1 Implementar `server/repositories/report.repository.ts` com `getMonthlyAggregates`, `getSixMonthsAggregates`, `listTripsForMonth` e `listExpensesForMonth` via Drizzle ORM sobre `trips` e `expenses`
- [x] 2.2 Exportar mappers `toTripDto` (`server/services/trip.service.ts`) e `toExpenseDto` (`server/services/expense.service.ts`) e implementar `server/services/report.service.ts` com RN-DASH-01..06, proporções exatas (soma 100% ou 0%) sem `NaN`/`Infinity` e geração de CSV UTF-8 BOM (`\uFEFF`) separador `;` com proteção anti-CSV Injection
- [x] 2.3 Implementar `server/api/reports/dashboard.get.ts` e `server/api/reports/csv.get.ts` autenticados via `withAuthenticatedDriver` e validados por `dashboardQuerySchema`

## 3. Front-end: Composables, Componentes do Dashboard, Exportação e Impressão

- [x] 3.1 Implementar `app/composables/useDashboard.ts` (`useDashboard` e `usePrintReport`) reativo a `selectedMonth` com chave `'dashboard-summary'` e garantir invalidação/refresh de `'dashboard-summary'` (e `'expenses-ledger'`) em `useAuthSession.ts`, `useDriverSettings.ts`, `useTrips.ts` e `useExpenses.ts`
- [x] 3.2 Criar helpers puros em `app/utils/dashboard.ts` e os componentes `HeroCostCard.vue`, `SecondaryStatsGrid.vue`, `CostTrendSvgChart.vue`, `RecentTripsTableCard.vue` e `RecentExpensesTableCard.vue` em `app/components/dashboard/` respeitando Night Highway, acessibilidade e limite `<= 250` linhas
- [x] 3.3 Atualizar `app/pages/index.vue` com o Painel Principal completo, estados de loading/erro/vazio com atalhos `+ Registrar Viagem` e `+ Lançar Despesa`, preservando `dashboard-max-cost-badge` e `dashboard-consumption-target` mesmo sem viagens
- [x] 3.4 Criar `app/components/settings/AccountingExportCard.vue` e integrá-lo em `app/pages/settings.vue`; criar `app/layouts/print.vue` e `app/pages/reports/print.vue` com formatação contábil A4 (`@media print` + `window.print()`)

## 4. Testes Automatizados, Scripts de Carga e Quality Gate

- [x] 4.1 Criar `test/unit/report.repository.spec.ts`, `test/unit/report.service.spec.ts` e `test/unit/report.endpoints.spec.ts` cobrindo fórmulas RN-DASH-01..06, virada de ano, mês vazio sem `NaN`, CSV BOM/injeção, endpoints HTTP e cobertura `>= 90%`
- [ ] 4.2 Criar `test/nuxt/dashboard.spec.ts` e atualizar `test/nuxt/index.spec.ts` cobrindo `HeroCostCard`, `SecondaryStatsGrid`, `CostTrendSvgChart` (real e `0 km`), `AccountingExportCard`, `reports/print.vue` e `index.vue`
- [ ] 4.3 Atualizar `test/e2e/home.spec.ts` e criar `test/e2e/dashboard-and-export.spec.ts` validando Painel Principal de Setembro 2026, troca de competência mensal, `/reports/print` e download CSV válido em `/settings`
- [ ] 4.4 Atualizar `test/load/smoke.js` e `test/load/load.js` incluindo `/api/reports/dashboard` com thresholds da Constituição §6 e validar `npm run format` e `npm run quality` com exit code `0`
