# Diretório `app/components/`

O diretório `app/components/` armazena os componentes Vue reutilizáveis da aplicação. Todos os componentes criados aqui são **auto-importados** pelo Nuxt 4 sob demanda (apenas os componentes efetivamente utilizados entram no bundle de produção).

> Documentação oficial: [Nuxt 4 — `components`](https://nuxt.com/docs/4.x/directory-structure/app/components)

## Convenção de Nomes e Auto-importação

O Nuxt compõe o nome do componente combinando o **caminho dos subdiretórios** e o **nome do arquivo** em `PascalCase`, removendo segmentos duplicados:

| Caminho do Arquivo                     | Nome de Uso no Template | Recomendação de Nome de Arquivo            |
| :------------------------------------- | :---------------------- | :----------------------------------------- |
| `app/components/AppHeader.vue`         | `<AppHeader />`         | `app/components/AppHeader.vue`             |
| `app/components/base/Button.vue`       | `<BaseButton />`        | `app/components/base/BaseButton.vue`       |
| `app/components/user/ProfileCard.vue`  | `<UserProfileCard />`   | `app/components/user/UserProfileCard.vue`  |
| `app/components/base/(form)/Input.vue` | `<BaseInput />`         | `app/components/base/(form)/BaseInput.vue` |

- **Diretórios de Agrupamento `(grupo)`**: Envolver o nome de uma pasta entre parênteses (ex.: `(form)/`) agrupa os arquivos sem adicionar o nome da pasta ao prefixo do componente.

## Regras de Criação de Arquivos

1. **Nomenclatura de Arquivos**:
   - Utilize sempre **PascalCase** para arquivos `.vue` (ex.: `BaseButton.vue`, `AppNavbar.vue`).
   - Faça o nome do arquivo refletir seu nome final auto-importado (ex.: dentro de `app/components/base/`, nomeie o arquivo como `BaseButton.vue` em vez de apenas `Button.vue`) para facilitar buscas na IDE.
2. **Sufixos Especiais do Nuxt**:
   - `*.client.vue`: Componente renderizado **apenas no cliente** (navegador).
   - `*.server.vue`: Componente standalone renderizado **apenas no servidor** (Server Component / Nuxt Island).
   - `*.global.vue` (ou pasta `global/`): Registra o componente globalmente (cria chunks assíncronos separados; use apenas quando indispensável, como para renderização dinâmica em Markdown/CMS).
3. **Regras Estritas do Projeto (ESLint & TypeScript)**:
   - Ordem obrigatória das tags: `<script setup lang="ts">` → `<template>` → `<style>`.
   - Uso obrigatório de `<script setup lang="ts">`.
   - Ordem obrigatória de macros:
     1. `defineOptions`
     2. `defineModel`
     3. `defineProps`
     4. `defineEmits`
     5. `defineSlots`
   - Declaração de `defineProps` e `defineEmits` **obrigatoriamente baseada em tipos** (`defineProps<{ ... }>()` e `defineEmits<{ ... }>()`).
   - Uso de componentes no `<template>` sempre em `PascalCase` (`<BaseButton />` e nunca `<base-button />`).

## Carregamento Assíncrono (Lazy Loading) e Hidratação Tardia

Adicione o prefixo **`Lazy`** ao usar qualquer componente no template para carregar seu código de forma assíncrona (code-splitting):

```vue
<template>
  <div>
    <!-- Carregado sob demanda apenas quando isOpen for verdadeiro -->
    <LazyModalConfirm v-if="isOpen" />

    <!-- Hidratação tardia quando o componente entra na viewport -->
    <LazyHeavyChart hydrate-on-visible />
  </div>
</template>
```

Estratégias nativas de hidratação tardia suportadas em componentes `Lazy*`:

- `hydrate-on-visible`: Hidrata quando visível na viewport (`IntersectionObserver`).
- `hydrate-on-idle`: Hidrata quando o navegador estiver ocioso.
- `hydrate-on-interaction`: Hidrata na primeira interação (`click`, `focus`, `pointerenter` ou evento específico).
- `hydrate-on-media-query="(max-width: 768px)"`: Hidrata quando a media query corresponder.
- `:hydrate-after="2000"`: Hidrata após o tempo especificado em milissegundos.
- `:hydrate-when="isReady"`: Hidrata quando a condição booleana for verdadeira.
- `hydrate-never`: Nunca hidrata no cliente.

## Exemplo de Componente Padrão

```vue
<script setup lang="ts">
const modelValue = defineModel<string>({ default: '' })

const props = defineProps<{
  label: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  submit: [value: string]
}>()

function handleClick() {
  if (!props.disabled) {
    emit('submit', modelValue.value)
  }
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <label class="text-sm font-medium">{{ props.label }}</label>
    <input v-model="modelValue" :disabled="props.disabled" class="rounded border px-3 py-2" />
    <button type="button" :disabled="props.disabled" @click="handleClick">Enviar</button>
  </div>
</template>
```

## Boas Práticas

- **Componentes Dinâmicos (`<component :is="...">`)**: Importe diretamente de `#components` (`import { BaseButton } from '#components'`) ou use `resolveComponent('BaseButton')` com string literal estática.
- **Priorize conteúdo acima da dobra**: Não aplique hidratação tardia (`hydrate-on-*`) em componentes críticos visíveis no carregamento inicial (LCP).
- **Atributos booleanos concisos**: Prefira `<BaseButton disabled />` em vez de `<BaseButton :disabled="true" />` (regra `vue/prefer-true-attribute-shorthand`).
