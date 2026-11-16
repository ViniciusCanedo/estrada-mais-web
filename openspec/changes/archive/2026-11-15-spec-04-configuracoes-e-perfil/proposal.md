## Why

Após a implementação da autenticação e da Sidebar dinâmica na spec `03-autenticacao`, a rota `/settings` ainda exibe apenas um placeholder sem formulários reais, impedindo o motorista autônomo (TAC) de atualizar seu cadastro veicular, alterar credenciais autenticadas (e-mail/senha) ou calibrar suas metas operacionais de consumo e teto de custo por quilômetro. Esta mudança entrega o módulo completo de Configurações e Perfil (`04-configuracoes-e-perfil`), conectando persistência em SQLite, sincronização imediata da sessão na Sidebar e exibição das metas configuradas no Painel Principal.

## What Changes

- Criar `shared/schemas/settings.schema.ts` com `updateDriverProfileSchema`, `updateCredentialsSchema`, `updateTelemetryTargetsSchema` e `driverSettingsResponseSchema` (mensagens em `pt-BR`, normalização Zod 4 de e-mail e validação condicional exigindo `currentPassword` quando `newPassword` estiver preenchida).
- Estender `server/repositories/driver.repository.ts` com `updateProfile`, `updateCredentials` e `updateTelemetryTargets`, e criar `server/services/settings.service.ts` para regras de negócio, checagem de colisão de e-mail (`409 Conflict`), verificação/hash `scrypt` de senha e conversões inteiras via `shared/utils/units.ts` (`toMilliKmL`/`fromMilliKmL`, `toCents`/`fromCents`).
- Criar os endpoints HTTP `GET /api/settings`, `PUT /api/settings/profile`, `PUT /api/settings/credentials` e `PUT /api/settings/targets` protegidos por `requireAuthenticatedDriverId` e padronizados com `handleServiceError`.
- Criar o composable `app/composables/useDriverSettings.ts` (sincronizando `useAuthSession()` sem reload após alterações de perfil/credenciais) e os componentes `app/components/settings/DriverProfileForm.vue`, `SecurityCredentialsForm.vue` e `TelemetryTargetsCard.vue`.
- Atualizar `app/pages/settings.vue` para compor o grid de 3 colunas fiel ao mockup (preparando a coluna direita para o futuro card de Exportação Contábil da Spec 07) e atualizar `app/pages/index.vue` para exibir os indicadores de meta (`META: ≤ R$ ...` e `Meta ... km/L`) obtidos de `/api/settings`.
- Adicionar cobertura completa de testes unitários, integração Nuxt e E2E Playwright (com motorista de teste isolado para execução paralela).

## Capabilities

### New Capabilities

- `driver-settings`: Gestão autenticada de perfil cadastral do transportador autônomo (RNTRC, veículo e placas) com reflexo imediato na Sidebar, alteração autenticada de e-mail (unicidade `409 Conflict`) e senha (`scrypt` com confirmação da senha atual), definição de metas de telemetria dentro dos limites normativos (`1,80–3,20 km/L` e `R$ 3,50–7,00 / km`) com precisão inteira e reflexo no Painel Principal (`/`).

### Modified Capabilities

<!-- Nenhuma capacidade existente em openspec/specs/ tem seus requisitos alterados nesta mudança -->

## Non-Goals

- Card de **Exportação Contábil** (CSV / PDF) na coluna direita de `/settings` e cálculo completo dos cards comparativos de viagens/despesas do mês no Dashboard (escopo da spec `07-painel-principal-e-relatorios`).
- Desbloqueio biométrico desktop (exibe apenas a nota informativa fiel ao mockup `estrada-desktop.html` linhas 1312–1316).
- Alteração no schema SQLite (`server/database/schema.ts`), pois a tabela `drivers` já contém todas as colunas necessárias (`target_consumption_milli_kml`, `max_cost_per_km_cents`, `rntrc`, `vehicle_model`, `vehicle_plates`).

## Impact

- Contratos compartilhados: `shared/schemas/settings.schema.ts` (reutilizando `shared/utils/units.ts`).
- Servidor (`server/`): `server/repositories/driver.repository.ts`, `server/services/settings.service.ts` e `server/api/settings/{index.get,profile.put,credentials.put,targets.put}.ts`.
- Front-end (`app/`): `app/composables/useAuthSession.ts` (suporte a atualização de perfil em sessão / exportação de helper), `app/composables/useDriverSettings.ts`, `app/components/settings/{DriverProfileForm,SecurityCredentialsForm,TelemetryTargetsCard}.vue`, `app/pages/settings.vue` e `app/pages/index.vue`.
- Testes: `test/unit/driver.repository.spec.ts`, `test/unit/settings.service.spec.ts`, `test/unit/settings.endpoints.spec.ts` (ou dentro de `settings.service.spec.ts`), `test/nuxt/settings.spec.ts`, `test/nuxt/index.spec.ts`, `test/nuxt/layout.spec.ts` e `test/e2e/settings.spec.ts`.
