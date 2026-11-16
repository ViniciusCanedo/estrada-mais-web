## Context

A spec `03-autenticacao` estabeleceu `DriverRepository`, `AuthService`, sessão selada (`nuxt-session` via `h3`), `useAuthSession()` e `AppSidebar` dinâmica alimentada por `SessionUser` (`initials`, `name`, `vehicleSummary`). A tabela `drivers` no SQLite (`server/database/schema.ts`) já possui todas as colunas cadastrais e de telemetria (`rntrc`, `vehicle_model`, `vehicle_plates`, `target_consumption_milli_kml`, `max_cost_per_km_cents`), mas `/settings` (`app/pages/settings.vue`) ainda renderiza apenas um `AppModulePlaceholder` e não existem endpoints nem schemas Zod para atualizar perfil, credenciais ou metas.

Restrições arquiteturais e normativas aplicáveis:

- Fronteiras estritas verificadas por `dependency-cruiser` + `test/arch/layers.spec.ts`: `app/components/**` não pode importar `useApiFetch` nem executar `$fetch`/`useFetch` diretamente; `server/api/**` deve validar entrada com schemas de `#shared/schemas/` e delegar exclusivamente a `server/services/**` (nunca acessar `server/repositories/**`).
- `eslint.config.mjs` impõe `max-lines: 250` em arquivos `.vue`, `max-lines-per-function: 50`, complexidade ciclomática `<= 10`, acessibilidade (`vuejs-accessibility`) e validação de classes Tailwind CSS v4.
- `vitest.config.ts` exige cobertura `>= 90%` (statements, branches, functions, lines) em `server/services/**`, `server/repositories/**` e `shared/**`.
- Execução paralela do Playwright (`fullyParallel: true`) compartilha `./.data/sqlite/estrada.db` entre workers, exigindo isolamento de dados nos testes E2E que mutam perfil, e-mail, senha ou metas.

## Goals / Non-Goals

**Goals:**

- Implementar schemas Zod isomórficos (`shared/schemas/settings.schema.ts`) compartilhados entre `UForm` no front-end e handlers Nitro em `server/api/settings/*`.
- Estender `DriverRepository` e implementar `SettingsService` com validação de unicidade de e-mail (`409 Conflict`), troca segura de senha (`scrypt` + validação de senha atual `401 Unauthorized`) e conversão exata via `shared/utils/units.ts`.
- Construir os 4 endpoints HTTP autenticados (`/api/settings`, `/api/settings/profile`, `/api/settings/credentials`, `/api/settings/targets`).
- Construir o composable `useDriverSettings.ts`, os 3 componentes (`DriverProfileForm.vue`, `SecurityCredentialsForm.vue`, `TelemetryTargetsCard.vue`), a página `/settings` fiel ao tema Night Highway e a exibição reativa das metas em `/` (`app/pages/index.vue`).
- Garantir sincronização imediata da Sidebar sem reload após salvar perfil/credenciais e cobertura completa de testes unitários, Nuxt e E2E paralelos.

**Non-Goals:**

- Implementar o card `Exportação Contábil` (CSV/PDF) e os cálculos mensais completos de viagens/despesas do Dashboard (escopo da spec `07-painel-principal-e-relatorios`).
- Alterar o schema SQLite ou criar novas migrations.
- Implementar desbloqueio biométrico real em desktop (mantém apenas a nota informativa do mockup).

## Decisions

### 1. Extração de `computeInitials` e `formatDriverSummary` para `shared/utils/driver-profile.ts` e exposição de `setSessionUser`

- **Decisão:** Mover `computeInitials` e `formatDriverSummary` de `server/services/auth.service.ts` para `shared/utils/driver-profile.ts` (mantendo re-exportação em `auth.service.ts` para compatibilidade) e expor `setSessionUser(nextUser)` no `useAuthSession()` além de limpar `'driver-settings'` no `clearNuxtData` durante `login()`/`logout()`.
- **Motivação:** Como `app/**` não pode importar de `server/**` (`dependency-cruiser`), compartilhar as funções puras em `shared/utils/` permite que `useDriverSettings()` atualize `useAuthSession()` imediatamente de forma síncrona a partir do `DriverSettingsResponse` devolvido pelos endpoints `PUT /api/settings/profile` e `PUT /api/settings/credentials`, sem precisar de uma chamada HTTP extra a `/api/auth/me` nem duplicar lógica de formatação de iniciais/resumo (DRY).
- **Alternativas consideradas:** Chamar `fetchSession(true)` após cada save (adiciona round-trip HTTP desnecessário e torna testes de componente dependentes de sincronizar mocks de `/api/auth/me`) ou duplicar cálculo de iniciais no front-end (violaria DRY).

### 2. Refinamento condicional de senha em `updateCredentialsSchema` + validação Zod 4 de e-mail

- **Decisão:** Utilizar `z.string({ error: ... }).trim().toLowerCase().pipe(z.email(...))` para o e-mail e adicionar `.refine(...)` em `updateCredentialsSchema` exigindo `currentPassword` não vazia sempre que `newPassword` estiver preenchida (`newPassword.length > 0`). No `SettingsService.updateCredentials`, validar ainda se `currentPassword` confere com `driver.passwordHash` (`verifyPassword` → `401 Unauthorized`).
- **Motivação:** Em Zod 4, `.pipe(z.email(...))` garante normalização de espaços e caixa antes da validação do formato; o `.refine` torna a regra da RN-CFG-02 isomórfica tanto no `UForm` quanto na API (`400` se senha atual não informada), mantendo o campo opcional quando o motorista altera apenas o e-mail.
- **Alternativas consideradas:** Validar `currentPassword` apenas no servidor (perderia feedback instantâneo em `pt-BR` no `UForm`).

### 3. Componentes de formulário puros sem I/O direto e orquestração em `app/pages/settings.vue` + `useDriverSettings.ts`

- **Decisão:** Manter `DriverProfileForm.vue`, `SecurityCredentialsForm.vue` e `TelemetryTargetsCard.vue` como componentes puros que recebem estado inicial/props (`saving`, `errorMessage`, dados do perfil/metas) e emitem `@submit` tipado, delegando toda chamada HTTP (`useApiFetch` com chave `'driver-settings'` e `$fetch` nas mutações) e exibição de toasts (`useToast()`) para `useDriverSettings.ts` / `app/pages/settings.vue`.
- **Motivação:** Obedece estritamente à regra `components-no-direct-io` do `dependency-cruiser` e `eslint.config.mjs`, mantém cada `.vue` bem abaixo do teto de `250` linhas e facilita testes isolados e de página.
- **Alternativas consideradas:** Colocar `$fetch` ou `useDriverSettings()` dentro dos próprios cards (proibido pelo linter e pelo `dependency-cruiser`).

### 4. Precisão inteira nas metas de telemetria e exibição provisória na Home (`/`)

- **Decisão:** `SettingsService` converte `targetConsumptionKmL` ↔ `targetConsumptionMilliKml` e `maxCostPerKmReais` ↔ `maxCostPerKmCents` exclusivamente via `toMilliKmL`/`fromMilliKmL` e `toCents`/`fromCents` (`shared/utils/units.ts`). A página `app/pages/index.vue` consome `useDriverSettings()` (compartilhando a chave `'driver-settings'`) para renderizar o badge `META: ≤ R$ X,XX` e `Meta X,XX km/L` formatados via `app/utils/formatters.ts`.
- **Motivação:** Elimina erros binários de float como `5.10 * 100 === 509.99999999999994` e permite verificar a RN-CFG-04 na UI desde a Spec 04 sem aguardar a Spec 07.
- **Alternativas consideradas:** Multiplicação inline por `100`/`1000` (proibido por DRY e propenso a erro de precisão) ou criar endpoint separado de metas para a Home (redundante com `GET /api/settings`).

### 5. Isolamento de testes E2E em paralelo no Playwright

- **Decisão:** Em `test/e2e/settings.spec.ts`, provisionar um motorista dedicado via `createTestDriver` (helper SQLite em `test/e2e/helpers/auth.ts`) antes dos testes que alteram nome, veículo, e-mail, senha ou metas, mantendo intacto o registro `Valdir Silveira` usado pelos arquivos paralelos `auth.spec.ts`, `home.spec.ts` e `navigation.spec.ts`.
- **Motivação:** Com `fullyParallel: true`, mutar `Valdir Silveira` em `settings.spec.ts` causaria falhas intermitentes de login ou assertiva de Sidebar nos demais specs E2E.

## Risks / Trade-offs

- **Risco:** Testes Nuxt existentes (`test/nuxt/index.spec.ts` e `test/nuxt/layout.spec.ts`) montam `IndexPage` e `SettingsPage` sem sessão real e sem handler mockado para `/api/settings`, podendo receber `401` ao integrar `useDriverSettings()`. → **Mitigação:** Registrar endpoint mock `/api/settings` em `test/nuxt/index.spec.ts` e `test/nuxt/layout.spec.ts`, além de tratar estado de loading/erro/vazio graciosamente em `settings.vue` e `index.vue`.
- **Risco:** Cache `'driver-settings'` do Nuxt manter dados de um motorista anterior após `logout()` e novo `login()` na mesma aba SPA. → **Mitigação:** Invocar `clearNuxtData('driver-settings')` dentro de `invalidateTelemetryCache()` em `useAuthSession.ts` no `login` e no `logout`.
- **Risco:** `DriverRepository` retornar `undefined` após `update` quando um ID não existe, deixando branches descobertas no coverage `>= 90%`. → **Mitigação:** Centralizar a atualização em helper privado `updateDriverRow` que retorna `DriverRow | undefined` e cobrir casos de motorista existente e inexistente em `driver.repository.spec.ts` e `settings.service.spec.ts`.
