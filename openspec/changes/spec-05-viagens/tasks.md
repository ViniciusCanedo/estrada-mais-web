## 1. Utilitários Puros e Schemas Zod

- [x] 1.1 Criar `shared/utils/telematics.ts` com `parseCityAndState`, `tryParseCityAndState`, `isValidBrazilianState`, `calculateTripTelematics` e `calculateTripListSummary` (média ponderada real, sem divisão por zero ou `NaN`)
- [x] 1.2 Criar `shared/schemas/trip.schema.ts` com `tripPayloadSchema`, `tripFilterQuerySchema`, `tripIdParamsSchema`, `tripDtoSchema`, `tripListSummarySchema` e tipos inferidos em `pt-BR` compatíveis com `exactOptionalPropertyTypes`

## 2. Repository e Service Transacional

- [x] 2.1 Implementar `server/repositories/trip.repository.ts` (`findManyByFilter`, `findByIdAndDriver`, `listDistinctStates`, `createWithLinkedExpenses`, `updateWithLinkedExpenses`, `deleteByIdAndDriver`) usando transações Drizzle síncronas sem duplicatas em `expenses`
- [x] 2.2 Implementar `server/services/trip.service.ts` (`listTrips`, `createTrip`, `updateTrip`, `deleteTrip`) com resolução de período (`month`, `last90days`, `year`), conversões via `shared/utils/units.ts`, despesas vinculadas e `DomainError('NOT_FOUND', ...)`

## 3. Endpoints HTTP (`/api/trips`)

- [x] 3.1 Implementar `server/api/trips/index.get.ts`, `index.post.ts` (`201`), `[id].put.ts` e `[id].delete.ts` com `withAuthenticatedDriver` e validação via `#shared/schemas/trip.schema`

## 4. Front-end: Composable, Componentes, Página e Layout

- [x] 4.1 Implementar `app/composables/useTrips.ts` com filtros reativos sincronizados a `useCompetencePeriod()`, `useApiFetch` (chave estável), estado `editingTrip` integrado a `useGlobalModals()`, e mutações chamando `refreshSync()` de `useTelemetrySync()`
- [x] 4.2 Criar `app/components/trips/TripsFilterBar.vue`, `TripsDataTable.vue` (ordenação clicável e rodapé `TOTAIS (N VIAGENS EXIBIDAS)`) e `TripFormModal.vue` (cálculo em tempo real com `Inválido (End ≤ Start)` e `data-testid="modal-log-trip"`, respeitando `<= 250` linhas por SFC)
- [x] 4.3 Atualizar `app/pages/trips.vue` (mantendo o heading `Viagens Registradas`, estados de loading/erro/vazio e confirmação de exclusão) e conectar `TripFormModal` apenas no bloco do modal de viagem em `app/layouts/default.vue`

## 5. Testes Automatizados e Quality Gate

- [x] 5.1 Criar `test/unit/telematics.spec.ts`, `test/unit/trip.repository.spec.ts`, `test/unit/trip.service.spec.ts` e `test/unit/trip.endpoints.spec.ts` com SQLite `:memory:` e cobertura `>= 90%`
- [x] 5.2 Criar `test/nuxt/trip-modal.spec.ts` e `test/nuxt/trips-page.spec.ts` (e ajustar mock em `test/nuxt/layout.spec.ts`), cobrindo cálculo ao vivo, validação, filtros, ordenação e estados da página
- [x] 5.3 Criar `test/e2e/trips.spec.ts` com motorista isolado (`createTestDriver`) validando criação, cálculo ao vivo, badge na Sidebar, filtros/ordenação, edição e exclusão com cascata nas despesas no SQLite
- [ ] 5.4 Executar `npm run format` e `npm run quality` comprovando exit code `0` em todos os gates G1–G13
