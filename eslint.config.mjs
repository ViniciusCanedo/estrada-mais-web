// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'
import eslintPluginBetterTailwindcss from 'eslint-plugin-better-tailwindcss'
import sonarjs from 'eslint-plugin-sonarjs'
import vuejsAccessibility from 'eslint-plugin-vuejs-accessibility'
import eslintConfigPrettier from 'eslint-config-prettier'

const NO_PROCESS_ENV_RULE = {
  selector: "MemberExpression[object.name='process'][property.name='env']",
  message: 'Use runtimeConfig, não process.env.',
}

const NO_ZOD_OBJECT_OUTSIDE_SCHEMAS_RULE = {
  selector: "CallExpression[callee.object.name='z'][callee.property.name='object']",
  message: 'Schemas Zod (z.object) devem ser declarados exclusivamente em shared/schemas/.',
}

export default withNuxt(
  {
    ignores: [
      '.worktrees/**',
      'playwright-report/**',
      'test-results/**',
      'coverage/**',
      'test/load/**',
    ],
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
  },
  sonarjs.configs.recommended,
  ...vuejsAccessibility.configs['flat/recommended'],
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,vue}'],
    rules: {
      // Complexidade e tamanho (§4.1)
      complexity: ['error', 10],
      'sonarjs/cognitive-complexity': ['error', 15],
      'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
      'max-depth': ['error', 3],
      'max-nested-callbacks': ['error', 3],
      'max-params': ['error', 4],

      // Higiene (§4.4)
      'no-console': 'error',
      'no-debugger': 'error',
      'no-warning-comments': ['error', { terms: ['todo', 'fixme', 'hack'], location: 'start' }],
      'no-restricted-syntax': ['error', NO_PROCESS_ENV_RULE],
    },
  },
  {
    files: ['app/**/*.{ts,tsx,mts,cts,vue}', 'server/**/*.{ts,tsx,mts,cts}'],
    rules: {
      'no-restricted-syntax': ['error', NO_PROCESS_ENV_RULE, NO_ZOD_OBJECT_OUTSIDE_SCHEMAS_RULE],
    },
  },
  {
    files: ['app/components/**/*.{ts,vue}'],
    rules: {
      'no-restricted-globals': [
        'error',
        {
          name: '$fetch',
          message: 'Componentes não devem realizar I/O direto; use composables ou stores.',
        },
        {
          name: 'useFetch',
          message: 'Componentes não devem realizar I/O direto; use composables ou stores.',
        },
        {
          name: 'useAsyncData',
          message: 'Componentes não devem realizar I/O direto; use composables ou stores.',
        },
        {
          name: 'useApiFetch',
          message: 'Componentes não devem realizar I/O direto; use composables ou stores.',
        },
      ],
    },
  },
  {
    files: ['**/*.{ts,tsx,mts,cts,vue}'],
    plugins: {
      'better-tailwindcss': eslintPluginBetterTailwindcss,
    },
    settings: {
      'better-tailwindcss': {
        entryPoint: 'app/assets/css/main.css',
      },
    },
    rules: {
      // Regras de validação do Tailwind CSS v4 (sem conflito com o Prettier)
      ...eslintPluginBetterTailwindcss.configs['recommended-error'].rules,
      'better-tailwindcss/enforce-consistent-class-order': 'off',
      'better-tailwindcss/enforce-consistent-line-wrapping': 'off',

      // Regras estritas de TypeScript (§4.2)
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-ignore': true,
          'ts-nocheck': true,
          'ts-expect-error': 'allow-with-description',
          minimumDescriptionLength: 15,
        },
      ],
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          disallowTypeAnnotations: false,
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['**/*.vue'],
    rules: {
      // Regras estritas de Vue 3 / Nuxt 4 (§4.1, §4.3)
      'max-lines': ['error', { max: 250, skipBlankLines: true, skipComments: true }],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      'vue/block-order': [
        'error',
        {
          order: ['script', 'template', 'style'],
        },
      ],
      'vue/block-lang': [
        'error',
        {
          script: { lang: 'ts' },
        },
      ],
      'vue/component-api-style': ['error', ['script-setup']],
      'vue/component-name-in-template-casing': ['error', 'PascalCase'],
      'vue/define-macros-order': [
        'error',
        {
          order: ['defineOptions', 'defineModel', 'defineProps', 'defineEmits', 'defineSlots'],
        },
      ],
      'vue/define-props-declaration': ['error', 'type-based'],
      'vue/define-emits-declaration': ['error', 'type-based'],
      'vue/no-unused-refs': 'error',
      'vue/no-useless-v-bind': 'error',
      'vue/prefer-true-attribute-shorthand': 'error',
    },
  },
  {
    files: ['server/database/migrate.ts', 'server/database/seed.ts'],
    rules: {
      'no-restricted-syntax': ['error', NO_ZOD_OBJECT_OUTSIDE_SCHEMAS_RULE],
    },
  },
  {
    files: ['nuxt.config.ts', 'drizzle.config.ts', 'playwright.config.ts', 'scripts/**/*.mjs'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
  {
    files: ['**/*.{test,spec}.ts', 'test/**'],
    rules: {
      'max-lines-per-function': 'off',
    },
  },
  // Desativa todas as regras estilísticas do ESLint que conflitam com o Prettier
  eslintConfigPrettier,
)
