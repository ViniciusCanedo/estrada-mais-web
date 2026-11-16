<script setup lang="ts">
import { computed, useAttrs, useId } from 'vue'

defineOptions({
  inheritAttrs: false,
})

const modelValue = defineModel<string | number>({ default: '' })

const props = withDefaults(
  defineProps<{
    id?: string
    label: string
    prefix?: string
    suffix?: string
    tone?: 'amber' | 'expense'
    error?: string
    disabled?: boolean
    active?: boolean
  }>(),
  {
    id: '',
    prefix: '',
    suffix: '',
    tone: 'amber',
    error: '',
    disabled: false,
    active: false,
  },
)

const attrs = useAttrs()
const fallbackId = useId()
const inputId = computed(() => props.id || fallbackId)
const messageId = computed(() => `${inputId.value}-message`)
const hasError = computed(() => Boolean(props.error))
const isExpense = computed(() => props.tone === 'expense')

const rootClass = computed(() => attrs.class)
const inputAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => key !== 'class' && key !== 'id')),
)

const labelColorClass = computed(() => {
  if (hasError.value) {
    return 'text-highway-red'
  }
  if (props.active) {
    return isExpense.value ? 'text-expense-blue' : 'text-amber-default'
  }
  return isExpense.value
    ? 'text-highway-muted group-focus-within:text-expense-blue'
    : 'text-highway-muted group-focus-within:text-amber-default'
})

const boxClass = computed(() => {
  if (hasError.value) {
    return 'border border-highway-red bg-asphalt-bg'
  }
  if (props.disabled) {
    return 'border border-asphalt-border bg-asphalt-surface-light'
  }
  if (props.active) {
    return isExpense.value
      ? 'border-2 border-expense-blue bg-asphalt-bg shadow-[0_0_10px_rgba(122,168,255,0.2)]'
      : 'border-2 border-amber-default bg-asphalt-bg shadow-[0_0_10px_rgba(255,180,0,0.2)]'
  }
  return isExpense.value
    ? 'border border-asphalt-border bg-asphalt-bg focus-within:border-expense-blue focus-within:shadow-[0_0_10px_rgba(122,168,255,0.18)]'
    : 'border border-asphalt-border bg-asphalt-bg focus-within:border-amber-default focus-within:shadow-[0_0_10px_rgba(255,180,0,0.2)]'
})

const prefixClass = computed(() => {
  if (hasError.value) {
    return 'border-r border-highway-red bg-highway-red/20 text-highway-red'
  }
  if (props.disabled) {
    return 'border-r border-asphalt-border bg-asphalt-bg text-highway-muted'
  }
  const toneColor = isExpense.value ? 'text-expense-blue' : 'text-amber-default'
  return `border-r border-asphalt-border bg-asphalt-surface-light ${toneColor}`
})

const suffixClass = computed(() => {
  if (hasError.value) {
    return 'border-l border-highway-red bg-highway-red/20 text-highway-red'
  }
  if (props.disabled) {
    return 'border-l border-asphalt-border bg-asphalt-bg text-highway-muted'
  }
  return 'border-l border-asphalt-border bg-asphalt-surface-light text-highway-muted'
})

const inputTextClass = computed(() => {
  if (hasError.value) {
    return 'text-highway-red'
  }
  if (props.disabled) {
    return 'cursor-not-allowed text-highway-muted'
  }
  return 'text-white placeholder:text-highway-muted-dark'
})
</script>

<template>
  <div
    class="group space-y-1.5"
    :class="[rootClass, { 'cursor-not-allowed opacity-50': disabled }]"
  >
    <label :for="inputId" class="block space-y-1.5">
      <span class="block font-mono text-xs transition-colors" :class="labelColorClass">
        {{ label }}
      </span>

      <span class="flex overflow-hidden rounded-sm transition-all" :class="boxClass">
        <span
          v-if="prefix"
          class="flex items-center px-3 py-2 font-mono text-xs font-bold"
          :class="prefixClass"
        >
          {{ prefix }}
        </span>

        <input
          :id="inputId"
          v-model="modelValue"
          v-bind="inputAttrs"
          :disabled="disabled"
          :aria-invalid="hasError ? 'true' : undefined"
          :aria-describedby="error || $slots.hint ? messageId : undefined"
          class="w-full bg-transparent px-3 py-2 font-mono text-sm outline-none"
          :class="inputTextClass"
        />

        <span
          v-if="suffix"
          class="flex items-center px-3 py-2 font-mono text-xs"
          :class="suffixClass"
        >
          {{ suffix }}
        </span>
      </span>
    </label>

    <p v-if="error" :id="messageId" role="alert" class="font-mono text-[10px] text-highway-red">
      {{ error }}
    </p>
    <p v-else-if="$slots.hint" :id="messageId" class="font-mono text-[10px] text-highway-muted">
      <slot name="hint" />
    </p>
  </div>
</template>
