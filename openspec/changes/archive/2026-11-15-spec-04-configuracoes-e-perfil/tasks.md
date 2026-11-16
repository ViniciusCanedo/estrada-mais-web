## 1. Schemas Zod e Utilitários Compartilhados

- [x] 1.1 Criar `shared/utils/driver-profile.ts` com `computeInitials` e `formatDriverSummary` puros e isomórficos (re-exportando em `server/services/auth.service.ts` para reuso sem duplicação)
- [x] 1.2 Criar `shared/schemas/settings.schema.ts` com `updateDriverProfileSchema`, `updateCredentialsSchema` (normalização Zod 4 de e-mail e refinamento condicional exigindo `currentPassword` quando `newPassword` estiver preenchida), `updateTelemetryTargetsSchema`, `driverSettingsResponseSchema` e tipos inferidos em `pt-BR`

## 2. Repository, Service e Endpoints HTTP

- [x] 2.1 Estender `server/repositories/driver.repository.ts` com `updateProfile`, `updateCredentials` e `updateTelemetryTargets` usando helper interno único sobre Drizzle ORM
- [x] 2.2 Implementar `server/services/settings.service.ts` (`getSettings`, `updateProfile`, `updateCredentials` com detecção de colisão `409 Conflict` e validação `scrypt` `401 Unauthorized`, e `updateTelemetryTargets` usando `toMilliKmL`/`fromMilliKmL` e `toCents`/`fromCents`)
- [x] 2.3 Implementar os handlers `server/api/settings/index.get.ts`, `profile.put.ts`, `credentials.put.ts` e `targets.put.ts` com `requireAuthenticatedDriverId`, validação Zod via `#shared/schemas/settings.schema` e `handleServiceError`

## 3. Front-end: Composables, Componentes e Páginas

- [x] 3.1 Estender `app/composables/useAuthSession.ts` expondo `setSessionUser` e invalidando `'driver-settings'` em `login`/`logout`; implementar `app/composables/useDriverSettings.ts` consumindo `/api/settings` via `useApiFetch` (chave `'driver-settings'`) e sincronizando `useAuthSession()` após salvar perfil/credenciais
- [x] 3.2 Criar `app/components/settings/DriverProfileForm.vue`, `SecurityCredentialsForm.vue` (incluindo nota informativa sobre biometria desktop) e `TelemetryTargetsCard.vue` (sliders acessíveis com leitura `font-mono` em tempo real) obedecendo `<= 250` linhas, sem I/O direto e com `vuejs-accessibility`
- [x] 3.3 Atualizar `app/pages/settings.vue` com layout em grid de 3 colunas (estados de loading, erro e vazio + toasts via `useToast()`) e atualizar `app/pages/index.vue` para exibir os indicadores de meta (`META: ≤ R$ ...` e `Meta ... km/L`) vindos de `/api/settings`

## 4. Testes Automatizados e Quality Gate

- [x] 4.1 Atualizar `test/unit/driver.repository.spec.ts` e criar `test/unit/settings.service.spec.ts` cobrindo precisão inteira (`2.35 -> 2350`, `5.10 -> 510`), limites de schema, colisão `409`, senha atual `401`/sucesso e os 4 handlers `server/api/settings/*.ts` com cobertura `>= 90%`
- [x] 4.2 Criar `test/nuxt/settings.spec.ts` e atualizar `test/nuxt/index.spec.ts` e `test/nuxt/layout.spec.ts` cobrindo renderização, sliders, validação `UForm`, sincronização da Sidebar e estados de erro/loading
- [x] 4.3 Criar `test/e2e/settings.spec.ts` usando motorista isolado (`createTestDriver`) para validar alteração cadastral refletindo na Sidebar, troca de senha com novo login e alteração de metas refletindo no badge `META: ≤ R$ ...` em `/`
- [x] 4.4 Executar `npm run format` e `npm run quality` comprovando exit code `0` em todos os gates G1–G13
