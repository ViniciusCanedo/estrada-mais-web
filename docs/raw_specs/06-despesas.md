# 06 — Especificação Técnica: Diário de Despesas Operacionais / Ledger (`despesas`)

## 1. Visão Geral

Este módulo implementa o Diário Contábil de Despesas Operacionais (**Ledger** — `expenses`) do motorista autônomo: registro e manutenção de gastos categorizados (`combustivel`, `pedagio`, `borracharia`, `manutencao`, `alimentacao`, `outros`), controle de litragem e cálculo automático de **Preço por Litro (`R$/L`)** para abastecimentos, formas de pagamento, identificação de documento fiscal/comprovante (`NF-e`, `Recibo`, `Cupom`, `Extrato`) e barra de filtros rápidos por categoria com contadores dinâmicos por competência.

**Telas e elementos do mockup ([estrada-desktop.html](file:///Users/vinicius.canedo/Documents/trae_projects/estrada_mais_web/estrada-desktop.html)) cobertos:**

- **Tela 3 — Despesas (`#screen-expenses`, `[data-od-id="screen-expenses"]`, linhas 901–1008):**
  - Barra de filtro por categoria com contadores: `TODAS (42)`, `Combustível (18)`, `Pedágios (12)`, `Borracharia (4)`, `Manutenção (3)`, `Alimentação (5)`, `Outras` + CTA `+ Nova Despesa`.
  - Tabela completa (`#full-expenses-table`): colunas `DATA`, `CATEGORIA`, `ESTABELECIMENTO / DESCRIÇÃO`, `LITROS`, `PREÇO/L`, `VALOR TOTAL`, `PAGAMENTO`, `COMPROVANTE` e `AÇÕES` (Editar, Excluir).
- **Modal 2 — Lançar / Editar Despesa (`#modal-log-expense`, `[data-od-id="modal-log-expense"]`, linhas 1497–1590):**
  - Formulário modal com `Categoria da Despesa *`, `Data *`, `Estabelecimento / Descrição *`, `Litros (Se combustível)`, `Valor Total Pago (R$) *`, `Forma de Pagamento` e `Número do Cupom / NF-e`.

---

## 2. Regras de Negócio e Critérios de Aceite

### 2.1 Regras de Negócio

1. **RN-EXP-01 — Categorias Oficiais de Despesa:** As categorias válidas do Ledger são:
   - `combustivel` — Combustível (Diesel S10 / Arla) — badge azul (`expense-blue`)
   - `pedagio` — Pedágio / Recarga TAG — badge azul (`expense-blue`)
   - `manutencao` — Manutenção Mecânica / Peças — badge âmbar (`amber`)
   - `borracharia` — Borracharia & Pneus — badge superfície/borda clara (`asphalt-borderLight`)
   - `alimentacao` — Alimentação & Pernoite (Diárias) — badge neutro (`highway-muted`)
   - `outros` — Outras Despesas Operacionais — badge neutro
2. **RN-EXP-02 — Regra Condicional de Litragem e Preço por Litro (`R$/L`):**
   - Quando `category === 'combustivel'`, o campo `Litros` (`fuelLiters`) é obrigatório (`> 0`).
   - Para despesas com `category !== 'combustivel'`, `fuel_liters_deciliters` é salvo como `NULL` no banco e as colunas `LITROS` e `PREÇO/L` na tabela exibem `-`.
   - Quando `fuelLiters > 0`, o `Preço/L` é calculado como $\text{Preço/L} = \frac{\text{Valor Total (R\$)}}{\text{Litros}}$.
3. **RN-EXP-03 — Formas de Pagamento Padronizadas:**
   - `cartao_frota` (`Cartão Frota`)
   - `cartao_debito` (`Cartão de Débito`)
   - `pix` (`PIX Direto`)
   - `dinheiro` (`Dinheiro em Espécie`)
   - `boleto` (`Faturado / Boleto`)
4. **RN-EXP-04 — Classificação Visual do Comprovante:**
   - Se `receiptReference` começar com `NF-e` ou `Extrato` (documento fiscal eletrônico auditável), o badge na coluna `COMPROVANTE` é renderizado em verde (`text-highway-green bg-highway-green/10`).
   - Caso contrário (`Recibo`, `Cupom` ou texto livre), é renderizado em estilo neutro (`text-highway-muted bg-asphalt-bg`).
5. **RN-EXP-05 — Convivência entre Despesas Avulsas e Despesas Vinculadas a Viagens (`trip_id`):**
   - O Ledger exibe tanto despesas avulsas (`trip_id IS NULL`, ex.: borracharia, oficina, refeições, recarga avulsa de TAG ou abastecimento avulso) quanto despesas originadas automaticamente pelo lançamento de viagens (`trip_id IS NOT NULL`), garantindo visão contábil única sem duplicidade.
   - Se o usuário editar ou excluir diretamente no Ledger uma despesa que possui `trip_id`, ela pode ser editada/excluída normalmente (ou exibir indicador de vínculo com a viagem).
6. **RN-EXP-06 — Contadores por Categoria:** Os contadores exibidos nas pílulas de categoria (`TODAS (42)`, `Combustível (18)`, etc.) refletem sempre o total daquela categoria dentro do mês de competência selecionado na Top Bar, independentemente de qual filtro de categoria esteja ativo no momento.

### 2.2 Critérios de Aceite (Checklist Verificável)

- [ ] Barra de categorias exibe a contagem exata de despesas por categoria no mês selecionado e filtra a tabela ao clicar em qualquer pílula.
- [ ] Modal `Lançar Nova Despesa` exige `Litros > 0` quando a categoria selecionada é `Combustível` e limpa/desabilita `Litros` para as demais categorias.
- [ ] Na tabela de despesas, registros de `Combustível` exibem `500,0 L` e `R$ 4,80` (`PREÇO/L`), enquanto demais categorias exibem `-`.
- [ ] Criar, editar ou excluir uma despesa atualiza imediatamente a listagem, os contadores por categoria, o badge da Sidebar e os indicadores do Dashboard.

---

## 3. Modelo de Dados (`server/database/schema.ts`)

### 3.1 Tabela Drizzle (`expenses`)

```ts
// Trecho ilustrativo de server/database/schema.ts
import { sql } from 'drizzle-orm'
import { sqliteTable, integer, text, index, check } from 'drizzle-orm/sqlite-core'
import { drivers, trips } from './schema'

export const EXPENSE_CATEGORIES = [
  'combustivel',
  'pedagio',
  'borracharia',
  'manutencao',
  'alimentacao',
  'outros',
] as const

export const PAYMENT_METHODS = [
  'cartao_frota',
  'cartao_debito',
  'pix',
  'dinheiro',
  'boleto',
] as const

export const expenses = sqliteTable(
  'expenses',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    driverId: integer('driver_id')
      .notNull()
      .references(() => drivers.id, { onDelete: 'cascade' }),
    tripId: integer('trip_id').references(() => trips.id, { onDelete: 'cascade' }),
    expenseDate: text('expense_date').notNull(), // YYYY-MM-DD
    category: text('category', { enum: EXPENSE_CATEGORIES }).notNull(),
    description: text('description').notNull(),
    amountCents: integer('amount_cents').notNull(),
    fuelLitersDeciliters: integer('fuel_liters_deciliters'), // Nullable (somente combustivel)
    paymentMethod: text('payment_method', { enum: PAYMENT_METHODS }).notNull(),
    receiptReference: text('receipt_reference'), // Ex.: 'NF-e 8912', 'Recibo', 'Cupom'
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('expenses_driver_date_idx').on(table.driverId, table.expenseDate),
    index('expenses_driver_category_date_idx').on(
      table.driverId,
      table.category,
      table.expenseDate,
    ),
    index('expenses_trip_idx').on(table.tripId),
    check('expenses_amount_positive_chk', sql`${table.amountCents} > 0`),
  ],
)
```

---

## 4. Schemas Zod (`shared/schemas/expense.schema.ts`)

```ts
// shared/schemas/expense.schema.ts
import { z } from 'zod'

export const expenseCategorySchema = z.enum(
  ['combustivel', 'pedagio', 'borracharia', 'manutencao', 'alimentacao', 'outros'],
  { error: 'Selecione uma categoria de despesa válida.' },
)

export const paymentMethodSchema = z.enum(
  ['cartao_frota', 'cartao_debito', 'pix', 'dinheiro', 'boleto'],
  { error: 'Selecione uma forma de pagamento válida.' },
)

export const expensePayloadSchema = z
  .object({
    category: expenseCategorySchema,
    expenseDate: z
      .string({ error: 'A data da despesa é obrigatória.' })
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe uma data válida no formato AAAA-MM-DD.'),
    description: z
      .string({ error: 'O estabelecimento ou descrição é obrigatório.' })
      .trim()
      .min(3, 'A descrição deve ter pelo menos 3 caracteres.')
      .max(160, 'A descrição deve ter no máximo 160 caracteres.'),
    fuelLiters: z.number().positive('A litragem deve ser maior que zero.').optional().nullable(),
    amountReais: z
      .number({ error: 'O valor total pago é obrigatório.' })
      .positive('O valor da despesa deve ser maior que R$ 0,00.'),
    paymentMethod: paymentMethodSchema.default('cartao_frota'),
    receiptReference: z
      .string()
      .trim()
      .max(40, 'O número do comprovante/NF-e deve ter no máximo 40 caracteres.')
      .optional()
      .or(z.literal('')),
  })
  .refine(
    (data) =>
      data.category !== 'combustivel' ||
      (typeof data.fuelLiters === 'number' && data.fuelLiters > 0),
    {
      path: ['fuelLiters'],
      message: 'Informe a quantidade de litros para despesas de combustível.',
    },
  )

export const expenseFilterQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Mês inválido.')
    .optional(),
  category: z
    .enum(['todas', 'combustivel', 'pedagio', 'borracharia', 'manutencao', 'alimentacao', 'outros'])
    .default('todas'),
})

export const expenseIdParamsSchema = z.object({
  id: z.coerce.number().int().positive('Identificador de despesa inválido.'),
})

export type ExpenseCategory = z.infer<typeof expenseCategorySchema>
export type PaymentMethod = z.infer<typeof paymentMethodSchema>
export type ExpensePayloadInput = z.infer<typeof expensePayloadSchema>
export type ExpenseFilterQuery = z.infer<typeof expenseFilterQuerySchema>
```

- **Reuso:**
  - `expensePayloadSchema`: usado em `ExpenseFormModal.vue` (`UForm`) e em `POST /api/expenses` e `PUT /api/expenses/[id]`.
  - `expenseFilterQuerySchema`: usado em `ExpensesCategoryBar.vue` / `useExpenses.ts` e em `GET /api/expenses`.

---

## 5. Endpoints

|  Método  | Rota                 | Schema de Entrada                                                | Formato de Resposta                                                                                                                                      | Códigos de Erro                                                              |
| :------: | :------------------- | :--------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------- |
|  `GET`   | `/api/expenses`      | `expenseFilterQuerySchema` (query)                               | `200 OK`: `{ data: ExpenseDto[], meta: { totalCount: number, totalAmountReais: number, countsByCategory: Record<ExpenseCategory \| 'todas', number> } }` | `400` (query inválida), `401` (não autenticado)                              |
|  `POST`  | `/api/expenses`      | `expensePayloadSchema` (body)                                    | `201 Created`: `{ data: ExpenseDto }`                                                                                                                    | `400` (validação / combustível sem litros), `401` (não autenticado)          |
|  `PUT`   | `/api/expenses/[id]` | `expenseIdParamsSchema` (params) + `expensePayloadSchema` (body) | `200 OK`: `{ data: ExpenseDto }`                                                                                                                         | `400` (validação), `401` (não autenticado), `404` (despesa não encontrada)   |
| `DELETE` | `/api/expenses/[id]` | `expenseIdParamsSchema` (params)                                 | `200 OK`: `{ success: true }`                                                                                                                            | `400` (id inválido), `401` (não autenticado), `404` (despesa não encontrada) |

---

## 6. Services e Repositories

### 6.1 `server/repositories/expense.repository.ts`

```ts
export interface IExpenseRepository {
  findManyByDriverAndMonth(
    driverId: number,
    month: string,
    category?: ExpenseCategory,
  ): ExpenseRow[]
  countByCategoryInMonth(driverId: number, month: string): Record<ExpenseCategory | 'todas', number>
  findByIdAndDriver(id: number, driverId: number): ExpenseRow | undefined
  create(data: NewExpenseRow): ExpenseRow
  update(id: number, driverId: number, data: Partial<NewExpenseRow>): ExpenseRow
  deleteByIdAndDriver(id: number, driverId: number): boolean
}
```

### 6.2 `server/services/expense.service.ts`

```ts
export interface IExpenseService {
  listExpenses(driverId: number, query: ExpenseFilterQuery): ExpenseListResponse
  createExpense(driverId: number, input: ExpensePayloadInput): ExpenseDto
  updateExpense(driverId: number, expenseId: number, input: ExpensePayloadInput): ExpenseDto
  deleteExpense(driverId: number, expenseId: number): void
}
```

- **Responsabilidades:**
  - Converte `amountReais` ↔ `amountCents` e `fuelLiters` ↔ `fuelLitersDeciliters`.
  - Se `category !== 'combustivel'`, força `fuelLitersDeciliters = null`.
  - Calcula `pricePerLiterReais = category === 'combustivel' && fuelLiters ? amountReais / fuelLiters : null`.
  - Classifica `receiptBadgeType` (`'fiscal'` para `NF-e`/`Extrato` vs `'simple'` para `Recibo`/`Cupom`).

---

## 7. Front-end

### 7.1 Páginas, Componentes e Composables

| Tipo           | Caminho                                           | Responsabilidade                                                                                                                                                          |
| :------------- | :------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Página**     | `app/pages/expenses.vue`                          | Compõe `ExpensesCategoryBar` e `ExpensesDataTable`, gerenciando estados de loading, vazio e erro.                                                                         |
| **Componente** | `app/components/expenses/ExpensesCategoryBar.vue` | Renderiza os botões de filtro por categoria com as contagens dinâmicas (`TODAS (42)`, `Combustível (18)`, etc.) e o CTA `+ Nova Despesa`.                                 |
| **Componente** | `app/components/expenses/ExpensesDataTable.vue`   | Tabela completa do Ledger com badges coloridos por categoria, formatação de `LITROS` e `PREÇO/L`, badge de comprovante e ações de editar/excluir.                         |
| **Componente** | `app/components/expenses/ExpenseFormModal.vue`    | Modal (`UModal`) com `UForm :schema="expensePayloadSchema"`, select de categoria, input de litros reativo à categoria e select de pagamento.                              |
| **Composable** | `app/composables/useExpenses.ts`                  | Gerencia a categoria ativa e o mês global (`useCompetencePeriod`), consulta `/api/expenses` via `useApiFetch` e expõe `createExpense`, `updateExpense` e `deleteExpense`. |

---

## 8. Seeds e Factories (`server/database/seed.ts`)

- **Dados de Desenvolvimento (Setembro/2026 + histórico Abr–Ago/2026):**
  - Inclui exatamente os registros exibidos nas tabelas de Despesas do mockup:
    - `2026-09-16` | `combustivel` | `Posto Graal Rodovia dos Bandeirantes KM 56` | `500,0 L` | `R$ 4,80/L` | `R$ 2.400,00` | `cartao_frota` | `NF-e 8912`
    - `2026-09-14` | `borracharia` | `Borracharia do Gaúcho - Reparo de válvula e calibragem` | `-` | `-` | `R$ 180,00` | `pix` | `Recibo`
    - `2026-09-12` | `manutencao` | `Troca de filtro de óleo e combustível - Scania Ribeirão` | `-` | `-` | `R$ 840,00` | `cartao_debito` | `NF-e 4431`
    - `2026-09-10` | `alimentacao` | `Churrascaria & Restaurante da Serra - Jantar + Café` | `-` | `-` | `R$ 95,00` | `dinheiro` | `Cupom`
    - `2026-09-08` | `pedagio` | `Autopista Litoral Sul (Recarga TAG)` | `-` | `-` | `R$ 650,00` | `cartao_frota` | `Extrato`
  - Mais lançamentos complementares gerados deterministicamente via `drizzle-seed` para totalizar as categorias e os 6 meses históricos.
- **Factory para Testes:** `createTestExpense(db, driverId, overrides?)`.

---

## 9. Estratégia de Testes

1. **Unitários (`test/unit/expense.service.spec.ts` e `test/unit/expense.repository.spec.ts`):**
   - Validação condicional: despesa `combustivel` sem `fuelLiters` falha no `expensePayloadSchema` com `"Informe a quantidade de litros para despesas de combustível."`.
   - Despesa `manutencao` com `fuelLiters` informado tem `fuelLitersDeciliters` limpo para `null` no service.
   - Cálculo exato de `pricePerLiterReais` (`2400 / 500 = 4.80`).
   - Contagem agrupada por categoria no mês (`countByCategoryInMonth`) contra SQLite `:memory:`.
2. **Integração / Nuxt (`test/nuxt/expenses-page.spec.ts` e `test/nuxt/expense-modal.spec.ts`):**
   - Troca de categoria em `ExpensesCategoryBar.vue` filtrando as linhas exibidas e mantendo os contadores nas pílulas.
   - Submissão do `ExpenseFormModal.vue` validando campos obrigatórios.
3. **E2E (`test/e2e/expenses.spec.ts`):**
   - Lançar nova despesa pelo botão global `+ Lançar Despesa`, filtrar por categoria na tela `/expenses`, editar valor e excluir registro.

---

## 10. Gates Aplicáveis

- **G1–G4:** Formatação, lint, tipagem estrita e tamanho/complexidade de funções e componentes.
- **G7 & G8 (`deps:check` & `test:arch`):** `server/api/expenses/**` chama exclusivamente `ExpenseService`; apenas `ExpenseRepository` importa Drizzle ORM; schema `expensePayloadSchema` importado de `#shared/schemas/expense.schema`.
- **G9 (`test:coverage`):** Cobertura `>= 90%` em `shared/schemas/expense.schema.ts`, `server/services/expense.service.ts` e `server/repositories/expense.repository.ts`.

---

## 11. Dependências e Pontos em Aberto

- **Dependências:** Depende de `01-configuracao-projeto`, `02-design-system-e-layout`, `03-autenticacao` e `04-configuracoes-e-perfil`.
- **Pontos em Aberto:** Nenhum.
