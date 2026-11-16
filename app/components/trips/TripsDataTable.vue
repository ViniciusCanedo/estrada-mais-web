<script setup lang="ts">
import type {
  TripDto,
  TripListSummaryDto,
  TripSortDirection,
  TripSortField,
} from '#shared/schemas/trip.schema'
import { toCents, toMilliKmL } from '#shared/utils/units'
import {
  formatCargoTons,
  formatCurrencyFromCents,
  formatDateBr,
  formatKm,
  formatKmPerLiterFromMilli,
} from '~/utils/formatters'

const props = defineProps<{
  trips: readonly TripDto[]
  summary: TripListSummaryDto
  sortBy: TripSortField
  sortDir: TripSortDirection
}>()

const emit = defineEmits<{
  sort: [column: TripSortField]
  edit: [trip: TripDto]
  delete: [trip: TripDto]
}>()

function sortIndicator(column: TripSortField): string {
  if (props.sortBy !== column) {
    return '▴▾'
  }
  return props.sortDir === 'asc' ? '▴' : '▾'
}

function formatKmPerLiterValue(kmPerLiter: number): string {
  return formatKmPerLiterFromMilli(toMilliKmL(kmPerLiter)).replace(' km/L', '')
}
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-asphalt-border bg-asphalt-surface">
    <div class="overflow-x-auto">
      <table data-testid="trips-data-table" class="w-full text-left text-xs">
        <thead>
          <tr
            class="border-b border-asphalt-border bg-asphalt-bg/80 font-mono text-[11px] text-highway-muted uppercase"
          >
            <th class="px-4 py-3">
              <button
                type="button"
                data-testid="sort-tripDate"
                class="flex items-center gap-1 uppercase transition-colors hover:text-white"
                @click="emit('sort', 'tripDate')"
              >
                <span>DATA</span>
                <span aria-hidden="true">{{ sortIndicator('tripDate') }}</span>
              </button>
            </th>
            <th class="px-4 py-3">
              <button
                type="button"
                data-testid="sort-route"
                class="flex items-center gap-1 uppercase transition-colors hover:text-white"
                @click="emit('sort', 'route')"
              >
                <span>ROTA (ORIGEM → DESTINO)</span>
                <span aria-hidden="true">{{ sortIndicator('route') }}</span>
              </button>
            </th>
            <th class="p-3">NF-E</th>
            <th class="p-3 text-right">CARGA</th>
            <th class="p-3 text-right">
              <button
                type="button"
                data-testid="sort-distanceKm"
                class="ml-auto flex items-center gap-1 uppercase transition-colors hover:text-white"
                @click="emit('sort', 'distanceKm')"
              >
                <span>KM RODADOS</span>
                <span aria-hidden="true">{{ sortIndicator('distanceKm') }}</span>
              </button>
            </th>
            <th class="p-3 text-right">
              <button
                type="button"
                data-testid="sort-kmPerLiter"
                class="ml-auto flex items-center gap-1 uppercase transition-colors hover:text-white"
                @click="emit('sort', 'kmPerLiter')"
              >
                <span>KM/L</span>
                <span aria-hidden="true">{{ sortIndicator('kmPerLiter') }}</span>
              </button>
            </th>
            <th class="p-3 text-right">DIESEL (R$)</th>
            <th class="p-3 text-right">PEDÁGIO</th>
            <th class="p-3 text-right">
              <button
                type="button"
                data-testid="sort-costPerKm"
                class="ml-auto flex items-center gap-1 uppercase transition-colors hover:text-white"
                @click="emit('sort', 'costPerKm')"
              >
                <span>CUSTO/KM</span>
                <span aria-hidden="true">{{ sortIndicator('costPerKm') }}</span>
              </button>
            </th>
            <th class="px-4 py-3 text-center">AÇÕES</th>
          </tr>
        </thead>

        <tbody class="divide-y divide-asphalt-border/60 font-mono">
          <tr
            v-for="trip in trips"
            :key="trip.id"
            data-testid="trip-row"
            :data-trip-id="trip.id"
            class="transition-all hover:border-l-2 hover:border-amber-default hover:bg-asphalt-bg/80"
          >
            <td class="px-4 py-3 text-highway-muted">{{ formatDateBr(trip.tripDate) }}</td>
            <td class="px-4 py-3 font-sans font-medium text-white">
              {{ trip.origin }} → {{ trip.destination }}
            </td>
            <td class="p-3 text-highway-muted">
              {{ trip.invoiceNumber ? `#${trip.invoiceNumber}` : '—' }}
            </td>
            <td class="p-3 text-right text-white">
              {{ trip.cargoWeightTons !== null ? formatCargoTons(trip.cargoWeightTons) : '—' }}
            </td>
            <td class="p-3 text-right font-bold text-white">
              {{ formatKm(trip.distanceKm) }}
            </td>
            <td class="p-3 text-right font-semibold text-amber-default">
              {{ formatKmPerLiterValue(trip.kmPerLiter) }}
            </td>
            <td class="p-3 text-right text-white">
              {{ formatCurrencyFromCents(toCents(trip.fuelCostReais)) }}
            </td>
            <td class="p-3 text-right text-white">
              {{ formatCurrencyFromCents(toCents(trip.tollCostReais)) }}
            </td>
            <td class="p-3 text-right font-bold text-amber-default">
              {{ formatCurrencyFromCents(toCents(trip.costPerKmReais)) }}
            </td>
            <td class="px-4 py-3 text-center">
              <div class="flex items-center justify-center gap-2 text-highway-muted">
                <button
                  type="button"
                  title="Editar"
                  :aria-label="`Editar viagem ${trip.origin} para ${trip.destination}`"
                  data-testid="edit-trip-btn"
                  class="rounded-sm p-1 transition-colors hover:text-amber-default"
                  @click="emit('edit', trip)"
                >
                  <UIcon name="i-lucide-pencil" class="size-3.5" />
                </button>
                <button
                  type="button"
                  title="Excluir"
                  :aria-label="`Excluir viagem ${trip.origin} para ${trip.destination}`"
                  data-testid="delete-trip-btn"
                  class="rounded-sm p-1 transition-colors hover:text-highway-red"
                  @click="emit('delete', trip)"
                >
                  <UIcon name="i-lucide-trash-2" class="size-3.5" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>

        <tfoot>
          <tr
            data-testid="trips-summary-footer"
            class="border-t-2 border-asphalt-border bg-asphalt-bg font-mono font-bold text-white"
          >
            <td colspan="4" class="px-4 py-3 text-highway-muted">
              TOTAIS ({{ trips.length }}
              {{ trips.length === 1 ? 'VIAGEM EXIBIDA' : 'VIAGENS EXIBIDAS' }})
            </td>
            <td data-testid="trips-summary-distance" class="p-3 text-right text-white">
              {{ formatKm(summary.totalDistanceKm) }}
            </td>
            <td data-testid="trips-summary-kml" class="p-3 text-right text-amber-default">
              {{ formatKmPerLiterFromMilli(toMilliKmL(summary.weightedAverageKmL)) }}
            </td>
            <td data-testid="trips-summary-fuel" class="p-3 text-right">
              {{ formatCurrencyFromCents(toCents(summary.totalFuelCostReais)) }}
            </td>
            <td data-testid="trips-summary-toll" class="p-3 text-right">
              {{ formatCurrencyFromCents(toCents(summary.totalTollCostReais)) }}
            </td>
            <td data-testid="trips-summary-cost-km" class="p-3 text-right text-amber-default">
              {{ formatCurrencyFromCents(toCents(summary.weightedCostPerKmReais)) }}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
</template>
