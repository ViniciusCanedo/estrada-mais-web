# 05 — Especificação Técnica: Gestão de Viagens e Telemetria (`viagens`)

## 1. Visão Geral

Este módulo implementa o gerenciamento completo de viagens rodoviárias (`trips`) do motorista autônomo: listagem histórica, filtros combinados (busca textual, período e UF), ordenação por coluna, totalizadores de rodapé, criação/edição com **cálculo de telemetria em tempo real** (distância percorrida, média `km/L` e `R$/km`) e **sincronização automática transacional** dos custos de Diesel e Pedágio do percurso com o Diário de Despesas (`expenses`).

**Telas e elementos do mockup ([estrada-desktop.html](file:///Users/vinicius.canedo/Documents/trae_projects/estrada_mais_web/estrada-desktop.html)) cobertos:**

- **Tela 2 — Viagens (`#screen-trips`, `[data-od-id="screen-trips"]`, linhas 738–896):**
  - Barra de filtros: input de busca (`Buscar origem, destino ou NF...`), select de período (`Mês Selecionado`, `Últimos 90 dias`, `Ano Completo`), filtro rápido por UF (`TODOS`, `SP`, `PR`, `MT`, etc.) e CTA `+ Nova Viagem`.
  - Tabela completa (`#full-trips-table`): colunas `DATA`, `ROTA (ORIGEM → DESTINO)`, `NF-E`, `CARGA`, `KM RODADOS`, `KM/L`, `DIESEL (R$)`, `PEDÁGIO`, `CUSTO/KM` e `AÇÕES` (Editar, Excluir), além do rodapé `TOTAIS (N VIAGENS EXIBIDAS)`.
- **Modal 1 — Registrar / Editar Viagem (`#modal-log-trip`, `[data-od-id="modal-log-trip"]`, linhas 1376–1492):**
  - Formulário com cálculo ao vivo de `KM Rodados (Distância)` e `Consumo Médio (km/L)`, acrescido do campo **`Valor do Frete Bruto (R$)`** conforme alinhado para apuração da Sobra Líquida.

---

## 2. Regras de Negócio e Critérios de Aceite

### 2.1 Regras de Negócio

1. **RN-TRIP-01 — Validação de Odômetro (`KM Final > KM Inicial`):** O `KM Final` deve ser estritamente maior que o `KM Inicial`. Caso `kmEnd <= kmStart`, o visor em tempo real exibe `Inválido (End ≤ Start)` em vermelho (`text-highway-red`) e a submissão é bloqueada tanto no front-end quanto na API (`400 Bad Request`).
2. **RN-TRIP-02 — Fórmulas de Telemetria da Viagem:**
   - $\text{Distância (km)} = \text{kmEnd} - \text{kmStart}$
   - $\text{Consumo Médio (km/L)} = \frac{\text{Distância (km)}}{\text{Litros de Diesel}}$ (arredondado para 2 casas decimais na exibição)
   - $\text{Custo por KM da Viagem (R\$/km)} = \frac{\text{Custo Diesel} + \text{Custo Pedágio}}{\text{Distância (km)}}$
3. **RN-TRIP-03 — Extração e Padronização de Origem/Destino (`Cidade, UF`):**
   - Os campos de origem e destino seguem o formato `Cidade, UF` (ex.: `Santos, SP`, `Rondonópolis, MT`) ou são armazenados estruturados (`origin_city`, `origin_state`, `destination_city`, `destination_state` com UF de 2 letras maiúsculas válidas da federação brasileira).
   - O filtro de estados (`TODOS`, `SP`, `PR`, `MT`, etc.) filtra viagens cuja UF de origem **ou** UF de destino corresponda à UF selecionada.
4. **RN-TRIP-04 — Sincronização Transacional com o Ledger de Despesas (`expenses`):**
   - Conforme alinhado, o Ledger de Despesas (`expenses`) é a fonte única da verdade dos custos operacionais mensais.
   - **Ao criar uma viagem (`POST /api/trips`):** Dentro da mesma transação SQLite (`db.transaction`), além de inserir o registro em `trips`, o `TripService` cria automaticamente em `expenses` (com `trip_id = trip.id` e `expense_date = trip.tripDate`):
     - 1 despesa categoria `combustivel` se `fuelCostCents > 0` (com `amount_cents = fuelCostCents`, `fuel_liters_deciliters = fuelLitersDeciliters`, `description = "Abastecimento Percurso: ${origin} → ${destination}"`, `receipt_reference = invoiceNumber ? "NF-e " + invoiceNumber : "Viagem"`).
     - 1 despesa categoria `pedagio` se `tollCostCents > 0` (com `amount_cents = tollCostCents`, `description = "Pedágios Percurso: ${origin} → ${destination}"`, `receipt_reference = "Via TAG / Percurso"`).
   - **Ao editar uma viagem (`PUT /api/trips/:id`):** Atualiza ou remove as despesas automáticas vinculadas àquele `trip_id` na mesma transação.
   - **Ao excluir uma viagem (`DELETE /api/trips/:id`):** A constraint `ON DELETE CASCADE` em `expenses.trip_id` remove automaticamente as despesas vinculadas à viagem.
5. **RN-TRIP-05 — Cálculo do Rodapé de Totais (`<tfoot>`):**
   - Para o conjunto de viagens filtradas exibidas:
     - `totalDistanceKm` = soma de `distance_km`
     - `weightedAverageKmL` = $\frac{\sum \text{distance\_km}}{\sum \text{fuel\_liters}}$ (média ponderada real, nunca média simples das médias!)
     - `totalFuelCostCents` = soma de `fuel_cost_cents`
     - `totalTollCostCents` = soma de `toll_cost_cents`
     - `totalFreightValueCents` = soma de `freight_value_cents`
     - `weightedCostPerKmCents` = $\frac{\sum (\text{fuel\_cost\_cents} + \text{toll\_cost\_cents})}{\sum \text{distance\_km}}$

### 2.2 Critérios de Aceite (Checklist Verificável)

- [ ] No modal de Nova/Editar Viagem, alterar `KM Inicial`, `KM Final` ou `Diesel (Litros)` atualiza instantaneamente os indicadores `KM Rodados (Distância)` e `Consumo Médio (km/L)`.
- [ ] Tentar salvar viagem com `KM Final <= KM Inicial` exibe erro em `pt-BR` no campo e não envia requisição inválida.
- [ ] Criar uma viagem com custo de diesel e pedágio cria a viagem e as respectivas entradas vinculadas em `expenses` em uma única transação atômica.
- [ ] Filtrar por texto (origem, destino ou NF-e), período (`month`, `last90days`, `year`) ou UF (`SP`, `PR`, `MT`) atualiza a tabela e recalcula o rodapé `TOTAIS (N VIAGENS EXIBIDAS)`.
- [ ] Clicar nos cabeçalhos `DATA`, `ROTA`, `KM RODADOS`, `KM/L` ou `CUSTO/KM` alterna a ordenação (`asc` / `desc`).
- [ ] Editar e excluir viagem funcionam atualizando a tabela, o contador da Sidebar e o Ledger de Despesas.

---

## 3. Modelo de Dados (`server/database/schema.ts`)

### 3.1 Tabela Drizzle (`trips`)

```ts
// Trecho ilustrativo de server/database/schema.ts
import { sql } from 'drizzle-orm'
import { sqliteTable, integer, text, index, check } from 'drizzle-orm/sqlite-core'
import { drivers } from './schema'

export const trips = sqliteTable(
  'trips',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    driverId: integer('driver_id')
      .notNull()
      .references(() => drivers.id, { onDelete: 'cascade' }),
    tripDate: text('trip_date').notNull(), // YYYY-MM-DD
    invoiceNumber: text('invoice_number'), // Ex.: '10824'
    originCity: text('origin_city').notNull(), // Ex.: 'Santos'
    originState: text('origin_state').notNull(), // Ex.: 'SP'
    destinationCity: text('destination_city').notNull(), // Ex.: 'Rondonópolis'
    destinationState: text('destination_state').notNull(), // Ex.: 'MT'
    cargoWeightKg: integer('cargo_weight_kg'), // Ex.: 32400 (32,4 ton)
    freightValueCents: integer('freight_value_cents').notNull().default(0), // Frete Bruto
    tollCostCents: integer('toll_cost_cents').notNull().default(0), // Pedágio
    kmStart: integer('km_start').notNull(),
    kmEnd: integer('km_end').notNull(),
    distanceKm: integer('distance_km').notNull(), // km_end - km_start
    fuelLitersDeciliters: integer('fuel_liters_deciliters').notNull(), // Ex.: 7220 (722,0 L)
    fuelCostCents: integer('fuel_cost_cents').notNull().default(0), // Diesel em centavos
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('trips_driver_date_idx').on(table.driverId, table.tripDate),
    index('trips_origin_state_idx').on(table.driverId, table.originState),
    index('trips_dest_state_idx').on(table.driverId, table.destinationState),
    check('trips_km_end_gt_start_chk', sql`${table.kmEnd} > ${table.kmStart}`),
    check('trips_distance_positive_chk', sql`${table.distanceKm} > 0`),
    check('trips_fuel_liters_positive_chk', sql`${table.fuelLitersDeciliters} > 0`),
  ],
)
```

---

## 4. Schemas Zod (`shared/schemas/trip.schema.ts`)

```ts
// shared/schemas/trip.schema.ts
import { z } from 'zod'

const locationWithUfRegex = /^.+,\s*[A-Za-z]{2}$/

export const tripPayloadSchema = z
  .object({
    tripDate: z
      .string({ error: 'A data da viagem é obrigatória.' })
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe uma data válida no formato AAAA-MM-DD.'),
    invoiceNumber: z
      .string()
      .trim()
      .max(40, 'O número da NF-e/CT-e deve ter no máximo 40 caracteres.')
      .optional()
      .or(z.literal('')),
    origin: z
      .string({ error: 'A cidade de origem é obrigatória.' })
      .trim()
      .regex(locationWithUfRegex, 'Informe a origem no formato "Cidade, UF" (ex.: Santos, SP).'),
    destination: z
      .string({ error: 'A cidade de destino é obrigatória.' })
      .trim()
      .regex(
        locationWithUfRegex,
        'Informe o destino no formato "Cidade, UF" (ex.: Rondonópolis, MT).',
      ),
    freightValueReais: z
      .number({ error: 'Informe o valor do frete bruto.' })
      .nonnegative('O valor do frete não pode ser negativo.')
      .default(0),
    cargoWeightTons: z
      .number()
      .positive('O peso da carga deve ser maior que zero.')
      .max(200, 'O peso da carga não pode exceder 200 toneladas.')
      .optional(),
    tollCostReais: z.number().nonnegative('O custo de pedágio não pode ser negativo.').default(0),
    kmStart: z
      .number({ error: 'O KM inicial é obrigatório.' })
      .int('O KM inicial deve ser um número inteiro.')
      .nonnegative('O KM inicial não pode ser negativo.'),
    kmEnd: z
      .number({ error: 'O KM final é obrigatório.' })
      .int('O KM final deve ser um número inteiro.')
      .positive('O KM final deve ser maior que zero.'),
    fuelLiters: z
      .number({ error: 'A litragem de diesel é obrigatória.' })
      .positive('A quantidade de diesel deve ser maior que zero.'),
    fuelCostReais: z
      .number({ error: 'O custo total de diesel é obrigatório.' })
      .nonnegative('O custo de diesel não pode ser negativo.'),
  })
  .refine((data) => data.kmEnd > data.kmStart, {
    path: ['kmEnd'],
    message: 'O KM final deve ser maior que o KM inicial (odômetro não pode retroceder).',
  })

export const tripFilterQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Mês inválido.')
    .optional(),
  period: z.enum(['month', 'last90days', 'year']).default('month'),
  search: z.string().trim().max(100).optional(),
  state: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^(TODOS|[A-Z]{2})$/, 'UF inválida.')
    .default('TODOS'),
  sortBy: z
    .enum(['tripDate', 'route', 'distanceKm', 'kmPerLiter', 'costPerKm'])
    .default('tripDate'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
})

export const tripIdParamsSchema = z.object({
  id: z.coerce.number().int().positive('Identificador de viagem inválido.'),
})

export type TripPayloadInput = z.infer<typeof tripPayloadSchema>
export type TripFilterQuery = z.infer<typeof tripFilterQuerySchema>
export type TripIdParams = z.infer<typeof tripIdParamsSchema>
```

- **Reuso:**
  - `tripPayloadSchema`: usado em `TripFormModal.vue` (`UForm`) e em `POST /api/trips` e `PUT /api/trips/[id]`.
  - `tripFilterQuerySchema`: usado em `TripsFilterBar.vue` / `useTrips.ts` e em `GET /api/trips`.
  - `tripIdParamsSchema`: usado em `PUT /api/trips/[id]` e `DELETE /api/trips/[id]`.

---

## 5. Endpoints

|  Método  | Rota              | Schema de Entrada                                          | Formato de Resposta                                                                                                   | Códigos de Erro                                                                                |
| :------: | :---------------- | :--------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------- |
|  `GET`   | `/api/trips`      | `tripFilterQuerySchema` (query)                            | `200 OK`: `{ data: TripDto[], meta: { totalCount: number, availableStates: string[], summary: TripListSummaryDto } }` | `400` (query inválida), `401` (não autenticado)                                                |
|  `POST`  | `/api/trips`      | `tripPayloadSchema` (body)                                 | `201 Created`: `{ data: TripDto }`                                                                                    | `400` (validação / `kmEnd <= kmStart`), `401` (não autenticado)                                |
|  `PUT`   | `/api/trips/[id]` | `tripIdParamsSchema` (params) + `tripPayloadSchema` (body) | `200 OK`: `{ data: TripDto }`                                                                                         | `400` (validação), `401` (não autenticado), `404` (viagem não encontrada / de outro motorista) |
| `DELETE` | `/api/trips/[id]` | `tripIdParamsSchema` (params)                              | `200 OK`: `{ success: true }`                                                                                         | `400` (id inválido), `401` (não autenticado), `404` (viagem não encontrada)                    |

---

## 6. Services e Repositories

### 6.1 `server/repositories/trip.repository.ts`

```ts
export interface ITripRepository {
  findManyByFilter(driverId: number, filter: ResolvedTripFilter): TripRow[]
  findByIdAndDriver(id: number, driverId: number): TripRow | undefined
  listDistinctStates(driverId: number): string[]
  createWithLinkedExpenses(tripData: NewTripRow, linkedExpenses: NewExpenseRow[]): TripRow
  updateWithLinkedExpenses(
    id: number,
    driverId: number,
    tripData: Partial<NewTripRow>,
    linkedExpenses: NewExpenseRow[],
  ): TripRow
  deleteByIdAndDriver(id: number, driverId: number): boolean
}
```

### 6.2 `server/services/trip.service.ts`

```ts
export interface ITripService {
  listTrips(driverId: number, query: TripFilterQuery): TripListResponse
  createTrip(driverId: number, input: TripPayloadInput): TripDto
  updateTrip(driverId: number, tripId: number, input: TripPayloadInput): TripDto
  deleteTrip(driverId: number, tripId: number): void
}
```

- **Responsabilidades:**
  - Extrai `City` e `UF` de `origin` e `destination` (`parseCityAndState("Santos, SP")` → `{ city: "Santos", state: "SP" }`).
  - Calcula `distanceKm = kmEnd - kmStart`, `kmPerLiter = distanceKm / fuelLiters` e `costPerKmReais = (fuelCostReais + tollCostReais) / distanceKm`.
  - Monta as despesas vinculadas (`combustivel` e `pedagio`) e delega a persistência transacional ao `tripRepository`.
  - Calcula o `summary` consolidado do rodapé (`totalDistanceKm`, `weightedAverageKmL`, `totalFuelCostReais`, `totalTollCostReais`, `weightedCostPerKmReais`).

---

## 7. Front-end

### 7.1 Páginas, Componentes, Composables e Utils

| Tipo           | Caminho                                   | Responsabilidade                                                                                                                                                                                                                                   |
| :------------- | :---------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Página**     | `app/pages/trips.vue`                     | Compõe `TripsFilterBar`, `TripsDataTable` e controla estados de loading, vazio e erro.                                                                                                                                                             |
| **Componente** | `app/components/trips/TripsFilterBar.vue` | Input de busca textual com debounce, seletor de período (`Mês`, `Últimos 90 dias`, `Ano`), tags de UF (`TODOS`, `SP`, `PR`, `MT`...) e botão `+ Nova Viagem`.                                                                                      |
| **Componente** | `app/components/trips/TripsDataTable.vue` | Tabela densa com cabeçalhos clicáveis para ordenação, formatação monoespaçada, botões de ação (`Editar`, `Excluir`) e `<tfoot>` de Totais.                                                                                                         |
| **Componente** | `app/components/trips/TripFormModal.vue`  | Modal (`UModal`) para criação e edição com `UForm :schema="tripPayloadSchema"` e box **"Leitura de Odômetro & Abastecimento (Cálculo em Tempo Real)"**.                                                                                            |
| **Composable** | `app/composables/useTrips.ts`             | Gerencia os filtros reativos sincronizados com `useCompetencePeriod()`, busca `GET /api/trips` via `useApiFetch`, e expõe `createTrip`, `updateTrip` e `deleteTrip` (invalidando o cache de viagens, despesas, dashboard e contadores da Sidebar). |
| **Utils Puro** | `shared/utils/telematics.ts`              | Funções puras `calculateTripTelematics({ kmStart, kmEnd, fuelLiters, fuelCostReais, tollCostReais })` reutilizadas tanto no `TripFormModal.vue` (cálculo em tempo real) quanto no `TripService`.                                                   |

---

## 8. Seeds e Factories (`server/database/seed.ts`)

- **Dados de Desenvolvimento (fiel ao mockup Setembro/2026 + histórico de Abr–Ago/2026 para o gráfico de 6 meses):**
  - Inclui as 5 viagens exibidas na tabela de Setembro/2026 do mockup:
    1. `2026-09-15`: `Santos, SP → Rondonópolis, MT` | NF `#10824` | `32,4 ton` | `1.740 km` (`784.320` → `786.060`) | `722,0 L` (`2,41 km/L`) | Diesel `R$ 3.465,00` | Pedágio `R$ 412,00` | Custo/km `R$ 2,22` | Frete `R$ 18.500,00`
    2. `2026-09-11`: `Cascavel, PR → Paranaguá, PR` | NF `#10819` | `36,0 ton` | `520 km` | `203,9 L` (`2,55 km/L`) | Diesel `R$ 980,00` | Pedágio `R$ 184,00` | Custo/km `R$ 2,23` | Frete `R$ 6.800,00`
    3. `2026-09-07`: `Uberlândia, MG → Campinas, SP` | NF `#10804` | `28,5 ton` | `495 km` | `208,0 L` (`2,38 km/L`) | Diesel `R$ 998,00` | Pedágio `R$ 152,00` | Custo/km `R$ 2,32` | Frete `R$ 6.200,00`
    4. `2026-09-03`: `Betim, MG → Duque de Caxias, RJ` | NF `#10788` | `31,0 ton` | `440 km` | `193,0 L` (`2,28 km/L`) | Diesel `R$ 925,00` | Pedágio `R$ 138,00` | Custo/km `R$ 2,41` | Frete `R$ 5.900,00`
    5. `2026-09-01`: `Caxias do Sul, RS → Curitiba, PR` | NF `#10775` | `29,8 ton` | `560 km` | `225,8 L` (`2,48 km/L`) | Diesel `R$ 1.085,00` | Pedágio `R$ 96,00` | Custo/km `R$ 2,10` | Frete `R$ 6.900,00`
  - Mais viagens adicionais em Setembro e nos 5 meses anteriores (`Abr/2026` a `Ago/2026`) geradas deterministicamente com `drizzle-seed` para compor o histórico de 6 meses.
- **Factory para Testes:** `createTestTrip(db, driverId, overrides?)`.

---

## 9. Estratégia de Testes

1. **Unitários (`test/unit/telematics.spec.ts`, `test/unit/trip.service.spec.ts`, `test/unit/trip.repository.spec.ts`):**
   - Cálculo de distância (`786060 - 784320 = 1740`), eficiência (`1740 / 722 = 2.41`) e custo/km (`(3465 + 412) / 1740 = 2.228... → R$ 2,23`).
   - Casos de borda: `kmEnd === kmStart` (rejeitado), `kmEnd < kmStart` (rejeitado), `fuelLiters <= 0` (rejeitado), origem sem UF (rejeitado).
   - Teste de integração do `TripRepository` contra SQLite `:memory:` verificando que:
     - Criar uma viagem insere o registro em `trips` e as 2 despesas correspondentes em `expenses` com `trip_id` preenchido.
     - Editar uma viagem atualiza os valores das despesas vinculadas sem criar duplicatas.
     - Excluir a viagem apaga automaticamente as despesas vinculadas (`ON DELETE CASCADE`).
   - Cálculo da média ponderada no rodapé (`3755 km / 1552.7 L = 2,42 km/L`).
2. **Integração / Nuxt (`test/nuxt/trip-modal.spec.ts` e `test/nuxt/trips-page.spec.ts`):**
   - Atualização em tempo real do box de telemetria ao digitar nos inputs do `TripFormModal.vue`, incluindo exibição de `Inválido (End ≤ Start)` quando `kmEnd <= kmStart`.
   - Filtragem por UF e ordenação por coluna na `TripsDataTable.vue`.
3. **E2E (`test/e2e/trips.spec.ts`):**
   - Fluxo completo: clicar em `+ Registrar Viagem`, preencher dados, validar visor em tempo real, salvar, verificar presença na tabela de Viagens e reflexo automático na tela de Despesas e no Dashboard; editar e excluir a viagem.

---

## 10. Gates Aplicáveis

- **G1–G4:** Limites estritos de linhas por função (`<= 50`) e por componente `.vue` (`<= 250`).
- **G5 (`dup:check`):** Fórmulas de telemetria centralizadas em `shared/utils/telematics.ts` (zero duplicação entre modal e service).
- **G7 & G8 (`deps:check` & `test:arch`):** `server/api/trips/**` chama apenas `TripService`; apenas `TripRepository` acessa o Drizzle ORM.
- **G9 (`test:coverage`):** Cobertura `>= 90%` em `shared/utils/telematics.ts`, `shared/schemas/trip.schema.ts`, `server/services/trip.service.ts` e `server/repositories/trip.repository.ts`.

---

## 11. Dependências e Pontos em Aberto

- **Dependências:** Depende de `01-configuracao-projeto`, `02-design-system-e-layout`, `03-autenticacao`, `04-configuracoes-e-perfil` e compartilha o schema da tabela `expenses` com `06-despesas`.
- **Pontos em Aberto:** Nenhum.
