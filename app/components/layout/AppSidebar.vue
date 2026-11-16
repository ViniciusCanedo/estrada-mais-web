<script setup lang="ts">
import { computed } from 'vue'
import TelemetrySyncBadge from './TelemetrySyncBadge.vue'
import AppRoadDivider from '../ui/AppRoadDivider.vue'

const props = withDefaults(
  defineProps<{
    tripsCount: number
    expensesCount: number
    isOnline: boolean
    isHealthy: boolean
    lastSyncLabel: string
    isDev?: boolean
    driverName?: string
    vehicleSummary?: string
  }>(),
  {
    isDev: () => import.meta.dev,
    driverName: 'Valdir Silveira',
    vehicleSummary: 'Scania R450 • 6x2',
  },
)

const emit = defineEmits<{
  logout: []
}>()

const route = useRoute()
const showDesignSystem = computed(() => props.isDev ?? import.meta.dev)

const driverInitials = computed(() => {
  const parts = props.driverName.trim().split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] ?? 'E'
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return `${first}${last}`.toUpperCase()
})

interface SidebarNavItem {
  to: string
  label: string
  icon: string
  iconClass: string
  testId: string
  badgeCount?: number
  badgeTestId?: string
  badgeTone?: 'neutral' | 'expense'
  isSpec?: boolean
}

const navItems = computed<SidebarNavItem[]>(() => {
  const items: SidebarNavItem[] = [
    {
      to: '/',
      label: 'Painel Principal',
      icon: 'i-lucide-layout-dashboard',
      iconClass: 'text-amber-default',
      testId: 'nav-dashboard',
    },
    {
      to: '/trips',
      label: 'Viagens (Trips)',
      icon: 'i-lucide-map',
      iconClass: 'text-current',
      testId: 'nav-trips',
      badgeCount: props.tripsCount,
      badgeTestId: 'sidebar-trips-count',
      badgeTone: 'neutral',
    },
    {
      to: '/expenses',
      label: 'Despesas (Ledger)',
      icon: 'i-lucide-circle-dollar-sign',
      iconClass: 'text-expense-blue',
      testId: 'nav-expenses',
      badgeCount: props.expensesCount,
      badgeTestId: 'sidebar-expenses-count',
      badgeTone: 'expense',
    },
  ]

  if (showDesignSystem.value) {
    items.push({
      to: '/design-system',
      label: 'Sistema de Design',
      icon: 'i-lucide-palette',
      iconClass: 'text-amber-default',
      testId: 'nav-design-system',
      isSpec: true,
    })
  }

  items.push({
    to: '/settings',
    label: 'Configurações',
    icon: 'i-lucide-settings',
    iconClass: 'text-current',
    testId: 'nav-settings',
  })

  return items
})

function isActiveRoute(path: string): boolean {
  return route.path === path
}
</script>

<template>
  <aside
    data-testid="sidebar-nav"
    class="z-20 flex w-64 shrink-0 flex-col justify-between border-r border-asphalt-border bg-asphalt-surface select-none"
  >
    <div>
      <div class="border-b border-asphalt-border p-5">
        <div class="flex items-center gap-3">
          <div
            class="relative flex size-10 items-center justify-center overflow-hidden rounded-sm border border-amber-default/40 bg-asphalt-bg shadow-inner"
          >
            <UIcon name="i-lucide-truck" class="size-6 text-amber-default" />
            <div class="absolute inset-x-0 bottom-0 h-0.5 bg-amber-default" />
          </div>
          <div>
            <div class="flex items-center gap-1.5">
              <span class="font-display text-2xl font-bold tracking-wider text-white uppercase">
                ESTRADA
              </span>
              <span class="font-display text-2xl font-bold text-amber-default">+</span>
            </div>
            <p class="font-mono text-[10px] tracking-widest text-highway-muted uppercase">
              Owner-Operator Telematics
            </p>
          </div>
        </div>
        <AppRoadDivider class="mt-4" />
      </div>

      <nav aria-label="Menu principal" class="space-y-1 p-3" data-testid="sidebar-menu">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          :data-testid="item.testId"
          :aria-current="isActiveRoute(item.to) ? 'page' : undefined"
          class="flex w-full items-center justify-between rounded-sm border-l-2 px-3.5 py-2.5 text-sm font-medium transition-all"
          :class="
            isActiveRoute(item.to)
              ? 'border-amber-default bg-asphalt-bg text-white shadow-xs'
              : 'border-transparent text-highway-muted hover:bg-asphalt-bg/60 hover:text-white'
          "
        >
          <span class="flex items-center gap-3">
            <UIcon :name="item.icon" class="size-4" :class="item.iconClass" />
            <span class="flex items-center gap-1.5 tracking-wide">
              <span>{{ item.label }}</span>
              <span
                v-if="item.isSpec"
                class="rounded-sm bg-amber-default/20 px-1 font-mono text-[10px] text-amber-default"
              >
                SPEC
              </span>
            </span>
          </span>

          <span
            v-if="item.badgeCount !== undefined"
            :data-testid="item.badgeTestId"
            class="rounded-sm border px-1.5 py-0.5 font-mono text-xs"
            :class="
              item.badgeTone === 'expense'
                ? 'border-expense-blue/30 bg-expense-blue/10 text-expense-blue'
                : 'border-asphalt-border bg-asphalt-surface-light text-highway-muted'
            "
          >
            {{ item.badgeCount }}
          </span>
        </NuxtLink>
      </nav>
    </div>

    <div class="space-y-3 border-t border-asphalt-border bg-asphalt-bg/40 p-4">
      <TelemetrySyncBadge
        :is-online="isOnline"
        :is-healthy="isHealthy"
        :last-sync-label="lastSyncLabel"
      />

      <div class="flex items-center justify-between pt-1">
        <div class="flex min-w-0 items-center gap-2.5">
          <div
            class="flex size-8 shrink-0 items-center justify-center rounded-sm border border-asphalt-border-light bg-asphalt-surface-light font-display text-sm font-bold text-amber-default"
          >
            {{ driverInitials }}
          </div>
          <div class="truncate">
            <p class="truncate text-xs/tight font-semibold text-white">
              {{ driverName }}
            </p>
            <p class="truncate font-mono text-[10px] text-highway-muted">
              {{ vehicleSummary }}
            </p>
          </div>
        </div>

        <button
          type="button"
          aria-label="Desconectar"
          title="Desconectar"
          data-testid="logout-btn"
          class="rounded-sm p-1.5 text-highway-muted transition-colors hover:bg-asphalt-surface hover:text-highway-red"
          @click="emit('logout')"
        >
          <UIcon name="i-lucide-log-out" class="size-4" />
        </button>
      </div>
    </div>
  </aside>
</template>
