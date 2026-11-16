import type { Ref } from 'vue'

export interface GlobalModalsState {
  isTripModalOpen: Ref<boolean>
  isExpenseModalOpen: Ref<boolean>
  openTripModal: () => void
  openExpenseModal: () => void
  closeModals: () => void
}

/**
 * Controla a abertura e o fechamento dos modais globais de Nova Viagem e Nova Despesa.
 */
export function useGlobalModals(): GlobalModalsState {
  const isTripModalOpen = useState<boolean>('estrada-trip-modal-open', () => false)
  const isExpenseModalOpen = useState<boolean>('estrada-expense-modal-open', () => false)

  function openTripModal(): void {
    isExpenseModalOpen.value = false
    isTripModalOpen.value = true
  }

  function openExpenseModal(): void {
    isTripModalOpen.value = false
    isExpenseModalOpen.value = true
  }

  function closeModals(): void {
    isTripModalOpen.value = false
    isExpenseModalOpen.value = false
  }

  return {
    isTripModalOpen,
    isExpenseModalOpen,
    openTripModal,
    openExpenseModal,
    closeModals,
  }
}
