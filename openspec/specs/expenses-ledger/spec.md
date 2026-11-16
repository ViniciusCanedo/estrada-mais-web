# expenses-ledger Specification

## Purpose

Definir os requisitos normativos do Diário Contábil de Despesas Operacionais (Ledger — `expenses`) do motorista autônomo (TAC) no Estrada+, abrangendo categorias oficiais, regra condicional de litragem e cálculo de preço por litro (`R$/L`), formas de pagamento padronizadas, classificação visual de comprovantes fiscais, convivência entre despesas avulsas e vinculadas a viagens (`tripId`) e contadores dinâmicos por competência mensal independentes do filtro ativo.

## Requirements

### Requirement: Categorias oficiais e estilização contábil do Ledger de Despesas (RN-EXP-01)

O sistema SHALL suportar exclusivamente as seis categorias oficiais de despesa definidas em `EXPENSE_CATEGORIES` (`combustivel`, `pedagio`, `borracharia`, `manutencao`, `alimentacao`, `outros`) e validá-las via `expenseCategorySchema` em `shared/schemas/expense.schema.ts`. Na tabela do Ledger (`ExpensesDataTable.vue`), cada linha MUST renderizar o badge da categoria correspondente seguindo o padrão visual Night Highway: `combustivel` e `pedagio` em azul (`expense-blue`), `manutencao` em âmbar (`amber`), `borracharia` com superfície e borda clara (`asphalt-border-light`), e `alimentacao` e `outros` em tom neutro (`highway-muted`).

#### Scenario: Validação de categoria permitida no payload da API e no formulário

- **WHEN** uma requisição `POST /api/expenses` ou `PUT /api/expenses/[id]` envia uma categoria pertencente a `EXPENSE_CATEGORIES` vs. uma categoria desconhecida
- **THEN** a categoria válida é aceita por `expensePayloadSchema` e a categoria inválida é rejeitada com erro de validação em `pt-BR` (`"Selecione uma categoria de despesa válida."`) retornando HTTP `400 Bad Request`

#### Scenario: Renderização dos badges coloridos por categoria na tabela

- **WHEN** `ExpensesDataTable.vue` renderiza despesas das categorias `combustivel`, `pedagio`, `manutencao`, `borracharia`, `alimentacao` e `outros`
- **THEN** cada linha exibe o rótulo em `pt-BR` e o estilo de badge correspondente à sua categoria conforme a RN-EXP-01

### Requirement: Regra condicional de litragem, limpeza em categorias não combustível e cálculo de Preço por Litro (RN-EXP-02)

O schema `expensePayloadSchema` SHALL exigir `fuelLiters` numérico e estritamente positivo (`> 0`) sempre que `category === 'combustivel'`, rejeitando ausência ou valor `<= 0` com a mensagem `"Informe a quantidade de litros para despesas de combustível."`. No servidor, `ExpenseService` MUST converter `amountReais` para centavos inteiros (`toCents`) e `fuelLiters` para decilitros inteiros (`toDeciliters`), forçando `fuelLitersDeciliters = null` sempre que `category !== 'combustivel'`, mesmo se `fuelLiters` vier preenchido no payload. Ao mapear `ExpenseDto`, `ExpenseService` MUST calcular `pricePerLiterReais = category === 'combustivel' && fuelLiters ? amountReais / fuelLiters : null`. Na interface, `ExpenseFormModal.vue` MUST habilitar/exigir o campo `Litros` apenas quando `category === 'combustivel'`, limpando e desabilitando o campo para as demais categorias, e `ExpensesDataTable.vue` MUST exibir `-` nas colunas `LITROS` e `PREÇO/L` quando `fuelLiters` ou `pricePerLiterReais` for `null`.

#### Scenario: Rejeição de despesa de combustível sem litragem informada

- **WHEN** uma despesa com `category: 'combustivel'` é submetida sem `fuelLiters` ou com `fuelLiters <= 0`
- **THEN** `expensePayloadSchema` falha na validação com `"Informe a quantidade de litros para despesas de combustível."` no campo `fuelLiters`, bloqueando a submissão no `UForm` e retornando HTTP `400 Bad Request` na API

#### Scenario: Limpeza automática de litragem ao salvar ou alternar para categoria não combustível

- **WHEN** um payload ou edição altera `category` para `manutencao` (ou qualquer categoria diferente de `combustivel`) mesmo contendo `fuelLiters` prévio
- **THEN** `ExpenseFormModal.vue` limpa e desabilita o campo de litros, `ExpenseService` persiste `fuel_liters_deciliters = NULL` no SQLite e `ExpenseDto` retorna `fuelLiters: null` e `pricePerLiterReais: null`

#### Scenario: Cálculo exato de Preço por Litro e exibição formatada na tabela

- **WHEN** uma despesa de `combustivel` é registrada com `amountReais: 2400` (`240000` centavos) e `fuelLiters: 500` (`5000` decilitros)
- **THEN** `ExpenseService` persiste em inteiros escalados, retorna `pricePerLiterReais: 4.8` no `ExpenseDto` e `ExpensesDataTable.vue` exibe `500,0 L` e `R$ 4,80`

### Requirement: Formas de pagamento padronizadas (RN-EXP-03)

O sistema SHALL validar e aceitar exclusivamente as formas de pagamento definidas em `PAYMENT_METHODS` (`cartao_frota`, `cartao_debito`, `pix`, `dinheiro`, `boleto`) por meio de `paymentMethodSchema` (com padrão `'cartao_frota'`), exibindo na tabela e no formulário os rótulos padronizados em `pt-BR`: `Cartão Frota`, `Cartão de Débito`, `PIX Direto`, `Dinheiro em Espécie` e `Faturado / Boleto`.

#### Scenario: Seleção e exibição traduzida de forma de pagamento

- **WHEN** uma despesa é salva com `paymentMethod: 'pix'` ou `'boleto'`
- **THEN** o SQLite persiste o enum canônico e a coluna `PAGAMENTO` da tabela exibe respectivamente `PIX Direto` ou `Faturado / Boleto`

### Requirement: Classificação visual do comprovante fiscal (RN-EXP-04)

Ao mapear cada registro para `ExpenseDto`, `ExpenseService` SHALL classificar `receiptBadgeType` como `'fiscal'` quando `receiptReference` iniciar com `NF-e` ou `Extrato` (case-insensitive, `/^(NF-e|Extrato)/i`) e como `'simple'` nos demais casos (`Recibo`, `Cupom`, texto livre ou ausência de comprovante). Na interface, `ExpensesDataTable.vue` MUST renderizar badges `'fiscal'` em verde (`text-highway-green bg-highway-green/10`) e badges `'simple'` em estilo neutro (`text-highway-muted bg-asphalt-bg`).

#### Scenario: Classificação e renderização de comprovante fiscal vs simples

- **WHEN** a listagem contém despesas com `receiptReference: 'NF-e 8912'`, `'Extrato'` e `'Recibo'`
- **THEN** os dois primeiros recebem `receiptBadgeType: 'fiscal'` com destaque verde e `'Recibo'` recebe `receiptBadgeType: 'simple'` com estilo neutro

### Requirement: Convivência contábil, CRUD autenticado e vínculo com viagens (RN-EXP-05)

O Ledger SHALL listar conjuntamente despesas avulsas (`tripId === null`) e despesas originadas automaticamente por viagens (`tripId !== null`), expondo `tripId` e `isTripLinked = tripId !== null` no `ExpenseDto` para renderização de indicador visual discreto na tabela. Todos os endpoints `/api/expenses` (`GET`, `POST`, `PUT`, `DELETE`) MUST exigir sessão autenticada (`401 Unauthorized` via `DomainError('UNAUTHORIZED', ...)`), validar entrada com schemas de `#shared/schemas/expense.schema` (`400 Bad Request`) e restringir leitura, atualização e exclusão ao `driverId` autenticado (`404 Not Found` via `DomainError('NOT_FOUND', ...)` quando inexistente ou pertencente a outro motorista). Criar, editar ou excluir uma despesa MUST atualizar a listagem, os contadores por categoria e invocar `refreshSync()` (`useTelemetrySync`) para atualizar imediatamente o badge da Sidebar.

#### Scenario: Exibição conjunta de despesas avulsas e vinculadas a viagens com indicador de vínculo

- **WHEN** o motorista autenticado consulta `GET /api/expenses?month=2026-09` possuindo despesas com `tripId = null` e `tripId = 1`
- **THEN** o endpoint retorna ambos os tipos ordenados por `expenseDate desc, id desc`, marcando `isTripLinked: true` nas despesas vinculadas e `false` nas avulsas, e a tabela exibe o indicador de vínculo com viagem sem impedir edição ou exclusão

#### Scenario: Isolamento de propriedade e fluxo completo de criação, edição e exclusão

- **WHEN** o motorista autenticado cria via `POST /api/expenses` (`201 Created`), edita via `PUT /api/expenses/[id]` (`200 OK`) ou exclui via `DELETE /api/expenses/[id]` (`200 OK` `{ success: true }`) uma despesa própria vs. tenta alterar/excluir despesa de outro motorista ou inexistente
- **THEN** operações sobre registros próprios persistem e retornam os dados atualizados, enquanto registros inexistentes ou de terceiros retornam HTTP `404 Not Found` e requisições sem cookie de sessão retornam HTTP `401 Unauthorized`

### Requirement: Contadores dinâmicos por categoria independentes do filtro ativo (RN-EXP-06)

O endpoint `GET /api/expenses` SHALL aceitar `month` (`AAAA-MM` opcional) e `category` (`'todas'` | `ExpenseCategory`, padrão `'todas'`) validados por `expenseFilterQuerySchema`, retornando `{ data: ExpenseDto[], meta: { totalCount, totalAmountReais, countsByCategory } }`. O objeto `meta.countsByCategory` MUST contabilizar todas as sete chaves (`todas`, `combustivel`, `pedagio`, `borracharia`, `manutencao`, `alimentacao`, `outros`) dentro da competência `month` selecionada, independentemente do filtro `category` ativo. Na interface, `ExpensesCategoryBar.vue` MUST exibir todas as pílulas com suas respectivas contagens (`TODAS (N)`, `Combustível (N)`, `Pedágios (N)`, `Borracharia (N)`, `Manutenção (N)`, `Alimentação (N)`, `Outras (N)`) e manter as contagens do mês inalteradas ao alternar a pílula ativa.

#### Scenario: Filtragem por categoria preserva contadores totais do mês selecionado

- **WHEN** o motorista seleciona a competência `2026-09` e clica na pílula `Combustível` em `ExpensesCategoryBar.vue`
- **THEN** `GET /api/expenses?month=2026-09&category=combustivel` retorna em `data` apenas as despesas de `combustivel` daquele mês, enquanto `meta.countsByCategory` mantém os totais de todas as categorias do mês `2026-09` para exibição nas pílulas da barra de filtros
