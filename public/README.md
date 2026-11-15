# Diretório `public/`

O diretório `public/` armazena os **ativos estáticos públicos** da aplicação. Todos os arquivos colocados aqui são servidos diretamente na raiz do servidor (`/`) **sem passar por processamento, transformação ou renomeação (hash) pela ferramenta de build (Vite)**.

> Documentação oficial: [Nuxt 4 — `public`](https://nuxt.com/docs/4.x/directory-structure/public) | [Getting Started — Assets](https://nuxt.com/docs/4.x/getting-started/assets)

## Quando Usar `public/` vs. `app/assets/`

Use `public/` para:
- Arquivos que **precisam manter seu nome e caminho exatos** na raiz do domínio: `robots.txt`, `favicon.ico`, `sitemap.xml` estático, `site.webmanifest`, `security.txt`, `.well-known/*`.
- Imagens de metadados/SEO e compartilhamento social referenciadas por URL absoluta/raiz (`og-image.png`, `apple-touch-icon.png`).
- Documentos para download direto (`.pdf`) ou imagens cujo caminho é construído dinamicamente em tempo de execução (`/img/${slug}.png`).

Use `app/assets/` para:
- Folhas de estilo CSS (`main.css`), fontes e ícones/imagens importados em componentes que devem ser otimizados e receber hash de cache pelo Vite.

## Estrutura Exemplo

```text
public/
├── favicon.ico        # Servido em /favicon.ico
├── robots.txt         # Servido em /robots.txt
└── images/
    └── og-default.png # Servido em /images/og-default.png
```

## Regras de Criação de Arquivos

1. **Nomenclatura**:
   - Utilize **kebab-case** (letras minúsculas e hífens, sem espaços ou caracteres especiais/acentos) para todos os arquivos e subpastas, pois seus nomes compõem diretamente a URL pública.
2. **Referência no Código**:
   - Referencie arquivos de `public/` sempre a partir da barra inicial `/` (e **nunca** com `~/public/...`):
     ```vue
     <template>
       <img src="/images/og-default.png" alt="Capa" />
     </template>
     ```
3. **Atenção ao `app.baseURL` em Caminhos Dinâmicos**:
   - Caminhos estáticos literais no template (`<img src="/images/logo.png">`) recebem automaticamente o prefixo `app.baseURL` em tempo de execução.
   - Se o caminho for montado dinamicamente via JavaScript (`:src="\`/images/${name}.png\`"`) e a aplicação for hospedada em um subcaminho (`NUXT_APP_BASE_URL`), prefixe manualmente usando `useRuntimeConfig().app.baseURL`.

## Boas Práticas

- **Otimize antes de commitar**: Como o Vite não comprime nem converte imagens dentro de `public/`, sempre comprima imagens (`.webp`, `.png`, `.svg`) antes de adicioná-las a este diretório.
- **Segurança**: Todo arquivo dentro de `public/` é publicamente acessível por qualquer usuário na web. Nunca coloque arquivos de configuração interna, backups ou dados sensíveis aqui.
