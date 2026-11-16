import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'
import { defineVitestProject } from '@nuxt/test-utils/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['app/**/*.{ts,vue}', 'server/**/*.ts', 'shared/**/*.ts'],
      exclude: [
        '**/*.d.ts',
        'app/app.config.ts',
        'app/types/**',
        'server/types/**',
        'shared/types/**',
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
        'server/services/**': {
          statements: 90,
          branches: 90,
          functions: 90,
          lines: 90,
        },
        'server/repositories/**': {
          statements: 90,
          branches: 90,
          functions: 90,
          lines: 90,
        },
        'shared/**': {
          statements: 90,
          branches: 90,
          functions: 90,
          lines: 90,
        },
      },
    },
    projects: [
      {
        resolve: {
          alias: {
            '#shared': resolve(import.meta.dirname, 'shared'),
            '#server': resolve(import.meta.dirname, 'server'),
          },
        },
        test: {
          name: 'unit',
          include: ['test/unit/*.{test,spec}.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'arch',
          include: ['test/arch/*.{test,spec}.ts'],
          environment: 'node',
        },
      },
      await defineVitestProject({
        test: {
          name: 'nuxt',
          include: ['test/nuxt/*.{test,spec}.ts'],
          environment: 'nuxt',
          environmentOptions: {
            nuxt: {
              domEnvironment: 'happy-dom',
            },
          },
        },
      }),
    ],
  },
})
