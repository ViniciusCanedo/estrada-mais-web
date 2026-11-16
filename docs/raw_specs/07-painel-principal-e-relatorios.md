# 07 — Especificação Técnica: Painel Principal e Relatórios Contábeis (`painel-principal-e-relatorios`)

## 1. Visão Geral

Este módulo consolida todos os indicadores operacionais e financeiros do motorista autônomo no **Painel Principal (Dashboard Mensal)**, o **gráfico de evolução do Custo por KM nos últimos 6 meses**, as tabelas resumo de **Últimas Viagens e Últimas Despesas** e as funcionalidades de **Exportação Contábil para IRPF / Livro-Caixa do Caminhoneiro** (download de arquivo CSV consolidado e página de impressão de Relatório Mensal em PDF via `@media print`).

**Telas e elementos do mockup ([estrada-desktop.html](file:///Users/vinicius.canedo/Documents/trae_projects/estrada_mais_web/estrada-desktop.html)) cobertos:**

- **Tela 1 — Painel Principal (`#screen-dashboard`, `[data-od-id="screen-dashboard"]`, linhas 308–733):**
  - **Hero Card — Indicador Mestre (`[data-od-id="hero-cost-card"]`, linhas 314–356):** `Custo Médio Operacional (R$/km)`, meta (`META: ≤ R$ 5,10`), comparativo com o mês anterior (`↓ -4.1% vs Agosto`, `Economia de R$ 0,21/km`) e barra proporcional (`Combustível %`, `Pedágio %`, `Manut. %`).
  - **Grid de 8 Indicadores Secundários (`[data-od-id="secondary-stat-grid"]`, linhas 359–469):**
    1. `KM RODADOS` (`km no mês` + delta `km vs mês anterior`)
    2. `MÉDIA DIESEL` (`km / Litro S10` + comparativo com a `Meta` configurada)
    3. `COMBUSTÍVEL` (total `R$`, total `L`, preço médio `R$/L`, nº de abastecimentos)
    4. `PEDÁGIOS` (total `R$`, `R$/km`, nº de registros)
    5. `BORRACHARIA` (total `R$`, nº de serviços, último estabelecimento)
    6. `MANUTENÇÃO` (total `R$`, resumo do último serviço)
    7. `ALIMENTAÇÃO` (total `R$`, nº de diárias/registros, média `R$/dia`)
    8. `SOBRA LÍQUIDA` (`Fretes - Despesas` em `R$` + `Margem: X% do bruto`)
  - **Gráfico de Evolução do Custo por KM (`[data-od-id="chart-cost-trend"]`, linhas 473–582):** Gráfico SVG de 6 meses com barras empilhadas (`Diesel`, `Pedágio`, `Manutenção/Outros`) e linha de tendência `Total R$/km`.
  - **Tabelas Lado a Lado (`[data-od-id="dashboard-tables"]`, linhas 585–731):** `Últimas Viagens Registradas` (top 5) e `Últimas Despesas Operacionais` (top 5).
- **Card "Exportação Contábil" em Configurações (linhas 1348–1362):**
  - Botão `Baixar Relatório CSV Completo` (`GET /api/reports/csv`)
  - Botão `Imprimir Relatório Mensal PDF` (rota `/reports/print?month=YYYY-MM` com `@media print` e `window.print()`).

---

## 2. Regras de Negócio e Critérios de Aceite

### 2.1 Regras de Negócio e Fórmulas de Consolidação

Para o mês de competência selecionado (`month = YYYY-MM`, sendo `previousMonth` o mês imediatamente anterior):

1. **RN-DASH-01 — Quilometragem e Consumo no Mês (`trips`):**
   - $\text{totalKm} = \sum \text{trips.distance\_km}$ no mês `month`.
   - $\text{deltaKmVsPrevious} = \text{totalKm}_{\text{month}} - \text{totalKm}_{\text{previousMonth}}$.
   - $\text{averageDieselKmL} = \text{totalKm} > 0 \land \sum \text{trips.fuelLiters} > 0 \implies \frac{\text{totalKm}}{\sum \text{trips.fuelLiters}}$, senão `0`.
   - Status da meta de diesel: se $\text{averageDieselKmL} \ge \text{driver.targetConsumptionKmL}$, exibe `"Meta X,XX superada"` em verde; caso contrário, `"Abaixo da meta X,XX"` em âmbar/vermelho.
2. **RN-DASH-02 — Custos Operacionais por Categoria (`expenses`):**
   - $\text{totalExpensesCents} = \sum \text{expenses.amount\_cents}$ no mês `month`.
   - $\text{fuelCostCents} = \sum \text{expenses(category='combustivel').amount\_cents}$.
   - $\text{tollCostCents} = \sum \text{expenses(category='pedagio').amount\_cents}$.
   - $\text{tireShopCostCents} = \sum \text{expenses(category='borracharia').amount\_cents}$.
   - $\text{maintenanceCostCents} = \sum \text{expenses(category='manutencao').amount\_cents}$.
   - $\text{foodCostCents} = \sum \text{expenses(category='alimentacao').amount\_cents}$.
   - $\text{otherCostCents} = \sum \text{expenses(category='outros').amount\_cents}$.
   - Para a barra proporcional e o gráfico de 6 meses, o grupo **"Manutenção/Outros"** agrega `borracharia + manutencao + alimentacao + outros`.
3. **RN-DASH-03 — Indicador Mestre (`Custo Médio Operacional R$/km`):**
   - $\text{operationalCostPerKmCents} = \text{totalKm} > 0 \implies \text{round}\left(\frac{\text{totalExpensesCents}}{\text{totalKm}}\right)$, senão `0`.
   - Comparativo com o mês anterior (`previousMonth`):
     - $\text{diffPerKmCents} = \text{operationalCostPerKmCents}_{\text{month}} - \text{operationalCostPerKmCents}_{\text{previousMonth}}$
     - $\text{deltaPercent} = \text{operationalCostPerKmCents}_{\text{previousMonth}} > 0 \implies \frac{\text{diffPerKmCents}}{\text{operationalCostPerKmCents}_{\text{previousMonth}}} \times 100$
     - Se $\text{diffPerKmCents} \le 0$: badge verde (`Economia de R$ X,XX/km`). Se $> 0$: badge vermelho (`Aumento de R$ X,XX/km`).
4. **RN-DASH-04 — Sobra Líquida e Margem Bruta:**
   - $\text{grossFreightCents} = \sum \text{trips.freight\_value\_cents}$ no mês `month`.
   - $\text{netMarginCents} = \text{grossFreightCents} - \text{totalExpensesCents}$.
   - $\text{netMarginPercent} = \text{grossFreightCents} > 0 \implies \left(\frac{\text{netMarginCents}}{\text{grossFreightCents}}\right) \times 100$, senão `0`.
5. **RN-DASH-05 — Gráfico de Tendência (Últimos 6 Meses):**
   - Retorna uma série ordenada cronologicamente com os 6 meses encerrando no `month` selecionado (ex.: para `2026-09`, retorna `2026-04`, `2026-05`, `2026-06`, `2026-07`, `2026-08` e `2026-09`).
   - Cada ponto contém `{ month, labelShort, totalCostPerKmReais, dieselPerKmReais, tollPerKmReais, maintenanceAndOthersPerKmReais, isAboveTarget, isCurrent }`.
6. **RN-DASH-06 — Exportação Contábil CSV e Impressão PDF:**
   - `GET /api/reports/csv?month=YYYY-MM` gera arquivo CSV codificado em **UTF-8 com BOM (`\uFEFF`)** e separador `;` (padrão contábil/Excel no Brasil), contendo seção de Resumo Mensal, listagem de Viagens (com Frete, KM e NF-e) e listagem de Despesas (com Data, Categoria, Estabelecimento, Pagamento, Comprovante e Valor).
   - A ação `Imprimir Relatório Mensal PDF` abre `/reports/print?month=YYYY-MM` com layout contábil limpo (cabeçalho com Nome do Motorista, RNTRC, Placas, Competência, Resumo de Livro-Caixa e tabelas completas) e aciona `window.print()`.

### 2.2 Critérios de Aceite (Checklist Verificável)

- [ ] Hero Card exibe `Custo Médio Operacional R$/km`, meta configurada, variação percentual/nominal vs. mês anterior e barra proporcional de custos.
- [ ] Todos os 8 cards secundários exibem valores reais calculados a partir do banco SQLite para o mês selecionado na Top Bar.
- [ ] Gráfico SVG renderiza dinamicamente as barras empilhadas e a polilinha dos últimos 6 meses, destacando em vermelho os meses que ultrapassaram o teto de custo/km e em âmbar o mês atual.
- [ ] Tabelas de Últimas Viagens e Últimas Despesas exibem os 5 registros mais recentes do mês e botões `Ver todas (N) →` que navegam para `/trips` e `/expenses`.
- [ ] Estado vazio (mês sem viagens/despesas) é tratado com interface clara e atalho para registrar a primeira viagem/despesa (sem `NaN` ou divisão por zero).
- [ ] Download do CSV (`GET /api/reports/csv`) entrega arquivo `.csv` válido com cabeçalho `Content-Disposition: attachment; filename="estrada-mais-relatorio-YYYY-MM.csv"`.
- [ ] Página `/reports/print` formata o relatório para impressão A4 (`@media print`) ocultando elementos de navegação.

---

## 3. Modelo de Dados

Este módulo realiza leituras e agregações sobre as tabelas `drivers`, `trips` e `expenses` definidas nos módulos `03`, `04`, `05` e `06`, aproveitando os índices compostos `trips_driver_date_idx (driver_id, trip_date)` e `expenses_driver_category_date_idx (driver_id, category, expense_date)`.

---

## 4. Schemas Zod (`shared/schemas/report.schema.ts`)

```ts
// shared/schemas/report.schema.ts
import { z } from 'zod'
import { competenceMonthSchema } from './common.schema'

export const dashboardQuerySchema = z.object({
  month: competenceMonthSchema.optional(),
})

export const monthlyTrendPointSchema = z.object({
  month: z.string(), // YYYY-MM
  label: z.string(), // Ex.: 'ABR', 'SET (ATUAL)'
  totalCostPerKmReais: z.number(),
  dieselPerKmReais: z.number(),
  tollPerKmReais: z.number(),
  maintenanceOthersPerKmReais: z.number(),
  isAboveTarget: z.boolean(),
  isCurrent: z.boolean(),
})

export const dashboardSummaryResponseSchema = z.object({
  month: z.string(),
  monthLabel: z.string(),
  hero: z.object({
    costPerKmReais: z.number(),
    targetMaxCostPerKmReais: z.number(),
    deltaPercentVsPrevious: z.number().nullable(),
    deltaReaisPerKmVsPrevious: z.number().nullable(),
    previousMonthLabel: z.string(),
    proportions: z.object({
      fuelPercent: z.number(),
      tollPercent: z.number(),
      maintenanceOthersPercent: z.number(),
    }),
  }),
  stats: z.object({
    kmDriven: z.object({
      totalKm: z.number(),
      deltaKmVsPrevious: z.number(),
    }),
    dieselAverage: z.object({
      kmPerLiter: z.number(),
      targetKmPerLiter: z.number(),
      isTargetMet: z.boolean(),
    }),
    fuel: z.object({
      totalReais: z.number(),
      totalLiters: z.number(),
      avgPricePerLiterReais: z.number(),
      refuelingsCount: z.number(),
    }),
    tolls: z.object({
      totalReais: z.number(),
      costPerKmReais: z.number(),
      recordsCount: z.number(),
    }),
    tireShop: z.object({
      totalReais: z.number(),
      recordsCount: z.number(),
      lastDescription: z.string().nullable(),
    }),
    maintenance: z.object({
      totalReais: z.number(),
      recordsCount: z.number(),
      lastDescription: z.string().nullable(),
    }),
    food: z.object({
      totalReais: z.number(),
      daysCount: z.number(),
      dailyAverageReais: z.number(),
    }),
    netMargin: z.object({
      netMarginReais: z.number(),
      grossFreightReais: z.number(),
      totalExpensesReais: z.number(),
      marginPercent: z.number(),
    }),
  }),
  trendSixMonths: z.array(monthlyTrendPointSchema),
  recentTripsCount: z.number(),
  recentExpensesCount: z.number(),
})

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>
export type MonthlyTrendPoint = z.infer<typeof monthlyTrendPointSchema>
export type DashboardSummaryResponse = z.infer<typeof dashboardSummaryResponseSchema>
```

---

## 5. Endpoints

| Método | Rota                     | Schema de Entrada                         | Formato de Resposta                                                                                       | Códigos de Erro                               |
| :----: | :----------------------- | :---------------------------------------- | :-------------------------------------------------------------------------------------------------------- | :-------------------------------------------- |
| `GET`  | `/api/reports/dashboard` | `dashboardQuerySchema` (`?month=2026-09`) | `200 OK`: `{ data: DashboardSummaryResponse & { recentTrips: TripDto[], recentExpenses: ExpenseDto[] } }` | `400` (mês inválido), `401` (não autenticado) |
| `GET`  | `/api/reports/csv`       | `dashboardQuerySchema` (`?month=2026-09`) | `200 OK` (`text/csv; charset=utf-8`): conteúdo CSV com BOM                                                | `400` (mês inválido), `401` (não autenticado) |

---

## 6. Services e Repositories

### 6.1 `server/repositories/report.repository.ts`

```ts
export interface MonthlyRawAggregates {
  month: string
  totalDistanceKm: number
  totalTripFuelDeciliters: number
  totalGrossFreightCents: number
  tripsCount: number
  expensesByCategoryCents: Record<ExpenseCategory, number>
  expensesCountByCategory: Record<ExpenseCategory, number>
  totalExpenseFuelDeciliters: number
  lastTireShopDescription: string | null
  lastMaintenanceDescription: string | null
}

export interface IReportRepository {
  getMonthlyAggregates(driverId: number, month: string): MonthlyRawAggregates
  getSixMonthsAggregates(driverId: number, months: string[]): MonthlyRawAggregates[]
}
```

### 6.2 `server/services/report.service.ts`

```ts
export interface IReportService {
  getDashboardData(driverId: number, month?: string): DashboardFullPayload
  generateMonthlyCsv(driverId: number, month?: string): { filename: string; content: string }
}
```

---

## 7. Front-end

### 7.1 Páginas, Layouts, Componentes e Composables

| Tipo           | Caminho                                                | Responsabilidade                                                                                                                                  |
| :------------- | :----------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Página**     | `app/pages/index.vue`                                  | Página inicial (Painel Principal): orquestra `HeroCostCard`, `SecondaryStatsGrid`, `CostTrendSvgChart`, `RecentTripsCard` e `RecentExpensesCard`. |
| **Página**     | `app/pages/reports/print.vue`                          | Relatório Mensal formatado para contador/Carnê-Leão com botão `Imprimir / Salvar PDF` (`window.print()`) e layout `@media print`.                 |
| **Layout**     | `app/layouts/print.vue`                                | Layout em papel claro/alto contraste para impressão A4 econômica e legível.                                                                       |
| **Componente** | `app/components/dashboard/HeroCostCard.vue`            | Card de destaque (4 colunas) com borda `border-amber/70`, `R$/km`, delta vs. mês anterior e barra proporcional de custos.                         |
| **Componente** | `app/components/dashboard/SecondaryStatsGrid.vue`      | Grid de 8 cards secundários (KM Rodados, Média Diesel, Combustível, Pedágios, Borracharia, Manutenção, Alimentação, Sobra Líquida).               |
| **Componente** | `app/components/dashboard/CostTrendSvgChart.vue`       | Gráfico SVG responsivo (`viewBox="0 0 900 200"`) calculando coordenadas `x/y` dinamicamente a partir de `trendSixMonths`.                         |
| **Componente** | `app/components/dashboard/RecentTripsTableCard.vue`    | Card com tabela das 5 últimas viagens e botão `Ver todas (N) →`.                                                                                  |
| **Componente** | `app/components/dashboard/RecentExpensesTableCard.vue` | Card com tabela das 5 últimas despesas e botão `Ver todas (N) →`.                                                                                 |
| **Componente** | `app/components/settings/AccountingExportCard.vue`     | Card de Exportação Contábil montado em `/settings` com botões de download CSV e abertura do relatório PDF.                                        |
| **Composable** | `app/composables/useDashboard.ts`                      | Busca `/api/reports/dashboard` reativo ao `selectedMonth` de `useCompetencePeriod()`.                                                             |

---

## 8. Seeds e Factories

O seed (`server/database/seed.ts`) popula dados históricos para `2026-04` a `2026-09` reproduzindo a série histórica do gráfico do mockup:

- `2026-04 (ABR)`: `R$ 5,30 / km`
- `2026-05 (MAI)`: `R$ 5,15 / km`
- `2026-06 (JUN)`: `R$ 5,42 / km` (acima do teto de `R$ 5,10`, marcador vermelho)
- `2026-07 (JUL)`: `R$ 5,10 / km`
- `2026-08 (AGO)`: `R$ 5,03 / km`
- `2026-09 (SET - ATUAL)`: `R$ 4,82 / km` (`14.280 km` rodados, média `2,42 km/L`, sobra líquida `R$ 24.380,00`)

---

## 9. Estratégia de Testes

1. **Unitários (`test/unit/report.service.spec.ts` e `test/unit/report.repository.spec.ts`):**
   - Cálculo de `costPerKmReais`, `deltaPercentVsPrevious`, `proportions` (garantindo soma de 100% quando há despesas e 0% quando mês está zerado sem `NaN`).
   - Cálculo de `netMargin` (`grossFreight - totalExpenses`) e `marginPercent`.
   - Geração da série de 6 meses incluindo virada de ano (ex.: `month = '2026-02'` gera `2025-09` a `2026-02`).
   - Geração do conteúdo CSV com UTF-8 BOM (`\uFEFF`), cabeçalhos em `pt-BR` e escape seguro contra CSV Injection (valores iniciados por `=`, `+`, `-`, `@`).
2. **Integração / Nuxt (`test/nuxt/dashboard.spec.ts`):**
   - Renderização do `HeroCostCard`, `SecondaryStatsGrid` e `CostTrendSvgChart` com dados reais e com estado vazio (`0 km`).
3. **E2E (`test/e2e/dashboard-and-export.spec.ts`):**
   - Carregamento do Painel Principal (`/`), navegação entre meses no seletor da Top Bar atualizando os números do Dashboard, e download do relatório CSV em `/settings`.

---

## 10. Gates Aplicáveis

- **G1–G5:** Formatação, lint, tipagem, limites de linhas/complexidade e zero duplicação.
- **G7 & G8 (`deps:check` & `test:arch`):** `server/api/reports/**` delega 100% da lógica ao `ReportService` e `ReportRepository`.
- **G9 (`test:coverage`):** Cobertura `>= 90%` em `server/services/report.service.ts`, `server/repositories/report.repository.ts` e `shared/schemas/report.schema.ts`.
- **G14 (`test:load:smoke`):** Rota crítica `/api/reports/dashboard` incluída no smoke test de carga (`p(95) < 500ms`).

---

## 11. Dependências e Pontos em Aberto

- **Dependências:** Depende de `04-configuracoes-e-perfil`, `05-viagens` e `06-despesas`.
- **Pontos em Aberto:** Nenhum.
