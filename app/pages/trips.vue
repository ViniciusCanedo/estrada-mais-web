<script setup lang="ts">
import AppModulePlaceholder from '../components/ui/AppModulePlaceholder.vue'
import { useCompetencePeriod } from '../composables/useCompetencePeriod'
import { useGlobalModals } from '../composables/useGlobalModals'

const { formattedMonthLabel } = useCompetencePeriod()
const { openTripModal } = useGlobalModals()
</script>

<template>
  <div data-testid="screen-trips">
    <AppModulePlaceholder
      eyebrow="HISTÓRICO DE VIAGENS &amp; TELEMETRIA"
      title="Viagens Registradas"
      description="Gestão completa de rotas, odômetros, consumo médio em km/L e fretes será implementada na spec 05-viagens."
      :period-label="formattedMonthLabel"
    >
      <template #actions>
        <UButton
          label="Abrir Lançamento de Viagem"
          icon="i-lucide-map"
          color="neutral"
          variant="outline"
          @click="openTripModal()"
        />
      </template>
    </AppModulePlaceholder>
  </div>
</template>
