<script setup lang="ts">
import ButtonMatrixSection from '../components/design-system/ButtonMatrixSection.vue'
import ColorPaletteSection from '../components/design-system/ColorPaletteSection.vue'
import FormInputsSection from '../components/design-system/FormInputsSection.vue'
import TypographySection from '../components/design-system/TypographySection.vue'

definePageMeta({
  middleware: () => {
    if (!import.meta.dev) {
      return navigateTo('/', { replace: true })
    }
  },
})

useHead({
  title: 'Sistema de Design | Estrada+',
})
</script>

<template>
  <div data-testid="screen-design-system" class="space-y-8">
    <div class="border-b border-asphalt-border pb-4">
      <span class="font-mono text-xs tracking-widest text-amber-default uppercase">
        ESTRADA+ DESIGN SYSTEM SPECIFICATION
      </span>
      <h1 class="mt-1 font-display text-3xl font-bold text-white uppercase">
        Componentes, Tokens &amp; Ergonomia Telemetria
      </h1>
      <p class="mt-1 max-w-3xl text-sm text-highway-muted">
        Direção de design "Night Highway" construída para visibilidade máxima sob sol a pino e
        trabalho noturno em cabine de caminhão pesado. Rejeita o design genérico SaaS em prol de
        superfícies industriais duráveis.
      </p>
    </div>

    <ColorPaletteSection />
    <TypographySection />
    <FormInputsSection />
    <ButtonMatrixSection />
  </div>
</template>
