## Context

As especificações anteriores estabeleceram a base SQLite/Drizzle (`01-configuracao-projeto` com seed de Abril a Setembro de 2026), o shell Night Highway (`02-design-system-e-layout` com `useCompetencePeriod`, `useTelemetrySync` e `AppRoadDivider`), a autenticação selada (`03-autenticacao` com `withAuthenticatedDriver` e `useAuthSession`), as configurações e metas (`04-configuracoes-e-perfil` com `driverRepository`, `useDriverSettings` e `test/e2e/settings.spec.ts`), a gestão de viagens (`05-viagens`) e o diário de despesas (`06-despesas`). Resta substituir os stubs de `app/pages/index.vue` e adicionar o painel de exportação contábil em `app/pages/settings.vue` mais a visão de impressão em `app/pages/reports/print.vue`.

Restrições arquiteturais e operacionais observadas:

- **Fronteiras de dependência (`dependency-cruiser` + `test/arch`):** `server/api/reports/**` delega exclusivamente para `ReportService` após validar query via `dashboardQuerySchema`; `ReportService` consome `ReportRepository` e `DriverRepository` sem acesso direto ao `better-sqlite3` ou Drizzle; `shared/**` permanece 100% puro; `app/components/**` nunca invoca `$fetch`, `useFetch`, `useAsyncData` ou `useApiFetch`.
- **Reutilização estrita (`jscpd <= 3%`):** Funções puras de deslocamento/rótulo de competência (`shiftCompetenceMonth`, `formatCompetenceMonthLabel`) em `app/composables/useCompetencePeriod.ts` podem viver em `shared/utils/competence.ts` e serem reexportadas pelo composable; mapeamento de `TripRow -> TripDto` e `ExpenseRow -> ExpenseDto` deve reutilizar mappers exportados por `trip.service.ts` e `expense.service.ts` em vez de duplicar conversões e schemas.
- **Compatibilidade com E2E existentes (`test/e2e/settings.spec.ts`):** `test/e2e/settings.spec.ts` cria um motorista isolado **sem viagens e sem despesas**, autentica e verifica imediatamente na rota `/` os elementos `data-testid="dashboard-max-cost-badge"` (`META: ≤ R$ 5,10`) e `data-testid="dashboard-consumption-target"` (`Meta 2,35 km/L`), e depois altera as metas em `/settings` e navega de volta para `/` verificando atualização imediata sem reload.
- **Limites ESLint & Qualidade:** Arquivos `.vue <= 250` linhas, funções `<= 50` linhas, complexidade `<= 10`, classes Tailwind v4 validadas (`better-tailwindcss`), acessibilidade (`vuejs-accessibility`) e cobertura `>= 90%` em `server/services/**`, `server/repositories/**` e `shared/**`.

## Goals / Non-Goals

**Goals:**

- Centralizar contratos Zod do módulo de relatórios em `shared/schemas/report.schema.ts` reutilizando `competenceMonthSchema`, `tripDtoSchema` e `expenseDtoSchema`.
- Unificar lógica pura de competência mensal e série de 6 meses em `shared/utils/competence.ts`.
- Implementar `ReportRepository` (`server/repositories/report.repository.ts`) com consultas Drizzle agregadas e listagens mensais ordenadas, e `ReportService` (`server/services/report.service.ts`) com fórmulas RN-DASH-01..06, rateio de proporções somando exatamente 100% e geração de CSV UTF-8 BOM protegido contra CSV Injection.
- Expor `GET /api/reports/dashboard` e `GET /api/reports/csv` autenticados e validados.
- Construir a interface completa do Painel Principal (`app/pages/index.vue`, `app/composables/useDashboard.ts`, `app/utils/dashboard.ts` e `app/components/dashboard/*.vue`), o card `AccountingExportCard.vue` em `/settings` e a página de impressão A4 (`app/layouts/print.vue` + `app/pages/reports/print.vue`).
- Garantir invalidação/atualização reativa de `'dashboard-summary'` e `'expenses-ledger'` em sessões, configurações, viagens e despesas.

**Non-Goals:**

- Alterar schema SQLite (`server/database/schema.ts`), migrations ou dados de seed (`server/database/seed*.ts`).
- Gerar arquivos binários PDF/XLSX no servidor (impressão usa `@media print` nativo do navegador).
- Alterar as páginas `/trips` e `/expenses` além da invalidação de cache nos composables.

## Decisions

### 1. Reuso isomórfico de competência mensal e mappers de DTO sem duplicação

- **Decisão:** Extrair `shiftCompetenceMonth`, `formatCompetenceMonthLabel` e adicionar `listLastSixMonths`, `formatShortMonthLabel` e `formatMonthTitlePtBr` em `shared/utils/competence.ts`, mantendo reexports em `app/composables/useCompetencePeriod.ts`. No servidor, exportar `toTripDto` de `server/services/trip.service.ts` e `toExpenseDto` de `server/services/expense.service.ts` para reutilização direta em `ReportService`.
- **Motivação:** Evita duplicação de cálculo de virada de ano entre front-end e back-end e elimina duplicação de mapeamento DTO (`jscpd`), mantendo `shared/**` livre de dependências de `server/` ou `app/`.
- **Alternativas consideradas:** Duplicar `shiftCompetenceMonth` dentro de `report.service.ts` ou replicar os mapeadores de `TripDto`/`ExpenseDto`; ambas violariam DRY e o teto de `jscpd <= 3%`.

### 2. Rateio exato de proporções (Largest Remainder Method) e proteção anti-NaN

- **Decisão:** Calcular `fuelPercent`, `tollPercent` e `maintenanceOthersPercent` em `ReportService` usando o método do maior resto (Hamilton) sobre os valores inteiros em centavos quando `totalExpensesCents > 0`, e retornar `0` para os três campos quando `totalExpensesCents === 0`. Para divisões por `totalKm`, `totalLiters`, `grossFreightCents`, `daysCount` ou `previousCostPerKmCents`, proteger cada divisor com `> 0`, retornando `0` (ou `null` no caso dos deltas comparativos de custo/km sem base anterior).
- **Motivação:** `Math.round` independente por parcela pode somar `99%` ou `101%`; o método do maior resto garante matematicamente soma exata `100%` para qualquer combinação positiva de despesas.
- **Alternativas consideradas:** Calcular `100 - fuel - toll` diretamente; poderia gerar resultado negativo ou distorcido quando duas parcelas arredondam para cima simultaneamente (`50.5 + 49.5 -> 51 + 50`).

### 3. Visibilidade das metas no estado vazio e invalidação de cache entre rotas

- **Decisão:** Em `app/pages/index.vue`, quando o mês estiver vazio (`totalKm === 0 && recentTrips.length === 0 && recentExpenses.length === 0`), exibir o banner de estado vazio (`data-testid="dashboard-empty-state"`) com atalhos `+ Registrar Viagem` e `+ Lançar Despesa`, mantendo renderizados `HeroCostCard` e `SecondaryStatsGrid` (com zeros seguros e os badges `dashboard-max-cost-badge` e `dashboard-consumption-target`). Para sincronização SPA entre `/`, `/settings`, `/trips` e `/expenses`, utilizar sinalizador reativo `useState<boolean>('estrada-dashboard-dirty')` combinado com `refreshNuxtData('dashboard-summary')` e `clearNuxtData('dashboard-summary')` ao retornar para `/`.
- **Motivação:** No Nuxt 4, `useAsyncData`/`useFetch` desconecta o listener `app:data:refresh` quando a página `/` é desmontada ao navegar para `/settings` ou `/trips`. Chamar apenas `refreshNuxtData('dashboard-summary')` fora da rota `/` não atualizaria o cache antes da volta do usuário, quebrando o fluxo de `test/e2e/settings.spec.ts`. O sinalizador + limpeza no momento apropriado garante atualização instantânea tanto com `/` montada (via modais globais na Top Bar) quanto ao retornar de outras rotas.
- **Alternativas consideradas:** Desabilitar completamente cache com `getCachedData: () => undefined` ou fazer fetch duplicado em `/api/settings` na página inicial; aumentaria chamadas redundantes de rede em cada navegação.

### 4. Gráfico SVG dinâmico com helper geométrico puro e componentização enxuta

- **Decisão:** Isolar a transformação dos 8 cards secundários (`buildSecondaryStatCards`) e o cálculo de escala/coordenadas do gráfico SVG (`buildCostTrendChartGeometry`, base `0` até `maxY = Math.max(6, ceil(max * 1.15))`) em `app/utils/dashboard.ts`, deixando `SecondaryStatsGrid.vue` e `CostTrendSvgChart.vue` abaixo de 150 linhas e facilmente testáveis em unidade/Nuxt.
- **Motivação:** Mantém os arquivos `.vue` muito abaixo do teto de 250 linhas e complexidade `<= 10`, garantindo escala proporcional correta nas barras empilhadas mesmo para meses zerados ou valores acima de `R$ 6,00/km`.
- **Alternativas consideradas:** Calcular SVG inline no template Vue; elevaria complexidade e tamanho dos SFCs.

### 5. CSV UTF-8 BOM seguro e relatório de impressão completo em `/reports/print`

- **Decisão:** Em `ReportService.generateMonthlyCsv`, prefixar `\uFEFF`, usar separador `;`, formatar números no padrão `pt-BR` e sanitizar células textuais iniciadas por `=`, `+`, `-`, `@`, `\t` ou `\r` prefixando `'` antes de aplicar escape de aspas RFC 4180. Em `app/pages/reports/print.vue` (`layout: 'print'`), consultar `GET /api/reports/dashboard`, `GET /api/trips?period=month` e `GET /api/expenses?category=todas` para o mês da query string (`?month=YYYY-MM`), exibindo resumo contábil e **todas** as viagens e despesas do mês em estilo claro A4 com `print:hidden` nos controles.
- **Motivação:** Mantém `/api/reports/dashboard` leve (top 5 recente) para atender `p(95) < 500ms` no smoke test de carga (`test/load/smoke.js`), enquanto `/reports/print` aproveita endpoints já existentes para listar 100% dos lançamentos exigidos pelo contador/IRPF.
- **Alternativas consideradas:** Retornar todas as viagens e despesas do mês dentro do payload de `/api/reports/dashboard`; aumentaria payload e latência da rota principal do Dashboard desnecessariamente.

## Risks / Trade-offs

- **Risco:** `SecondaryStatsGrid.vue` precisa atender simultaneamente ao texto `"Meta X,XX superada"` / `"Abaixo da meta X,XX"` (RN-DASH-01) e ao `data-testid="dashboard-consumption-target"` com texto exato `"Meta X,XX km/L"` exigido por `test/e2e/settings.spec.ts`. → **Mitigação:** Renderizar os dois elementos distintos dentro do card `MÉDIA DIESEL`: o texto exato `Meta X,XX km/L` no elemento `data-testid="dashboard-consumption-target"` e o status `Meta X,XX superada` / `Abaixo da meta X,XX` logo abaixo.
- **Risco:** Alteração em `app/pages/index.vue` quebra `test/nuxt/index.spec.ts` e `test/e2e/home.spec.ts` legados do stub `/api/health`. → **Mitigação:** Atualizar ambas as suítes para validar o Painel Principal conforme especificado no plano e manter `test/e2e/navigation.spec.ts` e `test/e2e/settings.spec.ts` verdes.
- **Risco:** Cobertura `< 90%` em branches de `report.service.ts`, `report.repository.ts`, `report.schema.ts` ou `shared/utils/competence.ts`. → **Mitigação:** Escrever testes unitários dedicados cobrindo mês vazio, virada de ano, déficit (`netMargin < 0`), motorista inexistente, CSV Injection (`=`, `+`, `-`, `@`, `\t`, `\r`, `;`, `"`), singleton `getDatabase()` e validação de query inválida.
