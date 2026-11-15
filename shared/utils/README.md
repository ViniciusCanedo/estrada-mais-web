# Diretório `shared/utils/`

O diretório `shared/utils/` armazena funções utilitárias puras e isomórficas que são **auto-importadas tanto na aplicação Vue (`app/`) quanto no servidor Nitro (`server/`)**.

> Documentação oficial: [Nuxt 4 — `shared` (`shared/utils`)](https://nuxt.com/docs/4.x/directory-structure/shared#usage)

## Quando Usar `shared/utils/`

Coloque em `shared/utils/` funções puras que não dependem de APIs exclusivas do navegador nem de APIs exclusivas do Node/Nitro, tais como:

- Validadores e higienizadores de dados (CPF, CNPJ, CEP, e-mail, slugs).
- Formatadores universais de strings, números e datas (`capitalize`, `slugify`).
- Schemas de validação compartilhados entre formulários do cliente e rotas de API do servidor.
- Cálculos de regras de negócio puras (descontos, taxas, conversões).

## Como os Arquivos São Escaneados

Apenas arquivos localizados **diretamente na raiz** de `shared/utils/` são auto-importados:

```text
shared/utils/
├── string.ts           # ✅ Auto-importado em app/ e server/
├── validators.ts       # ✅ Auto-importado em app/ e server/
└── math/
    └── round.ts        # ❌ Não auto-importado (re-exporte em index.ts ou use '#shared/utils/math/round')
```

## Regras de Criação de Arquivos

1. **Nomenclatura**:
   - Nomeie os arquivos em **kebab-case** ou **camelCase** (ex.: `string-formatters.ts`, `validators.ts`).
   - Nomeie as funções exportadas em **camelCase** usando verbos ou substantivos descritivos (`capitalize`, `isValidCpf`, `slugify`).
   - **Nunca** use o prefixo `use` (exclusivo para composables em `app/composables/`).
2. **Código 100% Universal (Isomórfico)**:
   - **Proibido** usar APIs do DOM (`window`, `document`, `localStorage`).
   - **Proibido** usar APIs do Vue (`ref`, `computed`) ou do Nuxt/Nitro (`useNuxtApp`, `useRuntimeConfig`, `defineEventHandler`).
   - **Proibido** usar módulos nativos exclusivos de servidor (`node:fs`, `node:path`, `process.env`), pois o código também será incluído no bundle do navegador quando utilizado em `app/`.

## Exemplo de Uso

```ts
// shared/utils/string.ts
export function capitalize(input: string): string {
  if (!input) return ''
  return input.charAt(0).toUpperCase() + input.slice(1)
}
```

Uso automático tanto em `app/` quanto em `server/`:

```vue
<!-- app/pages/index.vue -->
<template>
  <p>{{ capitalize('nuxt') }}</p>
</template>
```

```ts
// server/api/greeting.get.ts
export default defineEventHandler(() => {
  return {
    message: capitalize('olá mundo'),
  }
})
```

## Boas Práticas

- **Funções Puras e Determinísticas**: Garanta que as funções em `shared/utils/` não possuam efeitos colaterais globais e sempre retornem a mesma saída para a mesma entrada.
- **Cobertura de Testes Unitários**: Crie testes correspondentes em `test/unit/` para cada arquivo adicionado a `shared/utils/`.
