# trips-management Specification

## Purpose

Definir os requisitos normativos de gestão completa de viagens rodoviárias e telemetria no Estrada+, cobrindo validação isomórfica de odômetro e rotas (`Cidade, UF`), cálculos determinísticos de consumo (`km/L`) e custo por quilômetro (`R$/km`), filtragem combinada e ordenação segura, totalizadores de rodapé com média ponderada real e sincronização transacional atômica das despesas vinculadas de Diesel e Pedágio no SQLite.

## Requirements

### Requirement: Validação isomórfica de odômetro e campos de viagem (RN-TRIP-01)

O sistema SHALL validar toda criação (`POST /api/trips`), atualização (`PUT /api/trips/[id]`) e submissão de formulário de viagem no front-end (`TripFormModal.vue`) utilizando o schema compartilhado `tripPayloadSchema` (`shared/schemas/trip.schema.ts`) com mensagens em `pt-BR`. O campo `kmEnd` MUST ser estritamente maior que `kmStart` (`kmEnd > kmStart`), `fuelLiters` MUST ser estritamente positivo (`toDeciliters(fuelLiters) > 0`), e os campos `origin` e `destination` MUST obedecer ao formato `"Cidade, UF"` com UF brasileira válida (`BRAZILIAN_STATES`). Quando `kmEnd <= kmStart`, o visor de telemetria em tempo real MUST exibir `Inválido (End ≤ Start)` em vermelho (`text-highway-red`), bloquear o envio do formulário e a API MUST rejeitar a requisição com HTTP `400 Bad Request`.

#### Scenario: Bloqueio de viagem com KM final menor ou igual ao KM inicial

- **WHEN** o motorista informa `kmEnd <= kmStart` no modal de viagem ou envia `kmEnd <= kmStart` para `POST /api/trips` ou `PUT /api/trips/[id]`
- **THEN** o visor em tempo real exibe `Inválido (End ≤ Start)` em `text-highway-red`, a submissão no formulário é bloqueada com mensagem em `pt-BR` e a API retorna HTTP `400 Bad Request` sem gravar no banco de dados

#### Scenario: Rejeição de parâmetros inválidos de rota ou identificador

- **WHEN** `origin` ou `destination` não correspondem a `"Cidade, UF"` com UF brasileira oficial (`BRAZILIAN_STATES`), ou `id` na rota `/api/trips/[id]` não é inteiro positivo
- **THEN** `tripPayloadSchema` ou `tripIdParamsSchema` rejeita a entrada com mensagem em `pt-BR` e HTTP `400 Bad Request`

### Requirement: Cálculo determinístico de telemetria em tempo real e no servidor (RN-TRIP-02)

O sistema SHALL centralizar as fórmulas de telemetria em funções puras e isomórficas em `shared/utils/telematics.ts` (`calculateTripTelematics`), reutilizadas tanto pelo visor em tempo real do `TripFormModal.vue` quanto pelo `TripService`. Para cada viagem, `distanceKm = kmEnd - kmStart`, `kmPerLiter = distanceKm / fuelLiters` (exibido com 2 casas decimais) e `costPerKmReais = (fuelCostReais + tollCostReais) / distanceKm`, sem jamais produzir `NaN`, `Infinity` ou divisão por zero quando entradas estiverem incompletas ou inválidas. As conversões de persistência no SQLite MUST utilizar exclusivamente `shared/utils/units.ts` (`toCents`/`fromCents`, `toDeciliters`/`fromDeciliters`, `toKg`/`fromKg`).

#### Scenario: Cálculo exato de distância, eficiência e custo por quilômetro

- **WHEN** são informados `kmStart = 784320`, `kmEnd = 786060`, `fuelLiters = 722`, `fuelCostReais = 3465` e `tollCostReais = 412`
- **THEN** `calculateTripTelematics` retorna `isValidDistance = true`, `distanceKm = 1740`, `kmPerLiter ≈ 2.41` e `costPerKmReais ≈ 2.228` (exibido como `2,41 km/L` e `R$ 2,23`)

#### Scenario: Proteção contra divisão por zero ou valores inválidos no cálculo em tempo real

- **WHEN** `kmEnd <= kmStart` ou `fuelLiters <= 0` durante a digitação no modal
- **THEN** `calculateTripTelematics` retorna `kmPerLiter = 0` e `costPerKmReais = 0` (com `isValidDistance = false` quando `kmEnd <= kmStart`), sem `NaN` ou `Infinity`

### Requirement: Extração de Cidade/UF e filtragem combinada com ordenação segura (RN-TRIP-03)

O sistema SHALL extrair e validar `city` e `state` em `parseCityAndState` (`shared/utils/telematics.ts`) normalizando a UF para 2 letras maiúsculas pertencentes a `BRAZILIAN_STATES`. O endpoint `GET /api/trips` (validado por `tripFilterQuerySchema`) SHALL pertencer exclusivamente ao `driverId` autenticado (`401 Unauthorized` se não autenticado) e suportar filtragem combinada por: `period` (`month`, `last90days` relativo ao fim do mês de referência `month`, ou `year`), busca textual `search` (correspondência case/diacritic-insensitive em origem, destino ou NF-e) e `state` (`TODOS` ou UF correspondente à `originState` **ou** `destinationState`), além de ordenação segura (`sortBy`: `tripDate`, `route`, `distanceKm`, `kmPerLiter`, `costPerKm`; `sortDir`: `asc`, `desc`). A resposta MUST retornar `{ data: TripDto[], meta: { totalCount, availableStates, summary } }`.

#### Scenario: Filtragem por UF em origem ou destino e busca textual normalizada

- **WHEN** o motorista seleciona a UF `MT` ou busca por `rondonopolis` ou `#10824`
- **THEN** `GET /api/trips` retorna apenas viagens do motorista cuja `originState === 'MT'` ou `destinationState === 'MT'` (ou cujo texto de origem, destino ou NF-e corresponda à busca) preservando `meta.availableStates` com todas as UFs distintas do motorista

#### Scenario: Alternância entre períodos month, last90days e year

- **WHEN** o motorista alterna o seletor de período entre `Mês Selecionado` (`month`), `Últimos 90 dias` (`last90days`) e `Ano Completo` (`year`) com competência `2026-09`
- **THEN** `GET /api/trips` filtra respectivamente `2026-09-01..2026-09-30`, os últimos 90 dias encerrando em `2026-09-30` (`2026-07-03..2026-09-30`) e `2026-01-01..2026-12-31`

#### Scenario: Isolamento multi-motorista em leitura, edição e exclusão

- **WHEN** um motorista autenticado tenta editar (`PUT /api/trips/[id]`) ou excluir (`DELETE /api/trips/[id]`) uma viagem inexistente ou pertencente a outro motorista
- **THEN** `TripService` lança `DomainError('NOT_FOUND', ...)` mapeado para HTTP `404 Not Found` sem modificar dados alheios

### Requirement: Sincronização transacional atômica entre Viagens e Despesas (RN-TRIP-04)

O sistema SHALL garantir que a tabela `expenses` permaneça sincronizada atomicamente com os custos de Diesel (`fuelCostCents`) e Pedágio (`tollCostCents`) de cada viagem dentro da mesma transação Drizzle (`db.transaction`) no `TripRepository`:

- Ao criar uma viagem (`POST /api/trips` → `201 Created`), cria em `expenses` com `tripId = trip.id` e `expenseDate = trip.tripDate`: uma despesa categoria `combustivel` se `fuelCostCents > 0` (`fuelLitersDeciliters`, `description = "Abastecimento Percurso: ${origin} → ${destination}"`, `receiptReference = invoiceNumber ? "NF-e " + invoiceNumber : "Viagem"`, `paymentMethod = "cartao_frota"`) e uma despesa categoria `pedagio` se `tollCostCents > 0` (`description = "Pedágios Percurso: ${origin} → ${destination}"`, `receiptReference = "Via TAG / Percurso"`, `paymentMethod = "cartao_frota"`).
- Ao editar uma viagem (`PUT /api/trips/[id]` → `200 OK`), sincroniza as despesas vinculadas daquele `tripId` atualizando existentes, inserindo novas quando um custo passa de `0` para `> 0` e removendo quando um custo passa para `0`, sem criar duplicatas.
- Ao excluir uma viagem (`DELETE /api/trips/[id]` → `200 OK` `{ success: true }`), a constraint `ON DELETE CASCADE` em `expenses.trip_id` remove automaticamente todas as despesas vinculadas.

#### Scenario: Criação atômica de viagem e despesas vinculadas de diesel e pedágio

- **WHEN** o motorista cria uma viagem com `fuelCostReais > 0` e `tollCostReais > 0`
- **THEN** `POST /api/trips` retorna `201 Created` e a transação persiste 1 registro em `trips` e 2 registros em `expenses` vinculados via `trip_id` (um `combustivel` e um `pedagio`)

#### Scenario: Edição atualiza e remove despesas vinculadas sem duplicatas

- **WHEN** o motorista edita uma viagem alterando rota/valor de diesel e zerando o pedágio (`tollCostReais = 0`)
- **THEN** `PUT /api/trips/[id]` atualiza a viagem e a despesa `combustivel` existente (sem duplicar linhas) e remove a despesa `pedagio` vinculada àquele `trip_id`

#### Scenario: Exclusão de viagem remove despesas vinculadas em cascata e atualiza contadores da Sidebar

- **WHEN** o motorista exclui uma viagem via `DELETE /api/trips/[id]`
- **THEN** o registro da viagem e suas despesas vinculadas são removidos do SQLite e o front-end (`useTrips`) recarrega a lista e chama `refreshSync()` de `useTelemetrySync()` atualizando os badges da Sidebar

### Requirement: Totalizadores de rodapé com média ponderada real (RN-TRIP-05)

O sistema SHALL calcular em `calculateTripListSummary` (`shared/utils/telematics.ts`) os totais consolidados das viagens filtradas retornando `totalDistanceKm`, `weightedAverageKmL = sum(distanceKm) / sum(fuelLiters)`, `totalFuelCostReais`, `totalTollCostReais`, `totalFreightValueReais` e `weightedCostPerKmReais = sum(fuelCostReais + tollCostReais) / sum(distanceKm)`. A tabela `TripsDataTable.vue` MUST exibir o rodapé `TOTAIS (N VIAGENS EXIBIDAS)` usando exatamente a média ponderada real (nunca média aritmética simples).

#### Scenario: Cálculo exato da média ponderada no rodapé para o conjunto filtrado

- **WHEN** são exibidas as 5 viagens de Setembro/2026 somando `3.755 km`, `1.552,7 L` de diesel, `R$ 7.453,00` de diesel e `R$ 982,00` de pedágio
- **THEN** `calculateTripListSummary` e o rodapé exibem `3.755 km`, `2,42 km/L`, `R$ 7.453,00`, `R$ 982,00` e custo ponderado por km correspondente (`R$ 2,25`), retornando zeros quando a lista estiver vazia
