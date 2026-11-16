## Context

As specs anteriores (`01-configuracao-projeto` a `04-configuracoes-e-perfil`) provisionaram o schema Drizzle (`trips` e `expenses` com `trip_id REFERENCES trips(id) ON DELETE CASCADE`), o utilitário puro `shared/utils/units.ts`, os formatadores `app/utils/formatters.ts`, os composables globais `useCompetencePeriod()`, `useGlobalModals()` e `useTelemetrySync()`, além da página placeholder `app/pages/trips.vue` e do modal placeholder em `app/layouts/default.vue`.

Restrições arquiteturais e operacionais aplicáveis:

- **Isolamento paralelo com `06-despesas`:** a spec `06-despesas` é desenvolvida simultaneamente em outra branch. O módulo `05-viagens` não pode criar nem alterar `expense.schema.ts`, `expense.repository.ts`, `expense.service.ts`, `server/api/expenses/*`, `app/pages/expenses.vue`, `app/components/expenses/*`, `useExpenses.ts`, `test/e2e/helpers/auth.ts` nem o bloco do modal de despesas em `app/layouts/default.vue`. A sincronização das despesas vinculadas à viagem ocorre diretamente dentro de `TripRepository` na tabela `expenses`.
- **Fronteiras de camada (`dependency-cruiser` + `test/arch/layers.spec.ts`):** `shared/` 100% puro; `server/api/trips/**` valida com `#shared/schemas/trip.schema` e chama apenas `TripService`; apenas `TripRepository` acessa Drizzle ORM (`better-sqlite3`); `app/components/trips/**` não executa I/O direto.
- **Limites de linter e cobertura:** SFCs `.vue` <= 250 linhas, funções <= 50 linhas, complexidade ciclomática <= 10, acessibilidade `vuejs-accessibility`, TypeScript estrito com `exactOptionalPropertyTypes: true` e cobertura >= 90% em `shared/**`, `server/services/**` e `server/repositories/**`.
- **Compatibilidade E2E:** `test/e2e/navigation.spec.ts` exige o heading `Viagens Registradas` em `/trips`, o título `'Registrar Nova Viagem'` e `data-testid="modal-log-trip"` no modal de criação, além de fechamento com `Escape`. O Playwright roda com `fullyParallel: true` sobre `./.data/sqlite/estrada.db`, exigindo motorista isolado em `test/e2e/trips.spec.ts`.

## Goals / Non-Goals

**Goals:**

- Centralizar cálculos de telemetria, média ponderada real e extração/validação de `"Cidade, UF"` em `shared/utils/telematics.ts` para reuso isomórfico entre modal e backend (DRY / G5).
- Definir contratos Zod 4 em `shared/schemas/trip.schema.ts` compatíveis com `exactOptionalPropertyTypes: true`, validação de UF brasileira (`BRAZILIAN_STATES`) e regra `kmEnd > kmStart`.
- Implementar `TripRepository` e `TripService` com filtragem combinada (`month`, `last90days`, `year`, busca textual e UF em origem ou destino), ordenação segura via whitelist e transações síncronas `db.transaction` sincronizando despesas vinculadas (`combustivel` e `pedagio`) sem duplicatas e com exclusão em cascata.
- Implementar os endpoints `GET/POST /api/trips` e `PUT/DELETE /api/trips/[id]` protegidos por `withAuthenticatedDriver`.
- Implementar `useTrips.ts`, `TripsFilterBar.vue`, `TripsDataTable.vue`, `TripFormModal.vue` (e subcomponente de preview/confirmação se necessário para manter `<= 250` linhas), atualizar `app/pages/trips.vue` e integrar o modal de viagem em `app/layouts/default.vue`.
- Cobrir 100% dos fluxos com testes unitários, de repositório SQLite `:memory:`, de integração Nuxt e E2E Playwright isolados.

**Non-Goals:**

- Implementar interface ou endpoints de despesas avulsas (`/expenses`), responsabilidade exclusiva da spec `06-despesas`.
- Alterar `server/database/schema.ts` ou criar migrations.
- Implementar gráficos e indicadores mensais consolidados do Painel Principal (`/`) (spec `07-painel-principal-e-relatorios`).

## Decisions

### 1. Sincronização transacional de despesas diretamente no `TripRepository`

- **Decisão:** Encapsular `createWithLinkedExpenses` e `updateWithLinkedExpenses` em `TripRepository` usando `db.transaction((tx) => ...)` síncrono do `better-sqlite3`, enquanto `TripService` monta os payloads das despesas vinculadas (`combustivel` se `fuelCostCents > 0` e `pedagio` se `tollCostCents > 0`). Na edição, o repositório compara as linhas existentes em `expenses` para aquele `tripId` e `driverId` por `category`: atualiza a linha existente quando a categoria permanece ativa, insere quando passa de `0` para `> 0` e remove quando passa para `0`.
- **Alternativas consideradas:** Delegar para `ExpenseRepository`/`ExpenseService` (inviável pela execução paralela com `06-despesas`, que criará esses arquivos em outra branch) ou apagar todas as despesas do `tripId` e reinserir em toda edição (geraria novos IDs desnecessariamente em despesas já sincronizadas).
- **Mitigação:** `TripService` mantém responsabilidade pura de regras de negócio e montagem de domínio, e `TripRepository` garante atomicidade e ausência de duplicatas com testes em SQLite `:memory:`.

### 2. Filtragem de período relativo ao mês de competência e busca normalizada em UTF-8

- **Decisão:** `TripService` resolve um intervalo `{ startDate, endDate }` determinístico para o `TripRepository`:
  - `period === 'month'` com `month` (`AAAA-MM`): `[AAAA-MM-01, AAAA-MM-ultimoDia]`; se `month` omitido via API direta, não restringe data (mesmo comportamento de `HealthRepository`).
  - `period === 'last90days'`: janela inclusiva de 90 dias encerrando no último dia do mês `month` (ex.: `2026-09` → `2026-07-03` a `2026-09-30`), ou na data de referência atual se `month` omitido.
  - `period === 'year'`: `[AAAA-01-01, AAAA-12-31]` do ano de `month` (ou do ano de referência).
    Para `search`, aplicar `driverId`, intervalo de datas, `state` (`originState = uf OR destinationState = uf`) e `ORDER BY` seguro via whitelist no SQLite, e aplicar normalização case/diacritic-insensitive (`NFD` + remoção de acentos + trim de `#` opcional em NF-e) na filtragem textual sobre `"Cidade, UF"` e `invoiceNumber`.
- **Alternativas consideradas:** Usar `LIKE '%termo%'` puro no SQLite (falha para caracteres acentuados em UTF-8 como `Rondonópolis`/`rondonópolis` ou `São Paulo` e exige coluna extra concatenada para `"Santos, SP"`).

### 3. Gestão de estado do modal global e compatibilidade com `navigation.spec.ts`

- **Decisão:** Manter `editingTrip` em `useState<TripDto | null>('estrada-editing-trip', () => null)` dentro de `useTrips.ts` (sem acoplar `useGlobalModals.ts` ao tipo `TripDto`), fornecendo `openCreateTripModal()` e `openEditTripModal(trip)`. Em `app/layouts/default.vue`, substituir apenas o bloco placeholder do modal de viagem pelo `TripFormModal.vue` conectado a `useGlobalModals()` e `useTrips()`. Ao fechar `isTripModalOpen` (incluindo via `Escape`), `editingTrip` é limpo para `null`, garantindo que o modal abra em modo criação com título `'Registrar Nova Viagem'` e `data-testid="modal-log-trip"`.
- **Alternativas consideradas:** Abrir um modal separado dentro de `pages/trips.vue` (duplicaria o formulário em relação ao modal global da `AppTopBar` e quebraria a experiência unificada).

### 4. Subcomponentes focados para respeitar `max-lines <= 250` e zero I/O em componentes

- **Decisão:** Dividir a UI de viagens em `TripsFilterBar.vue`, `TripsDataTable.vue`, `TripFormModal.vue` e, caso necessário para manter cada SFC bem abaixo de 250 linhas e cada função <= 50 linhas, extrair `TripTelematicsPreview.vue` (box de cálculo em tempo real) e `TripDeleteModal.vue` (confirmação de exclusão). Toda comunicação HTTP e atualização de `useTelemetrySync().refreshSync()` fica exclusivamente em `useTrips.ts` e `app/pages/trips.vue`.

## Risks / Trade-offs

- **Risco:** `test/nuxt/layout.spec.ts` monta `TripsPage` sem endpoint `/api/trips` registrado e usa `tripsWrapper.find('button')` para testar abertura do modal. → **Mitigação:** Registrar mock `/api/trips` em `test/nuxt/layout.spec.ts` e direcionar o clique para `[data-testid="new-trip-btn"]`, mantendo o assert de `Viagens Registradas` e abertura do modal.
- **Risco:** Inputs numéricos opcionais (`cargoWeightTons`) limpos pelo usuário no navegador (`''`) falharem na validação `z.number().optional()`. → **Mitigação:** Normalizar string vazia / `NaN` para `undefined` no binding do formulário antes da validação Zod e cobrir com testes unitários e Nuxt.
- **Risco:** Testes E2E paralelos no Playwright alterarem a contagem da Sidebar do motorista padrão `Valdir Silveira`. → **Mitigação:** Provisionar motorista isolado com `createTestDriver` + `createTestTrip` em `test/e2e/trips.spec.ts`, preservando intactos os dados de `Valdir Silveira`.
