## Why

Após a entrega das configurações e do shell Night Highway (`02-design-system-e-layout` a `04-configuracoes-e-perfil`), a rota `/trips` e o modal global `+ Registrar Viagem` ainda exibem apenas placeholders estáticos. Sem este módulo, o motorista autônomo (TAC) não consegue registrar, consultar, filtrar, ordenar, editar ou excluir viagens rodoviárias com cálculo de telemetria (`km/L`, `R$/km`) nem sincronizar automaticamente os custos de combustível e pedágio no Diário de Despesas (`expenses`).

## What Changes

- Criar `shared/utils/telematics.ts` com funções puras e isomórficas para extração/validação de `Cidade, UF` (`parseCityAndState`), cálculo de telemetria de viagem (`calculateTripTelematics`) e totalizadores com média ponderada real (`calculateTripListSummary`).
- Criar `shared/schemas/trip.schema.ts` com `tripPayloadSchema` (incluindo `kmEnd > kmStart` e validação de UF contra `BRAZILIAN_STATES`), `tripFilterQuerySchema`, `tripIdParamsSchema`, `tripDtoSchema`, `tripListSummarySchema` e tipos inferidos em `pt-BR`.
- Criar `server/repositories/trip.repository.ts` e `server/services/trip.service.ts` implementando listagem filtrada/ordenada, criação e edição transacional atômica (`db.transaction`) sincronizando despesas vinculadas (`combustivel` e `pedagio` via `trip_id`) sem duplicatas, e exclusão com cascata (`ON DELETE CASCADE`).
- Criar os endpoints HTTP autenticados `GET /api/trips`, `POST /api/trips` (`201 Created`), `PUT /api/trips/[id]` e `DELETE /api/trips/[id]` validados via `#shared/schemas/trip.schema` e padronizados com `withAuthenticatedDriver`.
- Implementar `app/composables/useTrips.ts` (integrado a `useCompetencePeriod()`, `useGlobalModals()` e `useTelemetrySync()`), os componentes `TripsFilterBar.vue`, `TripsDataTable.vue` e `TripFormModal.vue`, atualizar `app/pages/trips.vue` e conectar o modal real em `app/layouts/default.vue`.
- Adicionar testes unitários, de repositório em SQLite `:memory:`, de integração Nuxt e E2E Playwright com isolamento por motorista de teste.

## Capabilities

### New Capabilities

- `trips-management`: Gestão completa de viagens rodoviárias (`GET/POST/PUT/DELETE /api/trips`), cálculo de telemetria em tempo real (`distanceKm`, `kmPerLiter`, `costPerKmReais`), filtragem combinada (texto, período `month`/`last90days`/`year` e UF em origem ou destino), ordenação por coluna, totalizadores ponderados em rodapé e sincronização transacional atômica das despesas vinculadas de Diesel e Pedágio na tabela `expenses`.

### Modified Capabilities

<!-- Nenhuma capacidade existente em openspec/specs/ tem seus requisitos alterados nesta mudança -->

## Non-Goals

- Interface de listagem e gestão avulsa do Diário de Despesas (`/expenses`, modal `+ Lançar Despesa`, `expense.service.ts`, `expense.repository.ts`), implementada em paralelo na spec `06-despesas`.
- KPIs, gráficos e relatórios consolidados do Painel Principal (`/`) e exportação contábil (escopo da spec `07-painel-principal-e-relatorios`).
- Alteração estrutural no schema SQLite (`server/database/schema.ts`), pois `trips` e `expenses` (incluindo `trip_id` com `ON DELETE CASCADE`) já estão provisionadas e migradas.

## Impact

- Camada compartilhada (`shared/`): `shared/utils/telematics.ts` e `shared/schemas/trip.schema.ts` (reutilizando `shared/types/domain.ts` e `shared/utils/units.ts`).
- Servidor (`server/`): `server/repositories/trip.repository.ts`, `server/services/trip.service.ts` e `server/api/trips/{index.get,index.post,[id].put,[id].delete}.ts`.
- Front-end (`app/`): `app/composables/useTrips.ts`, `app/components/trips/{TripsFilterBar,TripsDataTable,TripFormModal}.vue`, `app/pages/trips.vue` e bloco do modal de viagem em `app/layouts/default.vue`.
- Testes (`test/`): `test/unit/{telematics,trip.repository,trip.service,trip.endpoints}.spec.ts`, `test/nuxt/{trip-modal,trips-page}.spec.ts`, atualização compatível de `test/nuxt/layout.spec.ts` se necessário, e `test/e2e/trips.spec.ts`.
