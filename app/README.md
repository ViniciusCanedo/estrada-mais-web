# Diretório `app/`

O diretório `app/` é o diretório principal da aplicação Vue no **Nuxt 4** (`srcDir` padrão). Ele concentra toda a interface de usuário, roteamento cliente/SSR, estado reativo, componentes, layouts, plugins, middlewares de rota, utilitários e tipagens exclusivas da camada de aplicação.

> Documentação oficial: [Nuxt 4 — Directory Structure (`app/`)](https://nuxt.com/docs/4.x/directory-structure)

## Estrutura do Diretório

```text
app/
├── assets/          # Ativos processados pela ferramenta de build (CSS, fontes, imagens otimizadas)
├── components/      # Componentes Vue auto-importados
├── composables/     # Composables Vue auto-importados (lógica reativa com Composition API)
├── layouts/         # Layouts reutilizáveis que envolvem as páginas (<NuxtLayout>)
├── middleware/      # Guardas de navegação executados antes da transição de rotas
├── pages/           # Roteamento baseado em arquivos (<NuxtPage>)
├── plugins/         # Plugins executados na inicialização da aplicação Vue
├── types/           # Definições e interfaces TypeScript exclusivas do contexto da aplicação
├── utils/           # Funções utilitárias puras auto-importadas na aplicação
├── app.config.ts    # Configuração reativa pública em tempo de execução (useAppConfig)
├── app.vue          # Componente raiz da aplicação Nuxt
└── error.vue        # Página global de tratamento de erros
```

## Arquivos Especiais na Raiz de `app/`

- **[`app.vue`](https://nuxt.com/docs/4.x/directory-structure/app/app)**: Ponto de entrada visual da aplicação. Renderiza elementos globais (como `<NuxtRouteAnnouncer />`, `<NuxtLayout>` e `<NuxtPage />`). Tudo o que é importado aqui (JS e CSS) é incluído globalmente em todas as páginas.
- **[`app.config.ts`](https://nuxt.com/docs/4.x/directory-structure/app/app-config)**: Expõe configurações reativas públicas em tempo de execução via `defineAppConfig()`, acessíveis com `useAppConfig()` e atualizáveis com `updateAppConfig()`. **Nunca armazene segredos ou chaves privadas neste arquivo**, pois ele é enviado ao bundle do cliente.
- **[`error.vue`](https://nuxt.com/docs/4.x/directory-structure/app/error)**: Componente renderizado quando ocorre um erro fatal ou não tratado. Recebe a prop `error: NuxtError` (importada de `#app`) e não deve conter `definePageMeta` (pois não é uma rota de `pages/`).
- **`spa-loading-template.html`** _(opcional)_: Define a tela de carregamento exibida enquanto páginas configuradas apenas para cliente (`ssr: false`) são inicializadas.

## Regras de Criação de Arquivos

1. **Fronteira de Contexto (Vue vs. Nitro)**:
   - O código dentro de `app/` é compilado no bundle da aplicação Vue e possui seu próprio contexto TypeScript (`.nuxt/tsconfig.app.json`).
   - **Proibido** importar código exclusivo de `server/` (handlers, utilitários ou rotas do Nitro) dentro de `app/`. Para compartilhar código ou tipos entre `app/` e `server/`, utilize o diretório `shared/`.
2. **Aliases de Importação**:
   - Utilize `~/` ou `@/` para referenciar arquivos relativos ao diretório `app/` (ex.: `~/assets/css/main.css`).
   - Utilize `~~/` ou `@@/` quando precisar referenciar a raiz do projeto.
3. **Padrão de Componentes Vue (`.vue`)**:
   - Ordem obrigatória de blocos: `<script setup lang="ts">` → `<template>` → `<style>`.
   - Sempre declare `<script setup lang="ts">` com tipagem estrita (sem uso de `any`).
   - Ordem obrigatória de macros no `<script setup>`: `defineOptions` → `defineModel` → `defineProps` → `defineEmits` → `defineSlots`.

## Boas Práticas

- **Mantenha `app.vue` enxuto**: Delegue estruturas visuais variáveis para `app/layouts/` e lógica de inicialização para `app/plugins/`.
- **Prefira Auto-imports**: Componentes (`app/components/`), composables (`app/composables/`), utilitários (`app/utils/`) e tipos (`app/types/`) são auto-importados pelo Nuxt sem necessidade de imports manuais.
- **Segurança no `app.config.ts`**: Para variáveis dependentes de ambiente ou chaves sensíveis, utilize `runtimeConfig` no `nuxt.config.ts` (acessado via `useRuntimeConfig()`) em vez de `app.config.ts`.
- **Importações de Tipo**: Sempre utilize `import type { ... }` ao importar apenas tipos ou interfaces TypeScript.
