# Diretório `layers/`

O diretório `layers/` permite organizar e compartilhar código reutilizável, componentes, composables, páginas, rotas de servidor e configurações em subaplicações modulares chamadas **Nuxt Layers**. Qualquer layer criado dentro de `layers/` é **auto-registrado** pelo Nuxt 4 sem necessidade de listá-lo manualmente em `extends` no `nuxt.config.ts`.

> Documentação oficial: [Nuxt 4 — `layers`](https://nuxt.com/docs/4.x/directory-structure/layers)

## Quando Utilizar Layers

Layers são ideais para:

- **Domain-Driven Design (DDD)** ou arquitetura modular por domínio de negócio (`layers/billing/`, `layers/catalog/`, `layers/auth/`).
- **Design Systems / UI Kits internos** (`layers/ui/`).
- Separação clara entre áreas da aplicação (ex.: `layers/admin/` vs. `layers/storefront/`).

## Estrutura de um Layer

Cada subdiretório imediato dentro de `layers/` é tratado como um layer independente e possui exatamente a mesma estrutura de diretórios de uma aplicação Nuxt 4 padrão:

```text
layers/
├── 1.base/
│   ├── nuxt.config.ts          # ⚠️ Obrigatório para o Nuxt reconhecer o layer
│   └── app/
│       ├── components/
│       │   └── BaseCard.vue
│       └── composables/
│           └── useBaseTheme.ts
└── 2.admin/
    ├── nuxt.config.ts          # ⚠️ Obrigatório
    ├── app/
    │   ├── layouts/
    │   │   └── admin.vue
    │   └── pages/
    │       └── admin/index.vue
    └── server/
        └── api/
            └── admin/stats.get.ts
```

## Regras de Criação de Arquivos

1. **`nuxt.config.ts` Obrigatório por Layer**:
   - **Todo subdiretório dentro de `layers/` deve conter um arquivo `nuxt.config.ts`** na sua própria raiz (mesmo que seja apenas `export default defineNuxtConfig({})`) para ser reconhecido pelo Nuxt como um layer válido.
2. **Estrutura Interna Nuxt 4 (`app/`)**:
   - Dentro de cada layer, mantenha a convenção do Nuxt 4 colocando arquivos de interface dentro de `layers/<nome>/app/` (`components/`, `composables/`, `pages/`, `layouts/`, `middleware/`, `plugins/`, `utils/`), código de servidor em `layers/<nome>/server/` e código compartilhado em `layers/<nome>/shared/`.
3. **Ordem de Prioridade e Sobrescrita**:
   - Os layers em `layers/` são ordenados alfabeticamente, onde **letras posteriores têm maior prioridade** (`Z > A`), e a aplicação principal (`app/` na raiz do projeto) tem sempre a prioridade máxima sobre todos os layers.
   - Para definir explicitamente a ordem de prioridade, prefixe os diretórios com números (`1.base/`, `2.core/`, `3.admin/`).
4. **Aliases Automáticos (`#layers/[nome]`)**:
   - O Nuxt cria automaticamente o alias `#layers/<nome-do-layer>` apontando para o `srcDir` daquele layer:
     ```ts
     import { useAdmin } from '#layers/admin/composables/useAdmin'
     ```

## Boas Práticas

- **Baixo Acoplamento entre Layers**: Um layer base (`1.base`) nunca deve importar recursos de um layer mais específico (`3.admin`).
- **Prefixação de Componentes em Layers de UI**: Se criar um layer de Design System, configure um prefixo para os componentes no `nuxt.config.ts` do layer para evitar colisões de nomes.
