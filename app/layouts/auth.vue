<script setup lang="ts">
import AppRoadDivider from '../components/ui/AppRoadDivider.vue'
</script>

<template>
  <div
    data-testid="auth-layout"
    class="flex min-h-screen flex-col items-center justify-center bg-asphalt-bg px-4 py-10 text-highway-fg"
  >
    <div class="w-full max-w-md space-y-6">
      <div class="flex flex-col items-center text-center">
        <div
          class="relative mb-3 flex size-12 items-center justify-center overflow-hidden rounded-sm border border-amber-default/50 bg-asphalt-surface shadow-inner"
        >
          <UIcon name="i-lucide-truck" class="size-7 text-amber-default" />
          <div class="absolute inset-x-0 bottom-0 h-0.5 bg-amber-default" />
        </div>

        <div class="flex items-center gap-1.5">
          <span class="font-display text-3xl font-bold tracking-wider text-white uppercase">
            ESTRADA
          </span>
          <span class="font-display text-3xl font-bold text-amber-default">+</span>
        </div>

        <p class="mt-1 font-mono text-[11px] tracking-widest text-highway-muted uppercase">
          Owner-Operator Telematics
        </p>
      </div>

      <main
        class="rounded-lg border border-amber-default/60 bg-asphalt-surface p-6 shadow-2xl sm:p-8"
      >
        <AppRoadDivider class="mb-6" />
        <slot />
      </main>

      <p class="text-center font-mono text-[11px] text-highway-muted">
        Telemetria Rodoviária • Sessão Criptografada
      </p>
    </div>
  </div>
</template>
