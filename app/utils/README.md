# Diretório `app/utils/`

O diretório `app/utils/` armazena funções utilitárias e helpers puros que são **auto-importados** em toda a camada Vue da aplicação (`app/components/`, `app/pages/`, `app/composables/`, `app/plugins/` e `app/middleware/`).

> Documentação oficial: [Nuxt 4 — `utils`](https://nuxt.com/docs/4.x/directory-structure/app/utils)

## Distinção Semântica: `app/utils/` vs. `app/composables/` vs. `shared/utils/`

- **`app/utils/`**: Funções auxiliares **sem estado reativo** e **sem dependência do ciclo de vida do Vue**, usadas apenas na interface (`app/`), como formatadores de interface, máscaras de input, helpers de DOM ou cálculos visuais.
- **`app/composables/`**: Funções que usam reatividade (`ref`, `computed`, `useState`) ou contexto do Nuxt (`useNuxtApp`, `useFetch`).
- **`shared/utils/`**: Funções utilitárias puras que precisam ser executadas **tanto no Vue (`app/`) quanto no servidor Nitro (`server/`)** (ex.: validadores de CPF/CNPJ, normalização de strings, formatação universal).

## Como os Arquivos São Escaneados

Assim como em `app/composables/`, o Nuxt escaneia apenas os arquivos na **raiz** de `app/utils/`:

```text
app/utils/
├── formatters.ts       # ✅ Escaneado e auto-importado em app/
├── dom.ts              # ✅ Escaneado e auto-importado em app/
└── index.ts            # ✅ Escaneado (use para re-exportar subpastas, se houver)
```

## Regras de Criação de Arquivos

1. **Nomenclatura**:
   - Nomeie os arquivos em **kebab-case** ou **camelCase** (ex.: `format-currency.ts` ou `formatCurrency.ts`).
   - Nomeie as funções exportadas em **camelCase** usando verbos descritivos (ex.: `formatCurrency`, ` copyToClipboard`, `scrollToElement`).
   - **Não** utilize o prefixo `use` em funções de `app/utils/` (o prefixo `use` é reservado exclusivamente para composables em `app/composables/`).
2. **Funções Puras e Tipadas**:
   - Declare tipos explícitos para todos os parâmetros e para o retorno da função.
   - Prefira **named exports** (`export function formatCurrency(...)`) para permitir que um mesmo arquivo agrupe funções correlatas (ex.: `app/utils/currency.ts`).

## Exemplo de Uso

```ts
// app/utils/currency.ts
const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export function formatCurrencyBRL(value: number): string {
  return brlFormatter.format(value)
}
```

Uso direto em qualquer componente ou página sem necessidade de `import`:

```vue
<!-- app/pages/index.vue -->
<template>
  <span>{{ formatCurrencyBRL(149.9) }}</span>
</template>
```

## Boas Práticas

- **Escopo Exclusivo do App**: Utilitários em `app/utils/` **não** estão disponíveis em `server/`. Se uma função também for útil no backend Nitro, crie-a em `shared/utils/`.
- **Cuidado com APIs do Navegador (`window`, `document`)**: Se um utilitário acessar APIs exclusivas do browser, garanta que ele só seja invocado em eventos de interação no cliente ou proteja o acesso com `if (import.meta.client)`.
- **Testabilidade**: Como funções em `app/utils/` não dependem do runtime do Nuxt, elas podem (e devem) ser testadas rapidamente no ambiente Node em `test/unit/`.
