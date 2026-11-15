# Diretório `app/assets/css/`

O diretório `app/assets/css/` armazena as folhas de estilo globais da aplicação e o ponto de entrada do **Tailwind CSS v4** (`main.css`).

> Documentação oficial: [Nuxt 4 — Styling](https://nuxt.com/docs/4.x/getting-started/styling)

## Como Funciona neste Projeto

O arquivo `app/assets/css/main.css` é registrado globalmente na propriedade `css` do `nuxt.config.ts` e configurado como `entryPoint` para validação estática de classes pelo `eslint-plugin-better-tailwindcss` e ordenação pelo `prettier-plugin-tailwindcss`.

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()],
  },
})
```

## Regras de Criação de Arquivos

1. **Ponto de Entrada Único**:
   - Mantenha `main.css` como arquivo principal de entrada de estilos e diretivas do Tailwind CSS v4 (`@import 'tailwindcss';`).
   - Caso crie arquivos auxiliares (ex.: `typography.css`, `animations.css`), utilize **kebab-case** e importe-os em `main.css` ou registre-os em `nuxt.config.ts`.
2. **Sintaxe do Tailwind CSS v4**:
   - Utilize `@import 'tailwindcss';` em vez das antigas diretivas `@tailwind base; @tailwind components; @tailwind utilities;` do Tailwind v3.
   - Defina tokens de design e variáveis de tema usando a diretiva `@theme { ... }` diretamente no CSS.
   - Crie utilitários customizados usando a diretiva `@utility nome-do-utilitario { ... }`.

## Exemplo de Configuração (`main.css`)

```css
@import 'tailwindcss';

@theme {
  --font-sans: 'Inter', sans-serif;
  --color-brand-500: oklch(0.62 0.19 259);
}
```

## Boas Práticas

- **Prefira Classes Utilitárias no Template**: Estilize componentes diretamente nos templates Vue utilizando classes do Tailwind CSS v4.
- **Validação Automática**: Qualquer token customizado declarado dentro de `@theme` em `app/assets/css/main.css` passa a ser reconhecido automaticamente pelo linter (`eslint-plugin-better-tailwindcss`) e pelo formatador (`prettier-plugin-tailwindcss`).
- **Evite CSS Global Desnecessário**: Restrinja `app/assets/css/` a tokens de tema (`@theme`), resets globais, `@font-face` e utilitários reutilizáveis (`@utility`).
