# driver-settings Specification

## Purpose

Definir os requisitos normativos de configurações cadastrais, alteração autenticada de credenciais e calibração de metas operacionais de telemetria do motorista autônomo (TAC) no Estrada+, garantindo validação isomórfica via Zod 4, precisão inteira no SQLite, sincronização imediata da sessão na `AppSidebar` e reflexo nos indicadores do Painel Principal (`/`).

## Requirements

### Requirement: Carregamento e atualização cadastral do transportador autônomo com reflexo imediato na Sidebar (RN-CFG-01)

O sistema SHALL disponibilizar os dados cadastrais e metas do motorista autenticado em `GET /api/settings` e permitir a atualização de `Nome Completo`, `Registro RNTRC (ANTT)`, `Cavalo Mecânico (Marca / Modelo)` e `Placas (Cavalo / Carreta)` por meio de `PUT /api/settings/profile` validado pelo schema compartilhado `updateDriverProfileSchema` (`shared/schemas/settings.schema.ts`). Ao concluir a atualização, o front-end (`useDriverSettings`) MUST atualizar imediatamente o estado de sessão (`useAuthSession`) sem recarregar a página, recalculando as iniciais do avatar e o resumo do veículo na `AppSidebar`.

#### Scenario: Carregamento SSR e exibição dos dados cadastrais atuais em `/settings`

- **WHEN** o motorista autenticado acessa `/settings`
- **THEN** a página consulta `GET /api/settings` via `useApiFetch` (chave estável `'driver-settings'`), recebe `{ data: DriverSettingsResponse }` (`200 OK`) e preenche os formulários de identificação, credenciais e metas de telemetria com os valores persistidos

#### Scenario: Atualização de nome e veículo persiste no SQLite e atualiza a Sidebar sem reload

- **WHEN** o motorista altera `Nome Completo` e `Cavalo Mecânico` no card `Identificação do Transportador Autônomo` e clica em `Salvar Alterações Cadastrais`
- **THEN** `PUT /api/settings/profile` valida o payload, persiste no SQLite (`drivers`), retorna `200 OK` com `{ data: DriverSettingsResponse }`, exibe toast de confirmação e atualiza imediatamente o nome, as iniciais e o resumo do veículo exibidos na `AppSidebar` sem recarregar a página

#### Scenario: Tentativa de acesso sem sessão ou motorista inexistente em `/api/settings`

- **WHEN** uma requisição chega a `GET /api/settings` ou `PUT /api/settings/*` sem sessão autenticada válida, ou o `driverId` da sessão não existe mais na tabela `drivers`
- **THEN** o servidor retorna HTTP `401 Unauthorized` (`DomainError('UNAUTHORIZED', ...)`) quando não autenticado ou HTTP `404 Not Found` (`DomainError('NOT_FOUND', ...)`) quando o motorista não é encontrado

### Requirement: Alteração autenticada de e-mail e senha com proteção contra colisão e tomada de conta (RN-CFG-02)

O sistema SHALL permitir a atualização de credenciais em `PUT /api/settings/credentials` validado por `updateCredentialsSchema` (`shared/schemas/settings.schema.ts`), normalizando o e-mail com `trim().toLowerCase().pipe(z.email(...))` e verificando unicidade na tabela `drivers` para impedir colisão com outro motorista (`409 Conflict` via `DomainError('CONFLICT', ...)`). O campo `Nova Senha` MUST ser opcional ao alterar apenas o e-mail; quando preenchido, MUST possuir entre `8` e `128` caracteres e exigir o preenchimento da `Senha Atual`, a qual MUST ser verificada contra o `passwordHash` armazenado via `verifyPassword` (lançando `DomainError('UNAUTHORIZED', ...)` HTTP `401` se inválida) antes de gerar e persistir o novo hash `scrypt` (`hashPassword`). A interface de `Segurança & Acesso` MUST ainda exibir a nota informativa sobre desbloqueio biométrico desktop fiel ao mockup.

#### Scenario: Atualização exclusiva de e-mail sem preenchimento de nova senha

- **WHEN** o motorista altera apenas `E-mail de Acesso` mantendo `Nova Senha` vazia e submete `Segurança & Acesso`
- **THEN** `updateCredentialsSchema` aceita o payload sem exigir `Senha Atual`, `PUT /api/settings/credentials` atualiza o e-mail normalizado no SQLite e sincroniza a sessão sem alterar `password_hash`

#### Scenario: Rejeição de e-mail já pertencente a outro motorista com HTTP 409 Conflict

- **WHEN** o motorista tenta atualizar seu e-mail para um endereço já cadastrado por outro registro na tabela `drivers`
- **THEN** `SettingsService.updateCredentials` lança `DomainError('CONFLICT', ...)` mapeado para HTTP `409 Conflict` e exibe mensagem de erro em `pt-BR` sem alterar o cadastro

#### Scenario: Troca de senha exige senha atual válida e persiste novo hash scrypt

- **WHEN** o motorista preenche `Nova Senha` sem `Senha Atual`, ou informa uma `Senha Atual` incorreta, vs. quando informa `Senha Atual` correta e `Nova Senha` válida (`8–128` caracteres)
- **THEN** a ausência de `Senha Atual` falha na validação (`400 Bad Request`), a `Senha Atual` incorreta retorna `401 Unauthorized` (`DomainError('UNAUTHORIZED', ...)`), e a confirmação válida grava novo hash `scrypt` em `drivers.password_hash` permitindo login subsequente com a nova senha

### Requirement: Calibração e validação estrita das metas de telemetria em inteiros escalados (RN-CFG-03)

O sistema SHALL validar em `updateTelemetryTargetsSchema` e persistir em `PUT /api/settings/targets` as metas operacionais respeitando estritamente os limites `1,80 <= targetConsumptionKmL <= 3,20` (`1800` a `3200` milésimos de km/L, passo de `0,05 km/L` na UI) e `3,50 <= maxCostPerKmReais <= 7,00` (`350` a `700` centavos/km, passo de `R$ 0,10/km` na UI). A conversão entre UI/API e SQLite MUST utilizar exclusivamente `toMilliKmL`/`fromMilliKmL` e `toCents`/`fromCents` (`shared/utils/units.ts`) para evitar imprecisão de ponto flutuante (`2.35 -> 2350` e `5.10 -> 510`).

#### Scenario: Persistência exata sem erro de ponto flutuante nos limites válidos

- **WHEN** o motorista ajusta os sliders para `2,35 km/L` (`2.35`) e `R$ 5,10 / km` (`5.10`) e salva em `Metas de Telemetria`
- **THEN** `PUT /api/settings/targets` persiste exatamente `target_consumption_milli_kml = 2350` e `max_cost_per_km_cents = 510` no SQLite e retorna `{ data: { targetConsumptionKmL: 2.35, maxCostPerKmReais: 5.1, ... } }`

#### Scenario: Rejeição de metas fora das faixas operacionais permitidas

- **WHEN** uma requisição envia `targetConsumptionKmL < 1.8` ou `> 3.2`, ou `maxCostPerKmReais < 3.5` ou `> 7.0`
- **THEN** `updateTelemetryTargetsSchema` rejeita a entrada com mensagem em `pt-BR` e `PUT /api/settings/targets` retorna HTTP `400 Bad Request` sem alterar o banco de dados

### Requirement: Reflexo imediato das metas de telemetria no Painel Principal (RN-CFG-04)

A página inicial (`/`, `app/pages/index.vue`) SHALL consumir `/api/settings` com a mesma chave estável `'driver-settings'` (`useDriverSettings`) e exibir os indicadores de meta configurados pelo motorista — incluindo o badge `META: ≤ R$ X,XX` e a referência `Meta X,XX km/L` — de modo que qualquer atualização salva em `/settings` seja refletida imediatamente no Painel Principal.

#### Scenario: Alteração das metas em `/settings` atualiza os indicadores exibidos em `/`

- **WHEN** o motorista altera o teto de custo para `R$ 5,80 / km` e a meta de consumo para `2,60 km/L` em `/settings`, salva as metas e navega para `/`
- **THEN** o Painel Principal exibe imediatamente `META: ≤ R$ 5,80` e `Meta 2,60 km/L` correspondentes aos valores persistidos em `/api/settings`
