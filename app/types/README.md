# Diretório `app/types/`

O diretório `app/types/` armazena interfaces, tipos utilitários e declarações TypeScript que são **exclusivos do contexto da aplicação Vue (`app/`)**. Todos os tipos exportados nos arquivos da raiz deste diretório são **auto-importados** pelo Nuxt 4 em componentes, páginas, composables, plugins e middlewares da camada `app/`.

> Documentação oficial: [Nuxt 4 — `utils` & Types](https://nuxt.com/docs/4.x/directory-structure/app/utils) | [TypeScript Project References](https://nuxt.com/docs/4.x/guide/concepts/typescript#project-references)

## Onde Colocar Cada Tipo no Nuxt 4

O Nuxt 4 utiliza **TypeScript Project References** separados para isolar os ambientes:

| Diretório           | Contexto TypeScript          | Onde Fica Disponível          | Caso de Uso Ideal                                                                                         |
| :------------------ | :--------------------------- | :---------------------------- | :-------------------------------------------------------------------------------------------------------- |
| **`app/types/`**    | `.nuxt/tsconfig.app.json`    | Apenas em `app/`              | Tipos de estado de UI, props compartilhadas, filtros de tela, formulários e augmentations do Vue/Nuxt App |
| **`server/types/`** | `.nuxt/tsconfig.server.json` | Apenas em `server/`           | Tipos internos de banco de dados, modelos de sessão do Nitro, payloads de webhooks e repositórios         |
| **`shared/types/`** | `.nuxt/tsconfig.shared.json` | Em **`app/`** e **`server/`** | Contratos de API (Request/Response DTOs), entidades de domínio e enums compartilhados                     |

## Como os Arquivos São Escaneados

Apenas arquivos localizados **diretamente na raiz** de `app/types/` são escaneados automaticamente para auto-importação de tipos:

```text
app/types/
├── ui.ts               # ✅ Tipos exportados são auto-importados em app/
├── navigation.ts       # ✅ Tipos exportados são auto-importados em app/
└── forms/
    └── checkout.ts     # ❌ Subdiretórios não são auto-importados automaticamente
```

Caso crie subpastas para organização, re-exporte os tipos em `app/types/index.ts`.

## Regras de Criação de Arquivos

1. **Nomenclatura**:
   - Nomeie os arquivos em **kebab-case** com extensão `.ts` ou `.d.ts` (ex.: `ui.ts`, `navigation-menu.ts`, `nuxt-augmentations.d.ts`).
   - Nomeie `interface` e `type` em **PascalCase** (ex.: `NavigationItem`, `ModalSize`).
2. **Apenas Definições de Tipos**:
   - Arquivos em `app/types/` devem conter exclusivamente declarações de tipos (`export interface`, `export type`, `declare module`).
   - **Não** coloque constantes de tempo de execução, classes ou funções aqui — valores executáveis pertencem a `app/utils/` ou `app/composables/`.
3. **Importações de Tipo**:
   - Ao importar um tipo explicitamente em outros arquivos, o ESLint do projeto exige o uso de `import type { ... }` (`@typescript-eslint/consistent-type-imports`).

## Exemplos de Uso

### Definindo Tipos de UI

```ts
// app/types/ui.ts
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost'

export interface BreadcrumbItem {
  label: string
  to?: string
  active?: boolean
}
```

### Augmenting de Tipos do Contexto `app`

Como o Nuxt 4 isola os contextos TypeScript, extensões de módulos da aplicação (`#app`, `vue`) devem ficar dentro de `app/` (como em `app/types/`):

```ts
// app/types/augmentations.d.ts
declare module '#app' {
  interface PageMeta {
    requiresAdmin?: boolean
  }
}

export {}
```

## Boas Práticas

- **Proibido o uso de `any`**: O projeto possui a regra `@typescript-eslint/no-explicit-any: error`. Utilize `unknown`, tipos genéricos (`<T>`) ou união de tipos quando a estrutura for dinâmica.
- **Sempre inclua `export {}` em arquivos `.d.ts` de augmentation**: Isso garante que o TypeScript trate o arquivo como um módulo e não sobrescreva declarações globais.
