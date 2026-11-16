// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  // Fixa workspaceDir na raiz atual para evitar que o Nuxt suba até o repo pai em git worktrees.
  workspaceDir: '.',
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxt/image',
    '@pinia/nuxt',
    '@nuxt/test-utils/module',
    'nuxt-security',
  ],
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      htmlAttrs: {
        lang: 'pt-BR',
        class: 'dark',
      },
      title: 'Estrada+ | Telemetria & Controle de Custos',
    },
  },
  ui: {
    colorMode: false,
  },
  runtimeConfig: {
    appSecret: process.env.NUXT_APP_SECRET || '',
    databaseUrl: process.env.NUXT_DATABASE_URL || './.data/sqlite/estrada.db',
    smtp: {
      host: process.env.NUXT_SMTP_HOST || '',
      port: Number(process.env.NUXT_SMTP_PORT || 587),
      user: process.env.NUXT_SMTP_USER || '',
      pass: process.env.NUXT_SMTP_PASS || '',
      from: process.env.NUXT_SMTP_FROM || 'Estrada+ Telemetria <no-reply@estradamais.com.br>',
    },
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || '/api',
      appUrl: process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000',
    },
  },
  nitro: {
    externals: {
      external: ['better-sqlite3'],
    },
  },
  typescript: {
    strict: true,
    tsConfig: {
      compilerOptions: {
        noUncheckedIndexedAccess: true,
        noImplicitOverride: true,
        exactOptionalPropertyTypes: true,
      },
    },
  },
  icon: {
    serverBundle: {
      collections: ['lucide'],
    },
  },
  fonts: {
    defaults: {
      weights: [400, 500, 600, 700, 800],
    },
    families: [
      { name: 'Oswald', provider: 'google', weights: [500, 600, 700] },
      { name: 'Inter', provider: 'google', weights: [400, 500, 600, 700] },
      { name: 'JetBrains Mono', provider: 'google', weights: [400, 500, 600, 700, 800] },
    ],
  },
  image: {
    quality: 80,
    format: ['webp'],
  },
  pinia: {
    storesDirs: ['./stores/**'],
  },
  compatibilityDate: '2025-07-15',
  $development: {
    devtools: { enabled: true },
  },
})
