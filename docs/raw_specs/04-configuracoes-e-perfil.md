# 04 — Especificação Técnica: Configurações e Perfil do Motorista (`configuracoes-e-perfil`)

## 1. Visão Geral

Este módulo gerencia os dados cadastrais do Transportador Autônomo de Cargas (TAC), a identificação do conjunto veicular (cavalo mecânico e placas), a alteração autenticada de credenciais de acesso (e-mail e senha) e os **parâmetros/metas operacionais de telemetria** (`Meta de Consumo km/L` e `Teto de Custo Operacional R$/km`), que alimentam a Sidebar e os indicadores comparativos do Painel Principal.

**Telas e elementos do mockup ([estrada-desktop.html](file:///Users/vinicius.canedo/Documents/trae_projects/estrada_mais_web/estrada-desktop.html)) cobertos:**

- **Tela 5 — Configurações (`#screen-settings`, `[data-od-id="screen-settings"]`, linhas 1249–1367):**
  - Card **"Identificação do Transportador Autônomo"** (linhas 1262–1292): `Nome Completo`, `Registro RNTRC (ANTT)`, `Cavalo Mecânico (Marca / Modelo)`, `Placas (Cavalo / Carreta)` e botão `Salvar Alterações Cadastrais`.
  - Card **"Segurança & Acesso"** (linhas 1295–1317): `E-mail de Acesso`, `Nova Senha` e nota informativa sobre desbloqueio biométrico desktop.
  - Card **"Metas de Telemetria"** (linhas 1325–1345): sliders interativos de `Meta Consumo (km/L)` (`1,80` a `3,20`, passo `0,05`, padrão `2,35 km/L`) e `Teto de Custo Operacional` (`R$ 3,50` a `R$ 7,00 / km`, passo `0,10`, padrão `R$ 5,10 / km`).
- **Mini-Perfil na Sidebar (linhas 244–253):** Avatar com iniciais (`VS`), nome (`Valdir Silveira`) e resumo do caminhão (`Scania R450 • 6x2`).

_(Nota: O card "Exportação Contábil" presente na coluna direita da tela de Configurações é especificado em conjunto com o módulo `07-painel-principal-e-relatorios`, mas seu componente é montado nesta página `/settings`)._

---

## 2. Regras de Negócio e Critérios de Aceite

### 2.1 Regras de Negócio

1. **RN-CFG-01 — Atualização Cadastral e Reflexo Imediato na Sidebar:** Ao salvar `Nome Completo`, `Registro RNTRC`, `Cavalo Mecânico` e `Placas`, o estado da sessão (`useAuthSession`) é atualizado imediatamente, recalculando as iniciais do avatar (primeira letra do primeiro e do último nome, ex.: `Valdir Silveira` → `VS`) e o resumo do veículo na Sidebar.
2. **RN-CFG-02 — Alteração de E-mail e Senha Autenticada:**
   - O e-mail deve ser único na tabela `drivers` (normalizado em `lowercase` e `trim`). Se já estiver em uso por outro registro, retorna `409 Conflict`.
   - O campo `Nova Senha` na tela de Configurações é opcional ao alterar apenas o e-mail; porém, se preenchido, deve ter entre 8 e 128 caracteres e exige a confirmação da `Senha Atual` (ou validação da sessão recente) para impedir tomada de conta.
3. **RN-CFG-03 — Limites das Metas de Telemetria:**
   - `Meta Consumo (km/L)`: deve estar entre `1,80 km/L` (`1800` milésimos) e `3,20 km/L` (`3200` milésimos), em incrementos de `0,05 km/L` (`50` milésimos).
   - `Teto de Custo Operacional (R$/km)`: deve estar entre `R$ 3,50/km` (`350` centavos) e `R$ 7,00/km` (`700` centavos), em incrementos de `R$ 0,10/km` (`10` centavos).
4. **RN-CFG-04 — Impacto das Metas no Painel Principal:** Qualquer alteração nas metas de telemetria atualiza imediatamente o badge `META: ≤ R$ X,XX` no Hero Card do Dashboard e o status de atingimento da meta no card `Média Diesel` (`Meta X,XX superada` ou `Abaixo da meta X,XX`).

### 2.2 Critérios de Aceite (Checklist Verificável)

- [ ] Página `/settings` carrega os dados atuais do motorista autenticado via SSR (`useApiFetch`).
- [ ] Alterar nome ou modelo do caminhão e clicar em `Salvar Alterações Cadastrais` persiste no SQLite, exibe toast de confirmação e atualiza o rodapé da Sidebar sem recarregar a página.
- [ ] Alterar os sliders de `Meta Consumo (km/L)` e `Teto de Custo Operacional` persiste os novos limites e reflete nos indicadores do Dashboard (`/`).
- [ ] Alterar a senha na seção `Segurança & Acesso` grava o novo `password_hash` (`scrypt`), permitindo login subsequente com a nova senha.
- [ ] Nota informativa sobre desbloqueio biométrico desktop é exibida fielmente ao mockup.

---

## 3. Modelo de Dados (`server/database/schema.ts`)

Utiliza a tabela `drivers` definida em `server/database/schema.ts` (compartilhada com `03-autenticacao`):

| Coluna                         | Tipo Drizzle (SQLite)                     | Constraints                 | Descrição                                                       |
| :----------------------------- | :---------------------------------------- | :-------------------------- | :-------------------------------------------------------------- |
| `id`                           | `integer('id')`                           | `PRIMARY KEY AUTOINCREMENT` | Identificador único do motorista                                |
| `name`                         | `text('name')`                            | `NOT NULL`                  | Nome completo (ex.: `'Valdir Silveira'`)                        |
| `email`                        | `text('email')`                           | `NOT NULL UNIQUE`           | E-mail de acesso                                                |
| `password_hash`                | `text('password_hash')`                   | `NOT NULL`                  | Hash `scrypt` da senha                                          |
| `rntrc`                        | `text('rntrc')`                           | `NOT NULL`                  | Registro RNTRC na ANTT (ex.: `'58.912.440-TAC'`)                |
| `vehicle_model`                | `text('vehicle_model')`                   | `NOT NULL`                  | Marca/modelo do cavalo mecânico                                 |
| `vehicle_plates`               | `text('vehicle_plates')`                  | `NOT NULL`                  | Placas cavalo / carreta (`'BRA-2E19 / CUR-4901'`)               |
| `target_consumption_milli_kml` | `integer('target_consumption_milli_kml')` | `NOT NULL DEFAULT 2350`     | Meta de consumo em milésimos de km/L (`2350` = `2,35 km/L`)     |
| `max_cost_per_km_cents`        | `integer('max_cost_per_km_cents')`        | `NOT NULL DEFAULT 510`      | Teto de custo operacional em centavos/km (`510` = `R$ 5,10/km`) |
| `created_at`                   | `text('created_at')`                      | `NOT NULL`                  | Timestamp ISO-8601                                              |
| `updated_at`                   | `text('updated_at')`                      | `NOT NULL`                  | Timestamp ISO-8601                                              |

---

## 4. Schemas Zod (`shared/schemas/settings.schema.ts`)

```ts
// shared/schemas/settings.schema.ts
import { z } from 'zod'

export const updateDriverProfileSchema = z.object({
  name: z
    .string({ error: 'O nome completo é obrigatório.' })
    .trim()
    .min(3, 'O nome deve ter pelo menos 3 caracteres.')
    .max(120, 'O nome deve ter no máximo 120 caracteres.'),
  rntrc: z
    .string({ error: 'O registro RNTRC é obrigatório.' })
    .trim()
    .min(5, 'Informe um registro RNTRC válido (ex.: 58.912.440-TAC).')
    .max(30, 'O registro RNTRC deve ter no máximo 30 caracteres.'),
  vehicleModel: z
    .string({ error: 'O modelo do cavalo mecânico é obrigatório.' })
    .trim()
    .min(3, 'Informe a marca e modelo do cavalo mecânico.')
    .max(120, 'O modelo deve ter no máximo 120 caracteres.'),
  vehiclePlates: z
    .string({ error: 'As placas do veículo são obrigatórias.' })
    .trim()
    .min(7, 'Informe ao menos a placa do cavalo mecânico (ex.: BRA-2E19).')
    .max(40, 'O campo de placas deve ter no máximo 40 caracteres.'),
})

export const updateCredentialsSchema = z.object({
  email: z.email('Informe um endereço de e-mail válido.').trim().toLowerCase(),
  currentPassword: z.string().optional(),
  newPassword: z
    .string()
    .min(8, 'A nova senha deve ter no mínimo 8 caracteres.')
    .max(128, 'A nova senha deve ter no máximo 128 caracteres.')
    .optional()
    .or(z.literal('')),
})

export const updateTelemetryTargetsSchema = z.object({
  targetConsumptionKmL: z
    .number({ error: 'A meta de consumo é obrigatória.' })
    .min(1.8, 'A meta mínima de consumo é 1,80 km/L.')
    .max(3.2, 'A meta máxima de consumo é 3,20 km/L.'),
  maxCostPerKmReais: z
    .number({ error: 'O teto de custo operacional é obrigatório.' })
    .min(3.5, 'O teto mínimo é R$ 3,50 / km.')
    .max(7.0, 'O teto máximo é R$ 7,00 / km.'),
})

export const driverSettingsResponseSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  email: z.email(),
  rntrc: z.string(),
  vehicleModel: z.string(),
  vehiclePlates: z.string(),
  targetConsumptionKmL: z.number(),
  maxCostPerKmReais: z.number(),
  updatedAt: z.string(),
})

export type UpdateDriverProfileInput = z.infer<typeof updateDriverProfileSchema>
export type UpdateCredentialsInput = z.infer<typeof updateCredentialsSchema>
export type UpdateTelemetryTargetsInput = z.infer<typeof updateTelemetryTargetsSchema>
export type DriverSettingsResponse = z.infer<typeof driverSettingsResponseSchema>
```

- **Reuso:**
  - `updateDriverProfileSchema`: usado em `DriverProfileForm.vue` e `PUT /api/settings/profile`.
  - `updateCredentialsSchema`: usado em `SecurityCredentialsForm.vue` e `PUT /api/settings/credentials`.
  - `updateTelemetryTargetsSchema`: usado em `TelemetryTargetsCard.vue` e `PUT /api/settings/targets`.

---

## 5. Endpoints

| Método | Rota                        | Schema de Entrada                     | Formato de Resposta (`200 OK`)                                              | Códigos de Erro                                                                             |
| :----: | :-------------------------- | :------------------------------------ | :-------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------ |
| `GET`  | `/api/settings`             | Nenhum (usa `driverId` da sessão)     | `{ data: DriverSettingsResponse }`                                          | `401` (não autenticado), `404` (motorista não encontrado)                                   |
| `PUT`  | `/api/settings/profile`     | `updateDriverProfileSchema` (body)    | `{ data: DriverSettingsResponse }` (e atualiza dados de exibição na sessão) | `400` (validação), `401` (não autenticado)                                                  |
| `PUT`  | `/api/settings/credentials` | `updateCredentialsSchema` (body)      | `{ data: DriverSettingsResponse }`                                          | `400` (validação), `401` (senha atual inválida / não autenticado), `409` (e-mail já em uso) |
| `PUT`  | `/api/settings/targets`     | `updateTelemetryTargetsSchema` (body) | `{ data: DriverSettingsResponse }`                                          | `400` (fora da faixa `1.8–3.2` ou `3.5–7.0`), `401` (não autenticado)                       |

---

## 6. Services e Repositories

### 6.1 `server/repositories/driver.repository.ts`

```ts
export interface IDriverRepository {
  findById(id: number): DriverRow | undefined
  findByEmail(email: string): DriverRow | undefined
  updateProfile(
    id: number,
    data: {
      name: string
      rntrc: string
      vehicleModel: string
      vehiclePlates: string
      updatedAt: string
    },
  ): DriverRow
  updateCredentials(
    id: number,
    data: { email: string; passwordHash?: string; updatedAt: string },
  ): DriverRow
  updateTelemetryTargets(
    id: number,
    data: { targetConsumptionMilliKml: number; maxCostPerKmCents: number; updatedAt: string },
  ): DriverRow
}
```

### 6.2 `server/services/settings.service.ts`

```ts
export interface ISettingsService {
  getSettings(driverId: number): DriverSettingsResponse
  updateProfile(driverId: number, input: UpdateDriverProfileInput): DriverSettingsResponse
  updateCredentials(
    driverId: number,
    input: UpdateCredentialsInput,
  ): Promise<DriverSettingsResponse>
  updateTelemetryTargets(
    driverId: number,
    input: UpdateTelemetryTargetsInput,
  ): DriverSettingsResponse
}
```

- **Responsabilidades:**
  - Converte `targetConsumptionKmL` (`2.35`) ↔ `targetConsumptionMilliKml` (`2350`) e `maxCostPerKmReais` (`5.10`) ↔ `maxCostPerKmCents` (`510`) usando funções puras de `shared/utils/units.ts`.
  - Na troca de e-mail/senha, verifica colisão de e-mail e gera hash `scrypt` se `newPassword` foi informada.

---

## 7. Front-end

### 7.1 Páginas, Componentes e Composables

| Tipo           | Caminho                                               | Responsabilidade                                                                                                                                           |
| :------------- | :---------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Página**     | `app/pages/settings.vue`                              | Layout em grid de 3 colunas (`lg:col-span-2` para Perfil + Segurança; coluna direita para Metas de Telemetria + Exportação Contábil).                      |
| **Componente** | `app/components/settings/DriverProfileForm.vue`       | Formulário `UForm` com `:schema="updateDriverProfileSchema"` e botão `Salvar Alterações Cadastrais`.                                                       |
| **Componente** | `app/components/settings/SecurityCredentialsForm.vue` | Formulário `UForm` com `:schema="updateCredentialsSchema"` + banner informativo sobre biometria desktop.                                                   |
| **Componente** | `app/components/settings/TelemetryTargetsCard.vue`    | Sliders de `Meta Consumo (km/L)` e `Teto de Custo Operacional (R$/km)` com leitura em tempo real em `font-mono` e salvamento.                              |
| **Composable** | `app/composables/useDriverSettings.ts`                | Carrega configurações via `useApiFetch('/settings')` e expõe mutações `saveProfile`, `saveCredentials` e `saveTargets` sincronizando o `useAuthSession()`. |

---

## 8. Seeds e Factories

Reutiliza o seed do motorista padrão (`Valdir Silveira`, RNTRC `58.912.440-TAC`, `Scania R450 Highline 6x2 (2021)`, placas `BRA-2E19 / CUR-4901`, meta `2350` = `2,35 km/L`, teto `510` = `R$ 5,10/km`) definido em `server/database/seed.ts`.

---

## 9. Estratégia de Testes

1. **Unitários (`test/unit/settings.service.spec.ts`):**
   - Conversão exata de metas (`2.35` → `2350` e `5.10` → `510`) sem erro de arredondamento float.
   - Rejeição de valores fora dos limites nos schemas (`targetConsumptionKmL < 1.8` ou `> 3.2`, `maxCostPerKmReais < 3.5` ou `> 7.0`).
   - Atualização de perfil e geração de iniciais/resumo do veículo (`"Scania R450 Highline 6x2 (2021)"` → `"Scania R450 • 6x2"`).
   - Tentativa de atualizar e-mail para um e-mail já pertencente a outro motorista (`409 Conflict`).
2. **Integração (`test/nuxt/settings.spec.ts`):**
   - Renderização dos valores iniciais na página `/settings`, submissão de alterações cadastrais e atualização dos sliders de metas.
3. **E2E (`test/e2e/settings.spec.ts`):**
   - Alteração do nome/veículo e da meta de custo operacional em `/settings` e verificação imediata do novo valor na Sidebar e no badge `META: ≤ R$ ...` do Painel Principal (`/`).

---

## 10. Gates Aplicáveis

- **G1–G4:** Formatação, lint, tipagem estrita e tamanho de componentes `<= 250` linhas.
- **G7 & G8 (`deps:check` & `test:arch`):** Isolamento `api` → `services` → `repositories` e uso exclusivo dos schemas em `shared/schemas/settings.schema.ts`.
- **G9 (`test:coverage`):** Cobertura `>= 90%` em `server/services/settings.service.ts`, `server/repositories/driver.repository.ts` e `shared/schemas/settings.schema.ts`.

---

## 11. Dependências e Pontos em Aberto

- **Dependências:** Depende de `01-configuracao-projeto`, `02-design-system-e-layout` e `03-autenticacao`.
- **Pontos em Aberto:** Nenhum.
