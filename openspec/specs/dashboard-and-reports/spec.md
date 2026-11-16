# dashboard-and-reports Specification

## Purpose

Definir os requisitos normativos do Painel Principal (Dashboard Mensal) e da Exportação Contábil para IRPF / Livro-Caixa do Caminhoneiro no Estrada+, abrangendo consolidação de quilometragem e consumo ponderado de diesel, agregação de despesas por categoria e rateio proporcional exato, indicador mestre de custo por quilômetro com comparativo mensal, sobra líquida e margem bruta, gráfico SVG de evolução em 6 meses, tabelas resumo recentes, exportação CSV UTF-8 BOM protegida contra CSV Injection e página de impressão A4 via `@media print`.

## Requirements

### Requirement: Consolidação de quilometragem e consumo médio de diesel no mês de competência (RN-DASH-01)

O sistema SHALL consolidar, para o `driverId` autenticado e o mês de competência `month` (`YYYY-MM`, padrão `2026-09` quando omitido), a quilometragem total (`totalKm = sum(trips.distance_km)`), a variação absoluta em relação ao mês imediatamente anterior (`deltaKmVsPrevious = totalKm(month) - totalKm(previousMonth)`), e a média ponderada de consumo de diesel (`averageDieselKmL = totalKm / sum(trips.fuel_liters)` em litros convertidos via `fromDeciliters`), retornando `0` sempre que `totalKm === 0` ou a soma de litros for `0`, sem produzir `NaN` ou `Infinity`. Na interface (`SecondaryStatsGrid.vue`), o card `MÉDIA DIESEL` MUST exibir o valor formatado, a referência exata da meta configurada (`data-testid="dashboard-consumption-target"` com texto `Meta X,XX km/L`) e o status da meta: `"Meta X,XX superada"` em verde quando `averageDieselKmL >= driver.targetConsumptionKmL` ou `"Abaixo da meta X,XX"` em âmbar/vermelho caso contrário.

#### Scenario: Cálculo da média ponderada e status de meta superada

- **WHEN** o motorista autenticado possui no mês `2026-09` viagens somando `3.755 km` e `15.527` decilitros (`1.552,7 L`) com meta `2350` milésimos (`2,35 km/L`)
- **THEN** `ReportService.getDashboardData` retorna `stats.kmDriven.totalKm = 3755`, `stats.dieselAverage.kmPerLiter ≈ 2.418`, `stats.dieselAverage.targetKmPerLiter = 2.35`, `isTargetMet = true` e a interface exibe `Meta 2,35 superada` além de `Meta 2,35 km/L`

#### Scenario: Mês sem viagens retorna zeros e mantém badge de meta configurada

- **WHEN** o motorista autenticado não possui viagens registradas no mês selecionado
- **THEN** `stats.kmDriven.totalKm` e `stats.dieselAverage.kmPerLiter` retornam `0` (sem `NaN` ou `Infinity`), `isTargetMet = false`, `SecondaryStatsGrid.vue` exibe `Abaixo da meta X,XX` e preserva `data-testid="dashboard-consumption-target"` com `Meta X,XX km/L`

### Requirement: Consolidação de despesas operacionais por categoria e agregação para gráfico (RN-DASH-02)

O sistema SHALL agregar todas as despesas do motorista no mês selecionado (`expenses` avulsas e vinculadas a viagens) mantendo somas exatas em centavos inteiros para cada uma das seis categorias (`combustivel`, `pedagio`, `borracharia`, `manutencao`, `alimentacao`, `outros`), somando `totalExpenseFuelDeciliters` em combustível, contabilizando ocorrências por categoria e recuperando as descrições mais recentes de `borracharia` e `manutencao` no mês (`orderBy desc(expenseDate), desc(id)`). Para os cards secundários e séries proporcionais, o grupo **"Manutenção/Outros"** MUST agregar `borracharia + manutencao + alimentacao + outros`, os cards `COMBUSTÍVEL`, `PEDÁGIOS`, `BORRACHARIA`, `MANUTENÇÃO` e `ALIMENTAÇÃO` MUST exibir os respectivos totais/médias calculados sem divisão por zero (`avgPricePerLiterReais = 0` se `totalLiters === 0`, `costPerKmReais = 0` se `totalKm === 0`, `dailyAverageReais = 0` se `daysCount === 0`), e `hero.proportions` MUST somar exatamente `100` (`fuelPercent + tollPercent + maintenanceOthersPercent === 100`) quando houver despesas (`totalExpensesCents > 0`) ou `{ fuelPercent: 0, tollPercent: 0, maintenanceOthersPercent: 0 }` quando zerado.

#### Scenario: Soma exata de proporções em 100% pelo método de maior resto e zero quando vazio

- **WHEN** `ReportService` calcula as proporções de um mês com despesas nas categorias `combustivel`, `pedagio` e grupo `borracharia + manutencao + alimentacao + outros`, vs. um mês sem despesas
- **THEN** no mês com despesas a soma `fuelPercent + tollPercent + maintenanceOthersPercent` resulta exatamente em `100`, e no mês sem despesas todas as proporções retornam `0`

#### Scenario: Cálculo seguro dos indicadores de combustível, pedágios, borracharia, manutenção e alimentação

- **WHEN** o mês possui abastecimentos em `expenses` (`5.000 dL`, `R$ 2.400,00`), pedágios, serviços de borracharia/manutenção e registros de alimentação
- **THEN** `ReportService` retorna `avgPricePerLiterReais` exato em `stats.fuel`, `costPerKmReais` em `stats.tolls`, a última descrição de cada categoria em `stats.tireShop.lastDescription` e `stats.maintenance.lastDescription`, e `dailyAverageReais` em `stats.food`

### Requirement: Indicador mestre Custo Médio Operacional por KM e comparativo mensal (RN-DASH-03)

O sistema SHALL calcular o indicador mestre em centavos inteiros por quilômetro como `operationalCostPerKmCents = totalKm > 0 ? Math.round(totalExpensesCents / totalKm) : 0`, convertendo via `fromCents` para `hero.costPerKmReais`. Para o comparativo com o mês anterior (`previousMonth`, tratando virada de ano como `2026-01` → `2025-12`), quando tanto `totalKm` atual quanto `operationalCostPerKmCents` do mês anterior forem positivos, `hero.deltaReaisPerKmVsPrevious` MUST refletir `fromCents(curr - prev)` e `hero.deltaPercentVsPrevious` MUST refletir `((curr - prev) / prev) * 100`; caso contrário, ambos MUST retornar `null`. Na interface (`HeroCostCard.vue`), o card MUST exibir o badge `data-testid="dashboard-max-cost-badge"` com texto exato `META: ≤ R$ X,XX`, badge verde `Economia de R$ X,XX/km` quando `delta <= 0` ou vermelho `Aumento de R$ X,XX/km` quando `delta > 0`, e barra proporcional de custos.

#### Scenario: Exibição de economia ou aumento vs mês anterior e meta configurada

- **WHEN** o custo operacional cai de `R$ 5,03/km` no mês anterior para `R$ 4,82/km` no mês atual com teto `R$ 5,10/km`
- **THEN** `HeroCostCard.vue` exibe `R$ 4,82`, `data-testid="dashboard-max-cost-badge"` com texto `META: ≤ R$ 5,10`, variação negativa em verde com `Economia de R$ 0,21/km` e barra proporcional somando `100%`

#### Scenario: Ausência de base comparativa no mês anterior retorna deltas nulos sem NaN

- **WHEN** o mês anterior não possui quilometragem ou despesas (`operationalCostPerKmCents === 0`) ou o mês atual tem `0 km`
- **THEN** `hero.deltaPercentVsPrevious` e `hero.deltaReaisPerKmVsPrevious` retornam `null` e `HeroCostCard.vue` exibe indicador neutro sem `NaN` ou `Infinity`

### Requirement: Sobra líquida, margem bruta e tabelas resumo do mês (RN-DASH-04)

O sistema SHALL calcular `grossFreightCents = sum(trips.freight_value_cents)`, `netMarginCents = grossFreightCents - totalExpensesCents` e `marginPercent = grossFreightCents > 0 ? (netMarginCents / grossFreightCents) * 100 : 0` (permitindo saldo líquido negativo quando as despesas superarem o frete bruto). O endpoint `GET /api/reports/dashboard` (validado por `dashboardQuerySchema` e protegido por `withAuthenticatedDriver`) MUST retornar `{ data: DashboardFullPayload }` contendo `driverProfile`, `hero`, `stats`, `trendSixMonths`, `recentTrips` (top 5 viagens do mês ordenadas por `tripDate desc, id desc`), `recentExpenses` (top 5 despesas do mês ordenadas por `expenseDate desc, id desc`), `recentTripsCount` (total de viagens no mês) e `recentExpensesCount` (total de despesas no mês), lançando `DomainError('NOT_FOUND', ...)` HTTP `404` se o motorista não existir e `401 Unauthorized` sem sessão. Na interface, `RecentTripsTableCard.vue` e `RecentExpensesTableCard.vue` MUST exibir os top 5 registros e links `Ver todas (N) →` para `/trips` e `/expenses`, e `app/pages/index.vue` MUST tratar estados de loading, erro e vazio (`totalKm === 0 && recentTrips.length === 0 && recentExpenses.length === 0`) exibindo atalhos `+ Registrar Viagem` e `+ Lançar Despesa` sem ocultar `dashboard-max-cost-badge` nem `dashboard-consumption-target`.

#### Scenario: Estado vazio no Painel Principal preserva metas e oferece atalhos operacionais

- **WHEN** um motorista recém-criado sem viagens e sem despesas acessa `/`
- **THEN** o Painel Principal exibe o estado vazio amigável com ações `+ Registrar Viagem` e `+ Lançar Despesa`, mantendo visíveis `data-testid="dashboard-max-cost-badge"` (`META: ≤ R$ X,XX`) e `data-testid="dashboard-consumption-target"` (`Meta X,XX km/L`)

#### Scenario: Controle de acesso e validação de query em GET /api/reports/dashboard

- **WHEN** uma requisição chega a `GET /api/reports/dashboard` sem cookie de sessão ou com `?month=2026-13`
- **THEN** o endpoint retorna HTTP `401 Unauthorized` sem sessão ou HTTP `400 Bad Request` em `pt-BR` quando `month` é inválido

### Requirement: Gráfico SVG de evolução do custo por KM nos últimos 6 meses (RN-DASH-05)

O sistema SHALL retornar em `trendSixMonths` exatamente 6 pontos em ordem cronológica encerrando no `month` selecionado (tratando viradas de ano, ex.: `2026-02` retorna `2025-09`, `2025-10`, `2025-11`, `2025-12`, `2026-01`, `2026-02`), cada qual com `{ month, label, totalCostPerKmReais, dieselPerKmReais, tollPerKmReais, maintenanceOthersPerKmReais, isAboveTarget, isCurrent }`, marcando `isAboveTarget = totalCostPerKmCents > driver.maxCostPerKmCents` e `isCurrent = true` apenas no sexto ponto (`label` com sufixo `(ATUAL)`). O componente `CostTrendSvgChart.vue` MUST renderizar SVG responsivo (`viewBox="0 0 900 200"`) com barras empilhadas dinâmicas (`Diesel`, `Pedágio`, `Manutenção/Outros`), polilinha `Total R$/km`, marcador vermelho (`#ef4444`) quando `isAboveTarget` e destaque âmbar (`#ffb400`) quando `isCurrent`, suportando inclusive meses zerados (`0 km`) sem `NaN`.

#### Scenario: Série histórica com virada de ano e destaque de teto ultrapassado

- **WHEN** `getDashboardData` é consultado para `month = '2026-02'` e um dos meses anteriores supera `maxCostPerKmCents`
- **THEN** `trendSixMonths` contém `['2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02']`, o mês acima do teto recebe `isAboveTarget: true` (marcador `#ef4444` no SVG) e `2026-02` recebe `isCurrent: true` e rótulo `'FEV (ATUAL)'`

### Requirement: Exportação contábil em CSV UTF-8 BOM anti-injeção e impressão PDF A4 (RN-DASH-06)

O sistema SHALL disponibilizar o endpoint autenticado `GET /api/reports/csv?month=YYYY-MM` retornando `Content-Type: text/csv; charset=utf-8` e `Content-Disposition: attachment; filename="estrada-mais-relatorio-YYYY-MM.csv"`, codificado com **UTF-8 BOM (`\uFEFF`)**, separador `;` e cabeçalhos em `pt-BR` contendo Resumo Mensal, Viagens do Mês e Despesas do Mês. Toda célula textual iniciada por `=`, `+`, `-`, `@`, `\t` ou `\r` MUST ser sanitizada contra CSV Injection prefixando `'` antes do escape de aspas RFC 4180. Na interface, `AccountingExportCard.vue` em `/settings` MUST oferecer os botões `Baixar Relatório CSV Completo` e `Imprimir Relatório Mensal PDF`, e a rota `/reports/print?month=YYYY-MM` (layout `print.vue`) MUST renderizar em papel claro otimizado para A4 (`@media print` ocultando barra de ações/navegação) os dados do motorista (`Nome`, `RNTRC`, `Veículo`, `Placas`, `Competência`), resumo contábil e tabelas completas do mês com botão `Imprimir / Salvar PDF` (`window.print()`).

#### Scenario: Download de CSV com UTF-8 BOM, separador ponto e vírgula e sanitização contra CSV Injection

- **WHEN** o motorista autenticado solicita `GET /api/reports/csv?month=2026-09` possuindo uma despesa cuja descrição inicia com `=CMD|'/C calc'!A0` ou `+SUM(A1)`
- **THEN** a resposta HTTP `200 OK` possui headers `Content-Type: text/csv; charset=utf-8` e `Content-Disposition: attachment; filename="estrada-mais-relatorio-2026-09.csv"`, o corpo inicia com `\uFEFF`, usa `;` como separador e prefixa `'` nas células perigosas (`'=CMD...`, `'+SUM...`)

#### Scenario: Navegação para relatório de impressão contábil A4 em /reports/print

- **WHEN** o motorista clica em `Imprimir Relatório Mensal PDF` em `/settings`
- **THEN** é direcionado para `/reports/print?month=YYYY-MM` em layout claro A4 exibindo identificação do motorista (`Nome`, `RNTRC`, `Placas`), resumo do livro-caixa, tabelas completas de viagens e despesas e botão `Imprimir / Salvar PDF` ocultável por `@media print`
