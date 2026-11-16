<script setup lang="ts">
import { useCompetencePeriod } from '~/composables/useCompetencePeriod'
import { useGlobalModals } from '~/composables/useGlobalModals'

const { formattedMonthLabel } = useCompetencePeriod()
const { openExpenseModal } = useGlobalModals()
</script>

<template>
  <div data-testid="screen-expenses">
    <UiAppModulePlaceholder
      eyebrow="DIÁRIO CONTÁBIL OPERACIONAL"
      title="Despesas Operacionais"
      description="Ledger completo de diesel, pedágios, borracharia, manutenção e alimentação será implementado na spec 06-despesas."
      :period-label="formattedMonthLabel"
    >
      <template #actions>
        <UButton
          label="Abrir Lançamento de Despesa"
          icon="i-lucide-circle-dollar-sign"
          color="secondary"
          variant="outline"
          @click="openExpenseModal()"
        />
      </template>
    </UiAppModulePlaceholder>
  </div>
</template>
