# Diretório `app/assets/`

O diretório `app/assets/` armazena todos os ativos estáticos (folhas de estilo, fontes, ícones e imagens) que **devem ser processados pela ferramenta de build (Vite)** para otimização, minificação, transformação de plugins (como Tailwind CSS v4) e geração de hashes de cache.

> Documentação oficial: [Nuxt 4 — `assets`](https://nuxt.com/docs/4.x/directory-structure/app/assets) | [Getting Started — Assets](https://nuxt.com/docs/4.x/getting-started/assets)

## Quando Usar `app/assets/` vs. `public/`

| Característica           | `app/assets/`                                                                    | `public/`                                                                                   |
| :----------------------- | :------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------ |
| **Processado pelo Vite** | Sim (minificação, otimização, hash no nome)                                      | Não (servido exatamente como está)                                                          |
| **URL pública direta**   | Não possui rota estática direta                                                  | Sim, servido a partir da raiz `/`                                                           |
| **Como referenciar**     | `~/assets/...`                                                                   | `/...`                                                                                      |
| **Casos de uso ideais**  | CSS global (`main.css`), fontes locais, SVGs e imagens importadas em componentes | `favicon.ico`, `robots.txt`, `manifest.webmanifest`, imagens de Open Graph (`og-image.png`) |

## Estrutura Recomendada

```text
app/assets/
├── css/             # Folhas de estilo globais e configuração do Tailwind CSS v4
├── fonts/           # Arquivos de fontes locais (.woff2)
├── icons/           # Ícones em formato .svg
└── images/          # Imagens processadas pelo bundler (.webp, .avif, .png, .jpg)
```

## Regras de Criação de Arquivos

1. **Nomenclatura**:
   - Utilize **kebab-case** (letras minúsculas separadas por hífen) para nomes de pastas e arquivos: `hero-banner.webp`, `inter-regular.woff2`, `main.css`.
2. **Referência de Caminhos**:
   - Sempre utilize o alias `~/assets/...` em templates, blocos `<style>` ou configurações do `nuxt.config.ts`.
3. **Caminhos Estáticos vs. Dinâmicos no Vite**:
   - Caminhos literais estáticos no template (ex.: `<img src="~/assets/images/logo.png" alt="Logo" />`) são reescritos automaticamente pelo Vite em tempo de build.
   - **Não** monte caminhos dinâmicos com strings interpoladas diretamente no `:src` apontando para `~/assets/` (ex.: `:src="\`~/assets/images/${name}.png\`"`), pois o Vite não consegue resolver o import em tempo de execução.
   - Quando precisar carregar arquivos de `app/assets/` dinamicamente, utilize `import.meta.glob` com `query: '?url'` e `import: 'default'`, ou armazene os arquivos em `public/`.

## Exemplos de Uso

### Importação Estática em Template

```vue
<template>
  <img src="~/assets/images/banner.webp" alt="Banner principal" />
</template>
```

### Importação Dinâmica Segura com Vite (`import.meta.glob`)

```vue
<script setup lang="ts">
const props = defineProps<{
  iconName: string
}>()

const icons = import.meta.glob<string>('./assets/icons/*.svg', {
  query: '?url',
  import: 'default',
  eager: true,
})

const iconUrl = computed(() => icons[`./assets/icons/${props.iconName}.svg`])
</script>

<template>
  <img v-if="iconUrl" :src="iconUrl" :alt="props.iconName" />
</template>
```

## Boas Práticas

- **Formatos Modernos**: Prefira `.webp` ou `.avif` para imagens bitmap, `.svg` para ícones/vetores e `.woff2` para fontes web.
- **Compatibilidade com SSR**: Nunca utilize o padrão `new URL(..., import.meta.url)` do Vite para resolver ativos em componentes renderizados no servidor, pois ele não é suportado no SSR do Nuxt.
- **Evite duplicação**: Não coloque em `app/assets/` arquivos que precisam manter o nome original em uma URL fixa (como `robots.txt` ou imagens de compartilhamento social); use `public/` para esses casos.
