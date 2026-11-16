## 1. Tokens Night Highway e Configuração Visual

- [x] 1.1 Configurar `app/assets/css/main.css` com `@import 'tailwindcss';`, `@import '@nuxt/ui';`, `@theme` (fontes `Oswald`, `Inter`, `JetBrains Mono` e tokens `asphalt-*`, `amber-*`, `expense-blue*`, `highway-*`), variáveis `--ui-*` em `:root, .dark` e utilitários `@utility road-divider`, `@utility road-divider-subtle` e `@utility radar-pulse`
- [x] 1.2 Configurar `app/app.config.ts` e `nuxt.config.ts` (fontes `@nuxt/fonts`, `ui: { colorMode: false }`, `htmlAttrs` com `lang="pt-BR"` e `class="dark"`) e estilizar `app/app.vue` e `app/error.vue` no tema Night Highway

## 2. Formatadores e Composables Reativos

- [x] 2.1 Implementar `app/utils/formatters.ts` (`formatCurrencyFromCents`, `formatKm`, `formatLitersFromDeciliters`, `formatKmPerLiterFromMilli`, `formatDateBr`, `formatShortDateBr`) em `pt-BR` reutilizando `shared/utils/units.ts`
- [x] 2.2 Implementar `app/composables/useCompetencePeriod.ts` com estado reativo global `selectedMonth` (padrão `'2026-09'`), `formattedMonthLabel`, `previousMonth()`, `nextMonth()`, `setMonth(month)` e helpers puros de virada de ano
- [x] 2.3 Implementar `app/composables/useGlobalModals.ts` (`isTripModalOpen`, `isExpenseModalOpen`, `openTripModal`, `openExpenseModal`, `closeModals`) e `app/composables/useTelemetrySync.ts` (único ponto de chamada a `/api/health?month=...` via `useApiFetch` e `$fetch` com polling de 60s, foco e eventos `online`/`offline`)

## 3. Componentes Base UI e Layout Shell

- [ ] 3.1 Criar `app/components/ui/AppRoadDivider.vue` e `app/components/ui/AppUnitInput.vue` (`defineModel`, `prefix`, `suffix`, `tone`, `error`, `disabled`, `active`, `id` e `<label>` acessível)
- [ ] 3.2 Criar `app/components/layout/TelemetrySyncBadge.vue`, `app/components/layout/AppSidebar.vue` (`ESTRADA+`, links com badges, visibilidade condicional de `Sistema de Design [SPEC]` via `isDev`, mini-perfil e `Desconectar`) e `app/components/layout/AppTopBar.vue` (breadcrumb dinâmico, seletor mensal e botões `+ Lançar Despesa` e `+ Registrar Viagem`)
- [ ] 3.3 Atualizar `app/layouts/default.vue` compondo `AppSidebar`, `AppTopBar`, `<slot />`, `useTelemetrySync()`, `useGlobalModals()` e modais `UModal` globais funcionais com fechamento por `Escape`

## 4. Páginas: Catálogo Design System, Início e Stubs de Navegação

- [ ] 4.1 Implementar `app/pages/design-system.vue` e subcomponentes em `app/components/design-system/` com as 4 seções Night Highway (Paleta, Tipografia, Formulários com Unidades nos 4 estados e Matriz de Botões) e redirecionamento para `/` quando `!import.meta.dev`
- [ ] 4.2 Atualizar `app/pages/index.vue` para o shell Night Highway preservando a verificação de `/api/health` e criar stubs acessíveis em `app/pages/trips.vue`, `app/pages/expenses.vue` e `app/pages/settings.vue`

## 5. Testes Automatizados e Validação

- [ ] 5.1 Criar `test/unit/formatters.spec.ts` cobrindo formatadores `pt-BR` e `useCompetencePeriod` (incluindo virada de ano `2026-01` → `2025-12` e `2026-12` → `2027-01`) e verificar cobertura de `test/unit/health.service.spec.ts`
- [ ] 5.2 Criar `test/nuxt/unit-input.spec.ts`, `test/nuxt/layout.spec.ts` e atualizar `test/nuxt/index.spec.ts` cobrindo `AppUnitInput`, `AppSidebar`, `AppTopBar`, `TelemetrySyncBadge`, `design-system.vue` e visibilidade em `dev` vs produção
- [ ] 5.3 Criar `test/e2e/navigation.spec.ts` e validar `test/e2e/home.spec.ts` cobrindo navegação entre rotas, breadcrumb dinâmico, seletor mensal, modais globais (`Escape`) e redirecionamento de `/design-system` em produção
- [ ] 5.4 Executar `npm run format` (se necessário) e `npm run quality` comprovando exit code `0` em todos os gates G1–G13
