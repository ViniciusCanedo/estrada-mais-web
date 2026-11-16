<script setup lang="ts">
interface RecentSectionViewAll {
  to: string
  label: string
  className: string
  testId: string
}

defineProps<{
  cardTestId: string
  title: string
  dotClass: string
  viewAll: RecentSectionViewAll
  isEmpty: boolean
  emptyText: string
  emptyTestId: string
}>()
</script>

<template>
  <section
    :data-testid="cardTestId"
    class="flex flex-col justify-between rounded-lg border border-asphalt-border bg-asphalt-surface p-5"
  >
    <div>
      <div class="mb-3 flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <span class="size-2 rounded-full" :class="dotClass" aria-hidden="true" />
          <h3 class="font-display text-base tracking-wide text-white uppercase">
            {{ title }}
          </h3>
        </div>
        <NuxtLink
          :to="viewAll.to"
          :data-testid="viewAll.testId"
          class="flex items-center gap-1 font-mono text-xs hover:underline"
          :class="viewAll.className"
        >
          <span>{{ viewAll.label }}</span>
          <span aria-hidden="true">&rarr;</span>
        </NuxtLink>
      </div>

      <p
        v-if="isEmpty"
        :data-testid="emptyTestId"
        class="rounded-sm border border-asphalt-border bg-asphalt-bg/60 p-4 font-mono text-xs text-highway-muted"
      >
        {{ emptyText }}
      </p>

      <div v-else class="overflow-x-auto">
        <slot />
      </div>
    </div>
  </section>
</template>
