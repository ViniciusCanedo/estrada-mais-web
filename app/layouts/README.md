# Diretório `app/layouts/`

O diretório `app/layouts/` contém componentes Vue que extraem padrões estruturais de interface (cabeçalhos, barras laterais, rodapés) em layouts reutilizáveis ao redor das páginas, evitando re-renderizações desnecessárias durante a navegação. Os layouts são carregados automaticamente via importação assíncrona quando utilizados.

> Documentação oficial: [Nuxt 4 — `layouts`](https://nuxt.com/docs/4.x/directory-structure/app/layouts)

## Como Funciona

Os layouts são ativados pelo componente `<NuxtLayout>` presente em `app/app.vue`:

```vue
<!-- app/app.vue -->
<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
```

- Se nenhuma configuração for informada na página, o Nuxt utiliza `app/layouts/default.vue` como padrão.
- O conteúdo da página atual (`<NuxtPage />`) é injetado dentro do `<slot />` do layout.

## Convenção de Nomes

O nome do layout é normalizado para **kebab-case** com base no caminho e no nome do arquivo (segmentos duplicados são removidos):

| Caminho do Arquivo                       | Nome do Layout (`definePageMeta`) |
| :--------------------------------------- | :-------------------------------- |
| `app/layouts/default.vue`                | `'default'`                       |
| `app/layouts/auth.vue`                   | `'auth'`                          |
| `app/layouts/adminDashboard.vue`         | `'admin-dashboard'`               |
| `app/layouts/desktop/DesktopDefault.vue` | `'desktop-default'`               |

## Regras de Criação de Arquivos

1. **Elemento Raiz Único Obrigatório**:
   - Diferente de componentes comuns, todo arquivo de layout **deve possuir exatamente um único elemento HTML raiz** (ex.: `<div>`), e esse elemento raiz **não pode ser um `<slot />`**. Isso é exigido pelo Nuxt para aplicar transições suaves entre mudanças de layout.
2. **Presença Obrigatória de `<slot />`**:
   - Todo layout deve conter pelo menos um `<slot />` para renderizar o conteúdo da página ativa (podendo também definir slots nomeados, como `<slot name="header" />`).
3. **Nomenclatura**:
   - Utilize `kebab-case.vue` (ex.: `default.vue`, `auth-minimal.vue`) ou `PascalCase.vue` em subpastas refletindo o caminho (`desktop/DesktopDefault.vue`).
4. **Padrão Vue/TypeScript do Projeto**:
   - Caso utilize `<script>`, posicione `<script setup lang="ts">` antes de `<template>`.
   - Props de layout (suportadas nativamente no Nuxt 4.4+) devem ser declaradas com `defineProps<{ ... }>()`.

## Exemplos de Uso

### Criando um Layout com Props Tipadas

```vue
<!-- app/layouts/panel.vue -->
<script setup lang="ts">
const props = defineProps<{
  sidebar?: boolean
  title?: string
}>()
</script>

<template>
  <div class="flex min-h-screen">
    <aside v-if="props.sidebar" class="w-64 border-r p-4">Menu Lateral</aside>
    <main class="flex-1 p-6">
      <h1 v-if="props.title" class="mb-4 text-2xl font-bold">{{ props.title }}</h1>
      <slot />
    </main>
  </div>
</template>
```

### Utilizando o Layout em uma Página

```vue
<!-- app/pages/dashboard.vue -->
<script setup lang="ts">
definePageMeta({
  layout: {
    name: 'panel',
    props: {
      sidebar: true,
      title: 'Painel Administrativo',
    },
  },
})
</script>

<template>
  <div>Conteúdo do Dashboard</div>
</template>
```

## Boas Práticas

- **Não crie `app/layouts/` se houver apenas um layout fixo**: Se toda a aplicação compartilhar exatamente a mesma estrutura sem variações, defina-a diretamente em `app/app.vue`.
- **Gerenciamento Centralizado por Rota**: Quando desejar aplicar layouts para grupos inteiros de URLs sem repetir `definePageMeta` em cada página, utilize `routeRules` no `nuxt.config.ts` (ex.: `'/admin/**': { appLayout: 'admin' }`).
- **Troca Dinâmica**: Utilize o helper `setPageLayout('nome-do-layout', { ...props })` para alterar o layout dinamicamente em tempo de execução.
