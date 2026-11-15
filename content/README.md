# Diretório `content/`

O diretório `content/` é utilizado pelo módulo oficial **[Nuxt Content](https://content.nuxt.com)** (`@nuxt/content`) para criar um CMS baseado em arquivos (File-based CMS) dentro da aplicação, lendo e processando arquivos `.md`, `.yml`, `.csv` e `.json`.

> Documentação oficial: [Nuxt 4 — `content`](https://nuxt.com/docs/4.x/directory-structure/content) | [Nuxt Content Docs](https://content.nuxt.com)

## Como Funciona

Quando o módulo `@nuxt/content` está instalado e habilitado (`npx nuxt module add content`), o Nuxt lê os arquivos deste diretório, converte conteúdos Markdown em AST, permite o uso de componentes Vue dentro do Markdown (sintaxe **MDC**) e disponibiliza uma API de consulta tipada baseada em coleções (`queryCollection`).

> **Nota**: Enquanto o módulo `@nuxt/content` não estiver instalado no `package.json`, o Nuxt ignora este diretório durante o build.

## Regras de Criação de Arquivos

1. **Formatos Suportados**:
   - `.md` (Markdown / MDC): Artigos, documentações, páginas institucionais e termos de uso.
   - `.yml` / `.yaml` e `.json`: Dados estruturados (menus, FAQs, configurações de conteúdo).
   - `.csv`: Dados tabulares.
2. **Nomenclatura**:
   - Utilize **kebab-case** para arquivos e subpastas (ex.: `content/blog/meu-primeiro-post.md`), pois a estrutura de pastas define o caminho (`path`) consultado na coleção.
   - Você pode usar prefixos numéricos (ex.: `1.introducao.md`, `2.instalacao.md`) para controlar a ordenação automática da navegação.
3. **Frontmatter Obrigatório em Arquivos `.md`**:
   - Todo arquivo Markdown de conteúdo deve iniciar com um bloco YAML Frontmatter contendo ao menos `title` e `description`:

```markdown
---
title: 'Introdução ao Projeto'
description: 'Guia inicial de utilização da plataforma.'
---

# Introdução ao Projeto

Conteúdo da página com suporte a componentes Vue via sintaxe MDC.
```

## Boas Práticas

- **Remova este `README.md` ao ativar o `@nuxt/content` na raiz**: Como o Nuxt Content processa todos os arquivos `.md` dentro de `content/`, ao instalar o módulo `@nuxt/content`, remova este `README.md` (ou configure a exclusão no `content.config.ts`) para evitar que ele seja indexado como uma página pública de conteúdo.
- **Componentes para MDC**: Componentes Vue que precisarem ser renderizados dinamicamente dentro de arquivos Markdown do `content/` devem ser criados em `app/components/content/` ou com sufixo `.global.vue`.
