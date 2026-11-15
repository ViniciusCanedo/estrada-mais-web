import { defineStore } from 'pinia'

export interface CounterStoreState {
  count: Ref<number>
  doubleCount: ComputedRef<number>
  increment: () => void
  reset: () => void
}

export const useCounterStore = defineStore('counter', (): CounterStoreState => {
  const count = ref(0)
  const doubleCount = computed((): number => count.value * 2)

  function increment(): void {
    count.value += 1
  }

  function reset(): void {
    count.value = 0
  }

  return {
    count,
    doubleCount,
    increment,
    reset,
  }
})
