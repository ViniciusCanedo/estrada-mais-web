<script setup lang="ts">
interface PaletteToken {
  cssVar: string
  hex: string
  oklch: string
  name: string
  swatchClass: string
  cardClass: string
  varClass: string
  nameClass: string
}

const PALETTE_TOKENS: readonly PaletteToken[] = [
  {
    cssVar: '--bg',
    hex: '#141416',
    oklch: 'oklch(0.14 0.005 285)',
    name: 'Asfalto Profundo',
    swatchClass: 'bg-asphalt-bg text-highway-muted border border-asphalt-border',
    cardClass: 'border border-asphalt-border',
    varClass: 'text-white',
    nameClass: 'text-highway-muted',
  },
  {
    cssVar: '--surface',
    hex: '#1d1d20',
    oklch: 'oklch(0.18 0.008 285)',
    name: 'Cartão Asfalto',
    swatchClass: 'bg-asphalt-surface text-highway-muted border border-asphalt-border',
    cardClass: 'border border-asphalt-border',
    varClass: 'text-white',
    nameClass: 'text-highway-muted',
  },
  {
    cssVar: '--border',
    hex: '#2d2d30',
    oklch: 'oklch(0.26 0.008 285)',
    name: 'Divisor Concreto',
    swatchClass: 'bg-asphalt-border text-highway-muted border border-asphalt-border',
    cardClass: 'border border-asphalt-border',
    varClass: 'text-white',
    nameClass: 'text-highway-muted',
  },
  {
    cssVar: '--fg',
    hex: '#f3f4f6',
    oklch: 'oklch(0.96 0.01 285)',
    name: 'Branco Reflexivo',
    swatchClass: 'bg-highway-fg text-asphalt-bg font-bold',
    cardClass: 'border border-asphalt-border',
    varClass: 'text-white',
    nameClass: 'text-highway-muted',
  },
  {
    cssVar: '--muted',
    hex: '#9ca3af',
    oklch: 'oklch(0.70 0.01 285)',
    name: 'Cinza Rodoviário',
    swatchClass: 'bg-highway-muted text-asphalt-bg font-bold',
    cardClass: 'border border-asphalt-border',
    varClass: 'text-white',
    nameClass: 'text-highway-muted',
  },
  {
    cssVar: '--accent (Amber)',
    hex: '#ffb400',
    oklch: 'oklch(0.79 0.19 80)',
    name: 'Atenção / Alerta',
    swatchClass: 'bg-amber-default text-asphalt-bg font-bold',
    cardClass: 'border-2 border-amber-default/80',
    varClass: 'text-amber-default',
    nameClass: 'text-amber-default',
  },
  {
    cssVar: '--expense-blue',
    hex: '#7aa8ff',
    oklch: 'oklch(0.72 0.16 260)',
    name: 'Placa Rodoviária',
    swatchClass: 'bg-expense-blue text-asphalt-bg font-bold',
    cardClass: 'border border-expense-blue/60',
    varClass: 'text-expense-blue',
    nameClass: 'text-expense-blue',
  },
]
</script>

<template>
  <section class="space-y-4">
    <h2 class="flex items-center gap-2 font-display text-xl tracking-wider text-white uppercase">
      <span class="inline-block size-3 bg-amber-default" aria-hidden="true" />
      <span>1. Paleta de Cores (OKLCH Tokens)</span>
    </h2>

    <div class="grid grid-cols-2 gap-4 font-mono text-xs md:grid-cols-4 lg:grid-cols-7">
      <div
        v-for="token in PALETTE_TOKENS"
        :key="token.cssVar"
        class="space-y-2 rounded-sm bg-asphalt-surface p-3"
        :class="token.cardClass"
      >
        <div class="flex h-16 items-end rounded-sm p-1.5 text-[10px]" :class="token.swatchClass">
          {{ token.hex }}
        </div>
        <p class="font-bold" :class="token.varClass">
          {{ token.cssVar }}
        </p>
        <p class="text-[10px] text-highway-muted">
          {{ token.oklch }}
        </p>
        <p class="text-[10px]" :class="token.nameClass">
          {{ token.name }}
        </p>
      </div>
    </div>
  </section>
</template>
