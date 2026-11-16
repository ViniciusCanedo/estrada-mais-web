## 1. Schemas Zod Compartilhados

- [ ] 1.1 Criar `shared/schemas/expense.schema.ts` com `expenseCategorySchema`, `paymentMethodSchema`, `expensePayloadSchema` (refinamento condicional exigindo `fuelLiters > 0` para `combustivel`), `expenseFilterQuerySchema`, `expenseIdParamsSchema`, `expenseDtoSchema`, `expenseCategoryCountsSchema`, `expenseListSummarySchema` e tipos inferidos

## 2. Repository, Service e Endpoints HTTP

- [ ] 2.1 Implementar `server/repositories/expense.repository.ts` com `findManyByDriverAndMonth`, `countByCategoryInMonth`, `findByIdAndDriver`, `create`, `update` e `deleteByIdAndDriver` via Drizzle ORM
- [ ] 2.2 Implementar `server/services/expense.service.ts` com `listExpenses`, `createExpense`, `updateExpense` e `deleteExpense`, conversões via `shared/utils/units.ts`, limpeza condicional de `fuelLitersDeciliters`, cálculo de `pricePerLiterReais`, classificação `receiptBadgeType` (`'fiscal'` vs `'simple'`) e indicador `isTripLinked`
- [ ] 2.3 Implementar os handlers `server/api/expenses/index.get.ts`, `index.post.ts`, `[id].put.ts` e `[id].delete.ts` com `withAuthenticatedDriver` e validação Zod de `#shared/schemas/expense.schema`

## 3. Front-end: Composable, Componentes, Página e Modal Global

- [ ] 3.1 Implementar `app/composables/useExpenses.ts` sincronizado com `useCompetencePeriod()`, `useGlobalModals()` e `useTelemetrySync().refreshSync()`, e invalidar `'expenses-ledger'` em `app/composables/useAuthSession.ts`
- [ ] 3.2 Criar `app/components/expenses/ExpensesCategoryBar.vue`, `ExpensesDataTable.vue` e `ExpenseFormModal.vue` seguindo Night Highway, acessibilidade e limite `<= 250` linhas sem I/O direto
- [ ] 3.3 Atualizar `app/pages/expenses.vue` preservando o heading `Despesas Operacionais` (com estados de loading, erro e vazio) e integrar apenas o modal de despesa em `app/layouts/default.vue` mantendo `Lançar Nova Despesa` e `data-testid="modal-log-expense"`

## 4. Testes Automatizados e Quality Gate

- [ ] 4.1 Criar `test/unit/expense.repository.spec.ts`, `test/unit/expense.service.spec.ts` e `test/unit/expense.endpoints.spec.ts` cobrindo validação condicional, limpeza de litros, `pricePerLiterReais`, contadores do mês, endpoints `GET/POST/PUT/DELETE` (`401`/`400`/`404`/`200`/`201`) e cobertura `>= 90%`
- [ ] 4.2 Criar `test/nuxt/expense-modal.spec.ts` e `test/nuxt/expenses-page.spec.ts`, e atualizar `test/nuxt/layout.spec.ts` cobrindo o comportamento reativo do modal, barra de categorias, tabela e estados
- [ ] 4.3 Criar `test/e2e/expenses.spec.ts` com motorista isolado (`createTestDriver`) validando lançamento via `+ Lançar Despesa`, filtro por categoria, `PREÇO/L`, edição e exclusão
- [ ] 4.4 Executar `npm run format` e `npm run quality` comprovando exit code `0` em todos os gates G1–G13
