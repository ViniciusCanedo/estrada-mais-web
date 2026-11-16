## Why

Após a entrega da autenticação (`03-autenticacao`) e das configurações do motorista (`04-configuracoes-e-perfil`), a rota `/expenses` e o modal global `+ Lançar Despesa` ainda exibem placeholders, impedindo o motorista autônomo (TAC) de lançar, filtrar por categoria no mês de competência, editar e excluir despesas operacionais no Ledger (`expenses`). Esta mudança entrega o Diário Contábil de Despesas Operacionais completo (`06-despesas`), com validação condicional de litragem para combustível, cálculo automático de preço por litro (`R$/L`), classificação visual de comprovantes fiscais e atualização imediata dos contadores de competência e da Sidebar.

## What Changes

- Criar `shared/schemas/expense.schema.ts` com `expenseCategorySchema`, `paymentMethodSchema`, `expensePayloadSchema` (refinamento condicional exigindo `fuelLiters > 0` quando `category === 'combustivel'`), `expenseFilterQuerySchema`, `expenseIdParamsSchema`, `expenseDtoSchema`, `expenseListSummarySchema` e tipos inferidos em `pt-BR`, reutilizando `EXPENSE_CATEGORIES` e `PAYMENT_METHODS` de `#shared/types/domain`.
- Criar `server/repositories/expense.repository.ts` com `findManyByDriverAndMonth`, `countByCategoryInMonth`, `findByIdAndDriver`, `create`, `update` e `deleteByIdAndDriver` via Drizzle ORM sobre SQLite.
- Criar `server/services/expense.service.ts` para listagem com resumo e contadores independentes do filtro de categoria, conversões em inteiros escalados (`toCents`/`fromCents`, `toDeciliters`/`fromDeciliters`), limpeza de `fuelLitersDeciliters = null` quando `category !== 'combustivel'`, cálculo de `pricePerLiterReais`, classificação `receiptBadgeType` (`'fiscal'` vs `'simple'`) e indicador `isTripLinked`.
- Criar os endpoints autenticados `GET /api/expenses`, `POST /api/expenses` (`201 Created`), `PUT /api/expenses/[id]` e `DELETE /api/expenses/[id]` usando `withAuthenticatedDriver` e validação Zod compartilhada.
- Criar `app/composables/useExpenses.ts` sincronizado com `useCompetencePeriod()`, `useGlobalModals()` e `useTelemetrySync().refreshSync()`.
- Criar os componentes `app/components/expenses/ExpensesCategoryBar.vue`, `ExpensesDataTable.vue` e `ExpenseFormModal.vue`, atualizar `app/pages/expenses.vue` (preservando o heading `Despesas Operacionais`) e conectar exclusivamente o modal de despesas em `app/layouts/default.vue`.
- Adicionar testes unitários de repository, service e endpoints (`>= 90%` de cobertura), testes Nuxt de página/modal e testes E2E Playwright isolados (`test/e2e/expenses.spec.ts`).

## Capabilities

### New Capabilities

- `expenses-ledger`: Diário Contábil de Despesas Operacionais com categorias oficiais (`combustivel`, `pedagio`, `borracharia`, `manutencao`, `alimentacao`, `outros`), regra condicional de litragem e cálculo de `R$/L`, formas de pagamento padronizadas, classificação visual de comprovante (`NF-e`/`Extrato` vs `Recibo`/`Cupom`), convivência entre despesas avulsas e vinculadas a viagens (`tripId`) e barra de filtros com contadores dinâmicos por competência mensal.

### Modified Capabilities

<!-- Nenhuma capacidade existente em openspec/specs/ tem seus requisitos alterados nesta mudança -->

## Non-Goals

- Módulo de viagens (`05-viagens`), incluindo `app/pages/trips.vue`, endpoints `/api/trips/*` e o bloco placeholder do modal `Registrar Nova Viagem` em `app/layouts/default.vue`.
- Indicadores financeiros e gráficos completos do Dashboard e exportação contábil CSV/PDF (`07-painel-principal-e-relatorios`).
- Alteração no schema SQLite (`server/database/schema.ts`) ou geração de novas migrations, pois a tabela `expenses` e os dados seed já existem.

## Impact

- Contratos compartilhados: `shared/schemas/expense.schema.ts` (reutilizando `shared/types/domain.ts` e `shared/utils/units.ts`).
- Servidor (`server/`): `server/repositories/expense.repository.ts`, `server/services/expense.service.ts` e `server/api/expenses/{index.get,index.post,[id].put,[id].delete}.ts`.
- Front-end (`app/`): `app/composables/useExpenses.ts`, `app/components/expenses/{ExpensesCategoryBar,ExpensesDataTable,ExpenseFormModal}.vue`, `app/pages/expenses.vue`, `app/layouts/default.vue` (e atualização de `app/composables/useAuthSession.ts` se necessário invalidar cache ou manter cache por query reativa).
- Testes: `test/unit/expense.{repository,service,endpoints}.spec.ts`, `test/nuxt/{expense-modal,expenses-page,layout}.spec.ts` e `test/e2e/expenses.spec.ts`.
