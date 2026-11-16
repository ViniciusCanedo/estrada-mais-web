<script setup lang="ts">
import type { TripDto } from '#shared/schemas/trip.schema'
import { toCents, toMilliKmL } from '#shared/utils/units'
import {
  formatCurrencyFromCents,
  formatKm,
  formatKmPerLiterFromMilli,
  formatShortDateBr,
} from '~/utils/formatters'
import RecentSectionCard from './RecentSectionCard.vue'

defineProps<{
  trips: readonly TripDto[]
  totalCount: number
}>()
</script>

<template>
  <RecentSectionCard
    card-test-id="recent-trips-card"
    title="Últimas Viagens Registradas"
    dot-class="bg-amber-default"
    :view-all="{
      to: '/trips',
      label: `Ver todas (${totalCount})`,
      className: 'text-amber-default',
      testId: 'recent-trips-view-all',
    }"
    :is-empty="trips.length === 0"
    empty-text="Nenhuma viagem registrada nesta competência."
    empty-test-id="recent-trips-empty"
  >
    <table class="w-full text-left text-xs">
      <thead>
        <tr class="border-b border-asphalt-border font-mono text-highway-muted">
          <th scope="col" class="pb-2 font-medium">DATA</th>
          <th scope="col" class="pb-2 font-medium">ROTA</th>
          <th scope="col" class="pb-2 text-right font-medium">DISTÂNCIA</th>
          <th scope="col" class="pb-2 text-right font-medium">MÉDIA</th>
          <th scope="col" class="pb-2 text-right font-medium">DIESEL</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-asphalt-border/60 font-mono">
        <tr
          v-for="trip in trips"
          :key="trip.id"
          data-testid="recent-trip-row"
          class="transition-colors hover:bg-asphalt-bg/60"
        >
          <td class="py-2.5 text-highway-muted">{{ formatShortDateBr(trip.tripDate) }}</td>
          <td class="py-2.5 font-sans font-medium text-white">
            {{ trip.origin }} &rarr; {{ trip.destination }}
          </td>
          <td class="py-2.5 text-right font-bold text-white">
            {{ formatKm(trip.distanceKm) }}
          </td>
          <td class="py-2.5 text-right font-semibold text-amber-default">
            {{ formatKmPerLiterFromMilli(toMilliKmL(trip.kmPerLiter)) }}
          </td>
          <td class="py-2.5 text-right text-white">
            {{ formatCurrencyFromCents(toCents(trip.fuelCostReais)) }}
          </td>
        </tr>
      </tbody>
    </table>
  </RecentSectionCard>
</template>
