<script setup lang="ts">
defineProps<{
  eyebrow: string
  title: string
  description: string
  periodLabel: string
}>()
</script>

<template>
  <section class="space-y-6">
    <div class="border-b border-asphalt-border pb-4">
      <span class="font-mono text-xs tracking-widest text-amber-default uppercase">
        {{ eyebrow }}
      </span>
      <h1 class="mt-1 font-display text-3xl font-bold text-white uppercase">
        {{ title }}
      </h1>
      <p class="mt-1 text-sm text-highway-muted">
        {{ description }}
      </p>
    </div>

    <div class="rounded-lg border border-asphalt-border bg-asphalt-surface p-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="space-y-1">
          <p class="font-mono text-xs text-highway-muted uppercase">Competência Selecionada</p>
          <p data-testid="stub-competence-period" class="font-mono text-lg font-bold text-white">
            {{ periodLabel }}
          </p>
        </div>

        <div class="flex items-center gap-3">
          <slot name="actions" />
        </div>
      </div>
    </div>
  </section>
</template>
