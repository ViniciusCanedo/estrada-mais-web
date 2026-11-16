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
  runtimeConfig: {
    public: {
      apiBase: '/api',
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
      weights: [400, 500, 600, 700],
    },
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
