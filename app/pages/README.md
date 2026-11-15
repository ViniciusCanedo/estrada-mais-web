# Diretório `app/pages/`

O diretório `app/pages/` fornece o sistema de **roteamento baseado em arquivos** (file-based routing) do Nuxt 4, gerando automaticamente a configuração do `vue-router` para cada componente de página criado.

> Documentação oficial: [Nuxt 4 — `pages`](https://nuxt.com/docs/4.x/directory-structure/app/pages)

## Convenções de Roteamento por Arquivo

| Arquivo em `app/pages/`            | Rota Gerada        | Descrição                                                                  |
| :--------------------------------- | :----------------- | :------------------------------------------------------------------------- |
| `index.vue`                        | `/`                | Página inicial da aplicação                                                |
| `sobre.vue` ou `sobre/index.vue`   | `/sobre`           | Rota estática simples                                                      |
| `usuarios/[id].vue`                | `/usuarios/:id`    | Rota dinâmica com parâmetro obrigatório (`route.params.id`)                |
| `usuarios/[[slug]].vue`            | `/usuarios/:slug?` | Rota dinâmica com parâmetro **opcional**                                   |
| `docs/[...slug].vue`               | `/docs/*`          | Rota _catch-all_ (captura todos os subcaminhos em array)                   |
| `(marketing)/contato.vue`          | `/contato`         | **Grupo de rotas**: agrupa arquivos sem afetar a URL (`route.meta.groups`) |
| `painel.vue` + `painel/config.vue` | `/painel/config`   | **Rotas aninhadas**: requer `<NuxtPage />` dentro de `painel.vue`          |
| `painel/child@sidebar.vue`         | _(Named View)_     | Renderiza na outlet `<NuxtPage name="sidebar" />` do componente pai        |

## Regras de Criação de Arquivos

1. **Nomenclatura de Arquivos e Pastas**:
   - Utilize **kebab-case** para nomes de arquivos e diretórios de páginas (ex.: `minha-conta.vue`, `redefinir-senha.vue`), pois eles definem diretamente as URLs da aplicação.
   - Utilize colchetes simples `[param]` para parâmetros dinâmicos obrigatórios, colchetes duplos `[[param]]` para opcionais e `[...slug]` para catch-all.
2. **Elemento Raiz Único Obrigatório**:
   - Toda página **deve ter um único elemento raiz no `<template>`** (ex.: `<div>` ou `<main>`) para que as transições de rota no cliente funcionem corretamente.
   - **Atenção**: Comentários HTML (`<!-- ... -->`) na raiz do `<template>` contam como nós adicionais e quebram transições de página no cliente. Coloque comentários sempre **dentro** do elemento raiz.
3. **Uso de `definePageMeta`**:
   - `definePageMeta` é uma macro de compilação que é extraída (hoisted) para fora do componente.
   - **Não referencie** variáveis locais reativas (`ref`, `computed`) ou funções com efeitos colaterais de dentro do componente em `definePageMeta`.
4. **Padrão Estrito do Projeto**:
   - Ordem obrigatória dos blocos: `<script setup lang="ts">` → `<template>` → `<style>`.
   - Páginas devem atuar como orquestradoras da rota (busca de dados com `useFetch`/`useAsyncData`, SEO com `useSeoMeta`, definição de layout/middleware com `definePageMeta`), delegando blocos complexos de UI para `app/components/`.

## Exemplo de Página Completa

```vue
<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const route = useRoute()

useSeoMeta({
  title: 'Detalhes do Projeto',
  description: 'Visualização detalhada do projeto.',
})
</script>

<template>
  <section class="mx-auto max-w-5xl p-6">
    <h1 class="text-2xl font-bold">Página Atual: {{ route.path }}</h1>
  </section>
</template>
```

## Boas Práticas

- **Não coloque componentes auxiliares dentro de `app/pages/`**: Qualquer arquivo `.vue` dentro de `app/pages/` será transformado em uma rota pública pelo Nuxt. Componentes de interface pertencem exclusivamente a `app/components/`.
- **Prioridade de Rotas Aninhadas vs. Dinâmicas**: Se você tiver `app/pages/foo.vue` e `app/pages/foo/[slug].vue`, `foo.vue` terá prioridade como rota pai. Para ter páginas independentes em `/foo` e `/foo/:slug`, crie `app/pages/foo/index.vue` e `app/pages/foo/[slug].vue`.
- **Navegação Interna**: Utilize sempre o componente `<NuxtLink to="...">` em vez da tag nativa `<a href="...">` para aproveitar pré-carregamento inteligente (prefetching) e navegação SPA.
