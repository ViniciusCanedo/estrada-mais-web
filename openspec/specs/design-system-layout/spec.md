# design-system-layout Specification

## Purpose

Definir o sistema de design industrial **"Night Highway"** do Estrada+, a hierarquia tipográfica, os formatadores `pt-BR`, o seletor global reativo de competência mensal, o indicador de sincronização `SYNC OK` via `/api/health`, os componentes base (`AppUnitInput`, `AppRoadDivider`, `TelemetrySyncBadge`, `AppSidebar`, `AppTopBar`), o shell persistente `default.vue` e o catálogo vivo `/design-system` restrito ao ambiente de desenvolvimento.

## Requirements

### Requirement: Tema escuro industrial fixo Night Highway e tokens Tailwind CSS v4 (RN-DS-01)

O sistema SHALL operar nativamente no tema escuro industrial fixo **"Night Highway"** (`--color-asphalt-bg: #141416`, `--color-asphalt-surface: #1d1d20`, `--color-asphalt-surface-light: #252529`, `--color-asphalt-border: #2d2d30`, `--color-asphalt-border-light: #3f3f46`, `--color-amber-default: #ffb400`, `--color-amber-hover: #e6a200`, `--color-amber-dark: #996c00`, `--color-expense-blue: #7aa8ff`, `--color-expense-blue-dark: #4173d6`, `--color-highway-fg: #f3f4f6`, `--color-highway-muted: #9ca3af`, `--color-highway-muted-dark: #6b7280`, `--color-highway-green: #22c55e`, `--color-highway-red: #ef4444`), configurando `app/assets/css/main.css` (incluindo `@utility road-divider`, `@utility road-divider-subtle` e `@utility radar-pulse`), `app/app.config.ts` e `nuxt.config.ts` com `ui.colorMode = false` e classe `dark` aplicada ao documento HTML.

#### Scenario: Tokens Night Highway e utilitários customizados reconhecidos pelo Tailwind v4 e ESLint

- **WHEN** `app/assets/css/main.css`, `app/app.config.ts` e `nuxt.config.ts` são analisados pelo `eslint-plugin-better-tailwindcss` e compilados pelo build Nuxt
- **THEN** todas as cores Night Highway, variáveis `--ui-*` do `@nuxt/ui` e utilitários `@utility road-divider`, `@utility road-divider-subtle` e `@utility radar-pulse` são resolvidos sem erros de classe desconhecida e o documento HTML mantém tema escuro fixo (`lang="pt-BR"` e classe `dark`)

### Requirement: Hierarquia tipográfica obrigatória e formatadores pt-BR (RN-DS-02)

O sistema SHALL configurar as famílias tipográficas `Oswald` (`--font-display`), `Inter` (`--font-sans` / `--font-body`) e `JetBrains Mono` (`--font-mono`) via `@nuxt/fonts` e `@theme`, aplicando caixa alta display em títulos e CTAs principais, `Inter` em textos de interface e `JetBrains Mono` em odômetros, quilometragens, litragens, médias `km/L`, valores monetários (`R$`), placas, RNTRC e NF-e; além disso, `app/utils/formatters.ts` MUST fornecer `formatCurrencyFromCents`, `formatKm`, `formatLitersFromDeciliters`, `formatKmPerLiterFromMilli`, `formatDateBr` e `formatShortDateBr` em `pt-BR` a partir das escalas inteiras definidas em `shared/utils/units.ts`.

#### Scenario: Formatação determinística em pt-BR de inteiros escalados e datas ISO

- **WHEN** `formatCurrencyFromCents(482)`, `formatCurrencyFromCents(2832000)`, `formatKm(14280)`, `formatLitersFromDeciliters(7220)`, `formatKmPerLiterFromMilli(2420)`, `formatDateBr('2026-09-15')` e `formatShortDateBr('2026-09-15')` são executados
- **THEN** retornam respectivamente `'R$ 4,82'`, `'R$ 28.320,00'`, `'14.280 km'`, `'722,0 L'`, `'2,42 km/L'`, `'15/09/2026'` e `'15/09'`

### Requirement: Restrição de ação primária Amber e componente AppUnitInput (RN-DS-03)

Cada contexto de tela ou modal SHALL restringir o estilo sólido primário `amber` (`bg-amber-default` com glow) a no máximo **1** ação principal (ex.: `+ Registrar Viagem` na Top Bar), utilizando `expense-blue` para ações de despesa (`+ Lançar Despesa`); o componente `app/components/ui/AppUnitInput.vue` MUST suportar `defineModel`, `prefix` (`R$`) ou `suffix` (`km`, `ton`, `L`, `km/L`), `tone` (`'amber' | 'expense'`), estado ativo/focado, erro (`error?: string` exibido em `font-mono` vermelho `#ef4444` com `role="alert"`), `disabled` e `<label>` acessível vinculado via `for`/`id`.

#### Scenario: Renderização do AppUnitInput nos estados padrão, com erro e desabilitado

- **WHEN** `AppUnitInput` é montado com `label`, `prefix` ou `suffix`, e alterna entre os estados normal, erro (`error: 'Erro: KM final não pode retroceder'`) e `disabled: true`
- **THEN** vincula `<label for>` ao `<input id>`, exibe prefixo/sufixo em `font-mono`, aplica destaque vermelho com mensagem `Erro: KM final não pode retroceder` no estado de erro e bloqueia edição quando `disabled` é verdadeiro

### Requirement: Seletor global reativo de competência mensal e shell persistente (RN-DS-04)

O composable `app/composables/useCompetencePeriod.ts` SHALL gerenciar de forma reativa e compartilhada o período `selectedMonth` no formato `AAAA-MM` validado por `competenceMonthSchema` (padrão `'2026-09'`), expondo `formattedMonthLabel` (`SETEMBRO 2026`), `previousMonth()`, `nextMonth()` e `setMonth(month)` com virada de ano correta (`2026-01` ↔ `2025-12` e `2026-12` ↔ `2027-01`); o layout `app/layouts/default.vue` MUST compor `AppSidebar` (`w-64`), `AppTopBar` (breadcrumb dinâmico por rota, seletor mensal e botões globais `+ Lançar Despesa` e `+ Registrar Viagem`) e modais `UModal` globais controlados por `app/composables/useGlobalModals.ts` com fechamento via botão e tecla `Escape`.

#### Scenario: Navegação de competência mensal com virada de ano e atualização da Top Bar

- **WHEN** o usuário aciona `previousMonth()` a partir de `'2026-01'` e `nextMonth()` a partir de `'2026-12'`, ou clica nos botões `←` e `→` na `AppTopBar` a partir de `'2026-09'`
- **THEN** os períodos resultam respectivamente em `'2025-12'`, `'2027-01'`, e a Top Bar atualiza o rótulo visível entre `'AGOSTO 2026'`, `'SETEMBRO 2026'` e `'OUTUBRO 2026'`

#### Scenario: Navegação entre rotas, breadcrumb dinâmico e modais globais por teclado

- **WHEN** o usuário navega entre `/`, `/trips`, `/expenses` e `/settings`, abre os modais `+ Lançar Despesa` ou `+ Registrar Viagem` e pressiona `Escape`
- **THEN** a Sidebar destaca a rota ativa, o breadcrumb da Top Bar reflete a tela correspondente, cada modal abre com título em `pt-BR` e fecha ao pressionar `Escape`

### Requirement: Indicador de sincronização de telemetria SYNC OK via `/api/health` (RN-DS-05)

O composable `app/composables/useTelemetrySync.ts` SHALL ser o único ponto de consulta ao endpoint `/api/health?month=AAAA-MM` (via `useApiFetch` na carga inicial/troca de competência e `$fetch` no refresh periódico a cada `60s`, foco da janela e eventos `online`/`offline` do navegador), mantendo os componentes visuais livres de I/O direto; o componente `app/components/layout/TelemetrySyncBadge.vue` MUST exibir `SYNC OK` (indicador verde com `radar-pulse`) e tempo relativo quando online e saudável, ou `OFFLINE / ERRO SYNC` (vermelho) quando desconectado ou quando `/api/health` falhar, além de propagar `navigationCounts` (`tripsCount`, `expensesCount`) para os badges da `AppSidebar`.

#### Scenario: Exibição de SYNC OK com contadores vs. OFFLINE / ERRO SYNC em falha

- **WHEN** `/api/health` responde `200 OK` com `{ status: 'ok', database: 'connected', navigationCounts: { tripsCount: 18, expensesCount: 42 } }` estando o navegador online, e posteriormente falha com `503` ou o navegador fica offline
- **THEN** o badge exibe `SYNC OK` com indicador verde e os contadores `18` e `42` na Sidebar no estado saudável, alternando para `OFFLINE / ERRO SYNC` em vermelho quando offline ou com erro na API

### Requirement: Visibilidade condicional do catálogo Sistema de Design (RN-DS-06)

A página `app/pages/design-system.vue` SHALL renderizar as 4 seções do catálogo vivo Night Highway (Paleta de Cores OKLCH, Hierarquia Tipográfica, Componentes de Formulário com Unidades nos 4 estados e Sistema de Botões) somente em desenvolvimento (`import.meta.dev === true`), e o item `Sistema de Design [SPEC]` na `AppSidebar` MUST ficar oculto em produção (`isDev === false`), redirecionando acessos diretos a `/design-system` para `/` fora de desenvolvimento.

#### Scenario: Ocultação e redirecionamento da tela Sistema de Design em produção

- **WHEN** a aplicação executa em modo de produção (`import.meta.dev === false` / `isDev === false`)
- **THEN** o item `Sistema de Design [SPEC]` não é renderizado na `AppSidebar` e navegar para `/design-system` redireciona para `/`
