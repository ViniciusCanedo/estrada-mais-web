## Context

As specs anteriores entregaram a fundação SQLite/Drizzle (`01-configuracao-projeto` — incluindo a tabela `expenses` e seed determinístico em `server/database/seed-data.ts` / `seed.ts`), o shell Night Highway (`02-design-system-e-layout` — incluindo `useCompetencePeriod`, `useGlobalModals`, `useTelemetrySync`, `AppUnitInput`, `app/utils/formatters.ts` e o placeholder do modal em `app/layouts/default.vue`), a autenticação selada (`03-autenticacao` — `withAuthenticatedDriver`, `useAuthSession`) e o módulo de configurações (`04-configuracoes-e-perfil`). Entretanto, `app/pages/expenses.vue` e o modal global de despesas ainda exibem placeholders, e não há endpoints, service, repository ou schemas Zod para o Ledger de Despesas (`06-despesas`).

Restrições arquiteturais e operacionais aplicáveis:

- **Isolamento paralelo com `05-viagens`:** A spec `05-viagens` está sendo implementada em outra branch/worktree; esta mudança não deve criar nem editar arquivos de viagens (`trip.*`, `shared/utils/telematics.ts`, `app/pages/trips.vue`, `test/e2e/helpers/auth.ts`) nem alterar o bloco placeholder do modal de Viagem em `app/layouts/default.vue`.
- **Fronteiras de dependência (`dependency-cruiser` + `test/arch`):** `server/api/expenses/**` só chama `ExpenseService` (com validação via `#shared/schemas/expense.schema`); `ExpenseService` só chama `ExpenseRepository` (nunca Drizzle/SQLite diretamente); `app/components/expenses/**` não realiza I/O (`$fetch`, `useFetch`, `useAsyncData`, `useApiFetch`).
- **Qualidade e limites ESLint/Vitest:** Componentes `.vue <= 250` linhas, funções `<= 50` linhas, complexidade `<= 10`, acessibilidade (`vuejs-accessibility`), Tailwind v4 validado (`better-tailwindcss`) e cobertura `>= 90%` em `shared/**`, `server/services/**` e `server/repositories/**`.
- **Compatibilidade com suítes existentes:** `test/e2e/navigation.spec.ts` exige o heading visível `Despesas Operacionais` em `/expenses`, dialog com título `'Lançar Nova Despesa'`, `data-testid="modal-log-expense"` e fechamento via `Escape`.

## Goals / Non-Goals

**Goals:**

- Implementar contratos Zod isomórficos em `shared/schemas/expense.schema.ts` para payload, filtro, parâmetro de rota, DTO e resumo de listagem, reutilizando `EXPENSE_CATEGORIES` e `PAYMENT_METHODS` de `#shared/types/domain`.
- Implementar `ExpenseRepository` (`server/repositories/expense.repository.ts`) e `ExpenseService` (`server/services/expense.service.ts`) com precisão inteira via `shared/utils/units.ts`, limpeza condicional de litros, cálculo de `pricePerLiterReais`, classificação `receiptBadgeType` e contadores independentes do filtro de categoria.
- Implementar os endpoints REST autenticados `GET /api/expenses`, `POST /api/expenses`, `PUT /api/expenses/[id]` e `DELETE /api/expenses/[id]`.
- Implementar `useExpenses.ts`, os 3 componentes em `app/components/expenses/`, a página `app/pages/expenses.vue` e a integração do modal global de despesa em `app/layouts/default.vue`.
- Garantir cobertura completa em `test/unit/`, `test/nuxt/` e `test/e2e/expenses.spec.ts` isolado para execução paralela no Playwright.

**Non-Goals:**

- Alterar o schema Drizzle ou gerar migrations em `server/database/`.
- Implementar funcionalidades de viagens (`05-viagens`) ou agregações/exportação do Dashboard (`07-painel-principal-e-relatorios`).
- Alterar o bloco placeholder do modal de Viagens em `app/layouts/default.vue`.

## Decisions

### 1. Contrato Zod isomórfico em `shared/schemas/expense.schema.ts`

- **Decisão:** Declarar `expenseCategorySchema`, `paymentMethodSchema`, `expensePayloadSchema` (com `.refine(...)` exigindo `typeof data.fuelLiters === 'number' && data.fuelLiters > 0` quando `data.category === 'combustivel'`), `expenseFilterQuerySchema`, `expenseIdParamsSchema`, `expenseDtoSchema`, `expenseCategoryCountsSchema` e `expenseListSummarySchema` exclusivamente em `shared/schemas/expense.schema.ts`, derivando todos os tipos via `z.infer`. No modal `ExpenseFormModal.vue`, adapters computados convertem `''` / `NaN` para `null` (litros) ou `undefined` (valor) no estado do formulário antes da validação do `UForm`.
- **Motivação:** Mantém o schema da API estrito para números reais sem aceitar strings vazias no backend, ao mesmo tempo que preserva validação instantânea em `pt-BR` no `UForm` quando o usuário limpa um campo numérico.
- **Alternativas consideradas:** Usar `z.coerce.number()` no payload (converteria `''` para `0` silenciosamente em vez de disparar a mensagem de campo obrigatório).

### 2. Queries parametrizadas e contagem independente no `ExpenseRepository` + regras puras no `ExpenseService`

- **Decisão:** Em `ExpenseRepository`, implementar `findManyByDriverAndMonth(driverId, month?, category?)` ordenado por `desc(expenses.expenseDate), desc(expenses.id)` usando filtro opcional de mês (`like(expenses.expenseDate, '${month}-%')`) alinhado ao `HealthRepository`, e `countByCategoryInMonth(driverId, month?)` com `SELECT category, COUNT(*)` agrupado por categoria, preenchendo todas as 6 categorias + `todas` com zero quando ausentes. No `ExpenseService`, somar `amountCents` em inteiros antes de aplicar `fromCents` para `totalAmountReais`, forçar `fuelLitersDeciliters = null` quando `category !== 'combustivel'`, calcular `pricePerLiterReais = category === 'combustivel' && fuelLiters ? amountReais / fuelLiters : null` e classificar `receiptBadgeType` via `/^(NF-e|Extrato)/i`.
- **Motivação:** Uma consulta `GROUP BY category` calcula todos os contadores do mês de competência independentemente do filtro de categoria ativo (RN-EXP-06) em uma única ida ao SQLite, enquanto a soma em centavos evita desvios binários de ponto flutuante.
- **Alternativas consideradas:** Executar 7 queries separadas por categoria (desnecessário) ou calcular contadores no cliente (falharia ao filtrar por uma única categoria no servidor).

### 3. Estado compartilhado de `useExpenses` sem disparo de `GET /api/expenses` fora da rota `/expenses`

- **Decisão:** Estruturar `useExpenses(options?: { autoFetch?: boolean })` com estado reativo compartilhado via `useState` para `activeCategory` (`'todas'` por padrão), `editingExpense` (`ExpenseDto | null`), `mutating` e `mutationError`. A página `app/pages/expenses.vue` invoca `useExpenses()` (padrão `autoFetch: true`), registrando `useApiFetch('/expenses', { key: 'expenses-ledger', query: computed(() => ({ month: selectedMonth.value, category: activeCategory.value })) })`. O layout `app/layouts/default.vue` invoca `useExpenses({ autoFetch: false })` para submeter o `ExpenseFormModal`, chamando `refreshNuxtData('expenses-ledger')` e `useTelemetrySync().refreshSync()` após criar/editar, além de observar `isExpenseModalOpen` para limpar `editingExpense` ao fechar o modal.
- **Motivação:** Permite abrir e submeter `+ Lançar Despesa` a partir de qualquer rota (via `AppTopBar`) atualizando imediatamente o badge da Sidebar e o cache do Ledger sem disparar `GET /api/expenses` indesejado em rotas como `/`, `/settings` ou nos testes Nuxt de layout/index. Limpar `editingExpense` no fechamento impede que abrir `+ Lançar Despesa` após cancelar uma edição reabra em modo edição. Também invalida `'expenses-ledger'` em `useAuthSession.ts` no login/logout.
- **Alternativas consideradas:** Chamar `useApiFetch('/expenses')` diretamente dentro de `default.vue` (geraria requisições extras em todas as páginas e quebraria isolamento das suítes Nuxt existentes).

### 4. Componentização Night Highway e acessibilidade

- **Decisão:** Dividir a UI em três componentes puros abaixo de 250 linhas:
  - `ExpensesCategoryBar.vue`: pílulas de categoria (`TODAS (N)` .. `Outras (N)`) com contadores do mês e CTA `+ Nova Despesa` (`expense-blue`, `data-testid="expenses-new-btn"`).
  - `ExpensesDataTable.vue`: tabela responsiva fiel ao mockup `#full-expenses-table` reutilizando `formatDateBr`, `formatCurrencyFromCents` e `formatLitersFromDeciliters`, badges coloridos por categoria, indicador discreto para `isTripLinked`, badge de comprovante (`fiscal` verde vs `simple` neutro) e ações `Editar` / `Excluir` (com confirmação simples ou direta via botão acessível e `aria-label` claro — optando por ação explícita com `aria-label` e estado de loading por item, mantendo fluxo direto e previsível para teclado e E2E).
  - `ExpenseFormModal.vue`: `UModal` com `UForm :schema="expensePayloadSchema"`, select de categoria, data (`type="date"`), descrição, `AppUnitInput` de litros (desabilitado e zerado automaticamente quando `category !== 'combustivel'`), `AppUnitInput` de valor total, select de forma de pagamento e input de comprovante, preservando título `'Lançar Nova Despesa'` na criação, `data-testid="modal-log-expense"` e fechamento por `Escape`.
- **Alternativas consideradas:** Usar modal de confirmação secundário aninhado para exclusão (aumentaria acoplamento de modais no layout sem exigência da spec; em vez disso, usar `aria-label` descritivo e feedback toast imediato ao excluir).

### 5. Isolamento E2E paralelo no Playwright

- **Decisão:** Em `test/e2e/expenses.spec.ts`, criar um motorista dedicado via `createTestDriver` (reutilizando `openE2eDatabase` e `loginWithCredentials` de `test/e2e/helpers/auth.ts` sem editar esse helper) e autenticar com ele antes de lançar, filtrar, editar e excluir despesas.
- **Motivação:** Evita colisão de contadores e registros com `navigation.spec.ts`, `auth.spec.ts` e `home.spec.ts` executados em paralelo (`fullyParallel: true`), além de não tocar `test/e2e/helpers/auth.ts` (reservado para isolamento com `05-viagens`).

## Risks / Trade-offs

- **Risco:** `test/nuxt/layout.spec.ts` monta `ExpensesPage` e aciona `expensesWrapper.find('button')` esperando abertura do modal de despesa sem mock de `/api/expenses`. → **Mitigação:** Registrar `/api/expenses` em `test/nuxt/layout.spec.ts` e direcionar o clique para `[data-testid="expenses-new-btn"]` (mantendo o teste de navegação e abertura do modal).
- **Risco:** Alterar a data da despesa no modal para outro mês enquanto o filtro da Top Bar está em `2026-09` faria o registro não aparecer em `2026-09`. → **Mitigação:** Inicializar o campo `expenseDate` no modal de criação dentro do mês de competência ativo (ou `2026-09-16` quando `selectedMonth === '2026-09'`, e `${selectedMonth}-01` nos demais meses) para coerência imediata com a listagem filtrada.
- **Risco:** Cobertura `>= 90%` em branches nos novos módulos de schema, service e repository. → **Mitigação:** Cobrir explicitamente todas as categorias, valores nulos/vazios, filtros com e sem `month`/`category`, erros `400`/`401`/`404` e singleton `getDatabase()` sem injeção em `test/unit/expense.*.spec.ts`.
