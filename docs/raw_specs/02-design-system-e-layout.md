# 02 — Especificação Técnica: Sistema de Design & Layout (`design-system-e-layout`)

## 1. Visão Geral

Este módulo estabelece a identidade visual **"Night Highway"** do **Estrada+**, o shell estrutural persistente da aplicação (`Sidebar` esquerda + `Top Bar` com seletor global de competência mensal e CTAs rápidos + indicador de telemetria `SYNC OK`) e os componentes base de interface (inputs com sufixo/prefixo de unidade e divisores rodoviários).

**Telas e elementos do mockup ([estrada-desktop.html](file:///Users/vinicius.canedo/Documents/trae_projects/estrada_mais_web/estrada-desktop.html)) cobertos:**

- **Sidebar Esquerda Persistente (`[data-od-id="sidebar-nav"]`, linhas 145–261):** Cabeçalho da marca `ESTRADA+`, menu de navegação com contadores de Viagens e Despesas, badge `SYNC OK` (`[data-od-id="sync-status-indicator"]`) e rodapé com mini-perfil do motorista e botão `Desconectar`.
- **Top Bar Persistente (`[data-od-id="top-bar"]`, linhas 269–300):** Breadcrumb da tela ativa, seletor global de competência mensal (`← SETEMBRO 2026 →`) e botões de ação rápida `+ Lançar Despesa` e `+ Registrar Viagem`.
- **Tela 4 — Sistema de Design (`#screen-design-system`, `[data-od-id="screen-design-system"]`, linhas 1013–1244):** Catálogo vivo dos tokens OKLCH/Hex, tipografia (`Oswald`, `Inter`, `JetBrains Mono`), componentes de formulário com unidade inline (`km`, `R$`, `ton`, `km/L`) e matriz de botões.

---

## 2. Regras de Negócio e Critérios de Aceite

### 2.1 Regras de Negócio

1. **RN-DS-01 — Tema Escuro Industrial Fixo ("Night Highway"):** A aplicação opera nativamente no tema escuro industrial (`asphalt-bg: #141416`, `asphalt-surface: #1d1d20`, `amber: #ffb400`, `expense-blue: #7aa8ff`) projetado para conforto visual em cabine noturna e alto contraste diurno.
2. **RN-DS-02 — Hierarquia Tipográfica Obrigatória:**
   - Títulos, cabeçalhos de seção e botões primários utilizam a fonte display `Oswald` (`font-display`) em caixa alta.
   - Textos corridos, labels descritivos e células textuais utilizam `Inter` (`font-body`).
   - Odômetros, quilometragens, litragens, valores monetários (`R$`), médias (`km/L`), placas, RNTRC e números de NF-e utilizam obrigatoriamente fonte monoespaçada `JetBrains Mono` (`font-mono`).
3. **RN-DS-03 — Restrição de 1 Botão Primário Amber por Viewport:** Apenas a ação principal de cada contexto (ex.: `+ Registrar Viagem` na Top Bar ou `Salvar Viagem no Painel` no modal) utiliza o estilo primário sólido `amber` com glow. Ações financeiras/despesas utilizam `expense-blue`.
4. **RN-DS-04 — Seletor Global de Competência Mensal:** O mês/ano selecionado na Top Bar (`YYYY-MM`, padrão: mês corrente ou último mês com dados no seed `2026-09`) é reativo e compartilhado entre todas as telas (Dashboard, Viagens, Despesas e Exportação Contábil).
5. **RN-DS-05 — Indicador de Sincronização (`SYNC OK`):** O badge no rodapé da Sidebar consulta periodicamente (a cada 60s e ao recuperar foco/rede) o endpoint `/api/health` e o estado `navigator.onLine`, exibindo:
   - `SYNC OK` (verde com animação `radar-pulse`) + tempo relativo desde a última verificação bem-sucedida quando online e API saudável;
   - `OFFLINE / ERRO SYNC` (vermelho) quando sem conexão ou falha no `/api/health`.
6. **RN-DS-06 — Visibilidade Condicional da Tela "Sistema de Design":** O item de menu `Sistema de Design [SPEC]` e a rota `/design-system` **DEVEM** ser exibidos e acessíveis apenas em ambiente de desenvolvimento (`import.meta.dev === true`). Em produção (`NODE_ENV === 'production'`), o acesso a `/design-system` redireciona para `/`.

### 2.2 Critérios de Aceite (Checklist Verificável)

- [ ] Tokens de cor (`asphalt`, `amber`, `expense-blue`, `highway`) e famílias tipográficas (`Oswald`, `Inter`, `JetBrains Mono`) configurados em `app/assets/css/main.css` e `app/app.config.ts` sem conflito com `eslint-plugin-better-tailwindcss`.
- [ ] Layout `app/layouts/default.vue` renderiza Sidebar esquerda fixa (`w-64`), Top Bar sticky com breadcrumb dinâmico, seletor de mês/ano (`← MÊS ANO →`) e os dois botões de ação global (`+ Lançar Despesa` e `+ Registrar Viagem`).
- [ ] Badges numéricos no menu lateral (`Viagens` e `Despesas`) refletem o total de registros da competência selecionada.
- [ ] Badge `SYNC OK` na Sidebar reflete o status real de `/api/health` (incluindo status do SQLite) e conectividade do navegador.
- [ ] Componente `AppUnitInput.vue` suporta prefixo (`R$`) ou sufixo (`km`, `ton`, `L`, `km/L`), estados normal, focado (glow âmbar ou azul), erro (borda e sufixo em vermelho `#ef4444` com mensagem em `font-mono`) e desabilitado.
- [ ] Rota `/design-system` renderiza as 4 seções do catálogo vivo idênticas ao mockup quando em modo `dev` e fica oculta na Sidebar em modo `production`.

---

## 3. Modelo de Dados

Este módulo não cria tabelas de domínio próprias, mas define a verificação de saúde do banco SQLite usada pelo indicador `SYNC OK` (`/api/health`).

- **Consulta de verificação (`HealthRepository`):** Executa `SELECT 1 AS ok` via instância Drizzle/`better-sqlite3` em `server/database/client.ts` para atestar que o arquivo SQLite está aberto, legível e operacional.

---

## 4. Schemas Zod (`shared/schemas/`)

### 4.1 `shared/schemas/common.schema.ts` e `shared/schemas/health.schema.ts`

```ts
// shared/schemas/common.schema.ts
import { z } from 'zod'

/**
 * Competência mensal no formato YYYY-MM (reutilizado na Top Bar, Dashboard, Viagens, Despesas e Relatórios)
 */
export const competenceMonthSchema = z
  .string({ error: 'O período de competência é obrigatório.' })
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'O período deve estar no formato AAAA-MM (ex.: 2026-09).')

export const competenceQuerySchema = z.object({
  month: competenceMonthSchema.optional(),
})

export type CompetenceMonth = z.infer<typeof competenceMonthSchema>
export type CompetenceQuery = z.infer<typeof competenceQuerySchema>
```

```ts
// shared/schemas/health.schema.ts
import { z } from 'zod'

export const healthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  database: z.enum(['connected', 'disconnected']),
  timestamp: z.string(),
  navigationCounts: z
    .object({
      tripsCount: z.number().int().nonnegative(),
      expensesCount: z.number().int().nonnegative(),
    })
    .optional(),
})

export type HealthStatusPayload = z.infer<typeof healthResponseSchema>
```

- **Reuso:** `competenceMonthSchema` é reutilizado no seletor da Top Bar (`useCompetencePeriod`) e na validação de query string de `GET /api/health`, `GET /api/trips`, `GET /api/expenses`, `GET /api/reports/dashboard` e `GET /api/reports/csv`.

---

## 5. Endpoints

| Método | Rota          | Schema de Entrada                                          | Formato de Resposta (`200 OK`)                                                                                                       | Códigos de Erro                                             |
| :----: | :------------ | :--------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------- |
| `GET`  | `/api/health` | Query opcional: `competenceQuerySchema` (`?month=2026-09`) | `HealthStatusPayload` (`{ status: 'ok', database: 'connected', timestamp: '...', navigationCounts: { tripsCount, expensesCount } }`) | `503 Service Unavailable` se o SQLite falhar no `SELECT 1`. |

---

## 6. Services e Repositories

### 6.1 `server/repositories/health.repository.ts`

```ts
export interface NavigationCounts {
  tripsCount: number
  expensesCount: number
}

export interface IHealthRepository {
  pingDatabase(): boolean
  getNavigationCounts(driverId: number, month?: string): NavigationCounts
}
```

### 6.2 `server/services/health.service.ts`

```ts
import type { HealthStatusPayload } from '#shared/schemas/health.schema'

export interface IHealthService {
  getHealthStatus(driverId?: number, month?: string): HealthStatusPayload
}
```

- **Responsabilidade:** Verifica a conectividade do SQLite via `healthRepository.pingDatabase()`. Se autenticado (`driverId` presente na sessão), retorna também `navigationCounts` (`tripsCount` e `expensesCount` do mês ativo) para alimentar os badges da Sidebar sem requisição extra. Se o banco falhar, lança `DomainError('SERVICE_UNAVAILABLE', 'Banco de dados indisponível.')`.

---

## 7. Front-end

### 7.1 Tokens CSS e Configuração Tailwind v4 (`app/assets/css/main.css` e `app/app.config.ts`)

```css
/* app/assets/css/main.css */
@import 'tailwindcss';
@import '@nuxt/ui';

@theme {
  --font-display: 'Oswald', sans-serif;
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  --color-asphalt-bg: #141416;
  --color-asphalt-surface: #1d1d20;
  --color-asphalt-surface-light: #252529;
  --color-asphalt-border: #2d2d30;
  --color-asphalt-border-light: #3f3f46;

  --color-amber-default: #ffb400;
  --color-amber-hover: #e6a200;
  --color-amber-dark: #996c00;

  --color-expense-blue: #7aa8ff;
  --color-expense-blue-dark: #4173d6;

  --color-highway-fg: #f3f4f6;
  --color-highway-muted: #9ca3af;
  --color-highway-muted-dark: #6b7280;
  --color-highway-green: #22c55e;
  --color-highway-red: #ef4444;
}
```

### 7.2 Páginas, Layouts, Componentes e Composables

| Tipo           | Caminho                                        | Responsabilidade                                                                                                                                                                                                 |
| :------------- | :--------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Layout**     | `app/layouts/default.vue`                      | Estrutura flex `h-screen overflow-hidden` com `AppSidebar`, `AppTopBar`, `<slot />` e os modais globais de lançamento rápido (`TripFormModal` e `ExpenseFormModal`).                                             |
| **Componente** | `app/components/layout/AppSidebar.vue`         | Marca `ESTRADA+`, linha `.road-divider`, links de navegação (`NuxtLink`), contadores de viagens/despesas, `TelemetrySyncBadge` e rodapé com avatar de iniciais, nome/veículo do motorista e botão `Desconectar`. |
| **Componente** | `app/components/layout/AppTopBar.vue`          | Breadcrumb dinâmico por rota, seletor de mês (`← SETEMBRO 2026 →`) e botões `+ Lançar Despesa` e `+ Registrar Viagem`.                                                                                           |
| **Componente** | `app/components/layout/TelemetrySyncBadge.vue` | Indicador `SYNC OK` com radar-pulse verde, tempo decorrido desde último sync e badge `ONLINE` / `OFFLINE`.                                                                                                       |
| **Componente** | `app/components/ui/AppUnitInput.vue`           | Input estilizado Night Highway com suporte a unidade inline (`prefix` ou `suffix`), fonte `font-mono`, highlight `amber` ou `expense-blue` e estado de erro explícito.                                           |
| **Componente** | `app/components/ui/AppRoadDivider.vue`         | Linha divisória tracejada amarela (`.road-divider`) ou sutil (`.road-divider-subtle`).                                                                                                                           |
| **Página**     | `app/pages/design-system.vue`                  | Catálogo vivo das 4 seções da spec visual (Paleta OKLCH, Hierarquia Tipográfica, Componentes de Formulário com Unidades e Matriz de Botões).                                                                     |
| **Composable** | `app/composables/useCompetencePeriod.ts`       | Gerencia o estado global `selectedMonth` (`YYYY-MM`), formatação por extenso (`SETEMBRO 2026`), ações `previousMonth()` e `nextMonth()`.                                                                         |
| **Composable** | `app/composables/useGlobalModals.ts`           | Controla a abertura/fechamento dos modais globais de Nova Viagem e Nova Despesa a partir da Top Bar ou das páginas.                                                                                              |
| **Composable** | `app/composables/useTelemetrySync.ts`          | Consulta `/api/health` com a competência ativa, expõe `isOnline`, `lastSyncLabel`, `tripsCount`, `expensesCount` e `refreshSync()`.                                                                              |
| **Utils**      | `app/utils/formatters.ts`                      | Funções puras `formatCurrencyFromCents(cents)`, `formatKm(km)`, `formatLitersFromDeciliters(dl)`, `formatKmPerLiterFromMilli(milli)`, `formatDateBr(isoDate)`.                                                   |

---

## 8. Seeds e Factories

Este módulo não possui tabela própria para seed, mas os contadores de navegação (`18` viagens / `42` despesas no mockup ou os totais reais do seed de desenvolvimento) são populados pelos seeds dos módulos `04`, `05` e `06`.

---

## 9. Estratégia de Testes

1. **Unitários (`test/unit/formatters.spec.ts` e `test/unit/health.service.spec.ts`):**
   - Conversão e formatação exata em `pt-BR` de centavos para `R$ 4,82` / `R$ 28.320,00`, decilitros para `722,0 L`, quilômetros para `14.280 km` e datas `2026-09-15` para `15/09/2026` e `15/09`.
   - Navegação de meses em `useCompetencePeriod` (virada de ano `2026-01` → `2025-12` e `2026-12` → `2027-01`).
   - `HealthService`: retorno `status: 'ok'` quando SQLite responde e lançamento de erro `503` quando o banco está inacessível.
2. **Integração / Nuxt (`test/nuxt/layout.spec.ts` e `test/nuxt/unit-input.spec.ts`):**
   - Renderização do `AppSidebar` e `AppTopBar`, troca de mês refletindo no título `OUTUBRO 2026` / `AGOSTO 2026`.
   - Renderização do `AppUnitInput` nos estados normal, focado, erro (`Erro: KM final não pode retroceder`) e desabilitado.
   - Ocultação do item `Sistema de Design` quando em modo produção.
3. **E2E (`test/e2e/navigation.spec.ts`):**
   - Navegação entre Painel Principal, Viagens, Despesas e Configurações atualizando o breadcrumb da Top Bar e o estado ativo na Sidebar; abertura e fechamento dos modais globais pela tecla `Escape`.

---

## 10. Gates Aplicáveis

- **G1 (`format:check`) & G2 (`lint`):** Validação estrita das classes Tailwind v4 via `eslint-plugin-better-tailwindcss` e acessibilidade via `eslint-plugin-vuejs-accessibility` (labels associados aos inputs, `aria-label` nos botões de ícone da Top Bar e Sidebar).
- **G3 (`typecheck`):** Tipagem estrita de props/emits dos componentes base e composables.
- **G4 (Tamanho e Complexidade):** `default.vue`, `AppSidebar.vue`, `AppTopBar.vue` e `design-system.vue` abaixo do limite de 250 linhas por `.vue`.
- **G7 & G8 (`deps:check` & `test:arch`):** Componentes em `app/components/**` não fazem chamadas diretas a `useApiFetch`/`$fetch`, recebendo dados via props ou composables dedicados.
- **G9 (`test:coverage`):** Cobertura `>= 90%` em `shared/utils/` e `server/services/health.service.ts`.

---

## 11. Dependências e Pontos em Aberto

- **Dependências:** Requer `01-configuracao-projeto` concluído.
- **Pontos em Aberto:** Nenhum.
