<script setup lang="ts">
import type { TripDto } from '#shared/schemas/trip.schema'

const open = defineModel<boolean>('open', { default: false })

withDefaults(
  defineProps<{
    trip: TripDto | null
    deleting?: boolean
    portal?: boolean
  }>(),
  {
    deleting: false,
    portal: true,
  },
)

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const deleteModalUi = {
  overlay: 'bg-black/80 backdrop-blur-xs',
  content:
    'border border-highway-red/60 bg-asphalt-surface max-w-md divide-y divide-asphalt-border',
  header: 'bg-asphalt-bg px-6 py-4',
  title: 'font-display text-lg font-bold tracking-wide text-white uppercase',
  description: 'font-mono text-xs text-highway-muted',
  body: 'p-6',
  footer: 'justify-end gap-3 px-6 py-4',
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Excluir Viagem"
    description="Esta ação também removerá os lançamentos de diesel e pedágio vinculados."
    :portal="portal"
    :ui="deleteModalUi"
  >
    <template #body>
      <p v-if="trip" data-testid="delete-trip-confirm-text" class="text-sm text-highway-fg">
        Confirma a exclusão da viagem
        <strong class="text-white">{{ trip.origin }} → {{ trip.destination }}</strong
        >?
      </p>
    </template>

    <template #footer>
      <UButton
        type="button"
        label="Cancelar"
        color="neutral"
        variant="outline"
        data-testid="cancel-delete-trip-btn"
        @click="emit('cancel')"
      />
      <UButton
        type="button"
        label="Confirmar Exclusão"
        color="error"
        :loading="deleting"
        data-testid="confirm-delete-trip-btn"
        @click="emit('confirm')"
      />
    </template>
  </UModal>
</template>
