<script setup lang="ts">
withDefaults(
  defineProps<{
    subtle?: boolean
  }>(),
  {
    subtle: false,
  },
)
</script>

<template>
  <div :class="subtle ? 'road-divider-subtle' : 'road-divider'" aria-hidden="true" />
</template>
