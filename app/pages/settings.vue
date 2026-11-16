<script setup lang="ts">
import { ref, type Ref } from 'vue'
import type {
  UpdateCredentialsInput,
  UpdateDriverProfileInput,
  UpdateTelemetryTargetsInput,
} from '#shared/schemas/settings.schema'
import AccountingExportCard from '~/components/settings/AccountingExportCard.vue'
import DriverProfileForm from '~/components/settings/DriverProfileForm.vue'
import SecurityCredentialsForm from '~/components/settings/SecurityCredentialsForm.vue'
import TelemetryTargetsCard from '~/components/settings/TelemetryTargetsCard.vue'
import { extractAuthErrorMessage } from '~/composables/useAuthSession'
import { useCompetencePeriod } from '~/composables/useCompetencePeriod'
import { useDriverSettings } from '~/composables/useDriverSettings'

useHead({
  title: 'Configurações | Estrada+',
})

const toast = useToast()
const { selectedMonth, formattedMonthLabel } = useCompetencePeriod()
const { settings, pending, error, refresh, saveProfile, saveCredentials, saveTargets } =
  useDriverSettings()

const savingProfile = ref(false)
const profileError = ref<string | null>(null)
const savingCredentials = ref(false)
const credentialsError = ref<string | null>(null)
const savingTargets = ref(false)
const targetsError = ref<string | null>(null)

async function runSettingsMutation(options: {
  savingRef: Ref<boolean>
  errorRef: Ref<string | null>
  execute: () => Promise<unknown>
  successTitle: string
  fallbackError: string
}): Promise<void> {
  options.savingRef.value = true
  options.errorRef.value = null

  try {
    await options.execute()
    toast.add({
      title: options.successTitle,
      color: 'success',
      icon: 'i-lucide-check-circle-2',
    })
  } catch (caught: unknown) {
    options.errorRef.value = extractAuthErrorMessage(caught, options.fallbackError)
  } finally {
    options.savingRef.value = false
  }
}

async function handleSaveProfile(payload: UpdateDriverProfileInput): Promise<void> {
  await runSettingsMutation({
    savingRef: savingProfile,
    errorRef: profileError,
    execute: () => saveProfile(payload),
    successTitle: 'Alterações cadastrais salvas com sucesso.',
    fallbackError: 'Não foi possível salvar os dados cadastrais.',
  })
}

async function handleSaveCredentials(payload: UpdateCredentialsInput): Promise<void> {
  await runSettingsMutation({
    savingRef: savingCredentials,
    errorRef: credentialsError,
    execute: () => saveCredentials(payload),
    successTitle: 'Credenciais de acesso atualizadas com sucesso.',
    fallbackError: 'Não foi possível atualizar as credenciais de acesso.',
  })
}

async function handleSaveTargets(payload: UpdateTelemetryTargetsInput): Promise<void> {
  await runSettingsMutation({
    savingRef: savingTargets,
    errorRef: targetsError,
    execute: () => saveTargets(payload),
    successTitle: 'Metas operacionais atualizadas com sucesso.',
    fallbackError: 'Não foi possível salvar as metas de telemetria.',
  })
}
</script>

<template>
  <div data-testid="screen-settings" class="space-y-6">
    <div class="border-b border-asphalt-border pb-4">
      <span class="font-mono text-xs tracking-widest text-amber-default uppercase">
        CONFIGURAÇÕES DO SISTEMA
      </span>
      <h1 class="mt-1 font-display text-3xl font-bold text-white uppercase">
        Perfil do Motorista &amp; Parâmetros do Veículo
      </h1>
      <p class="mt-1 text-sm text-highway-muted">
        Gerencie dados cadastrais, credenciais de acesso e metas operacionais de telemetria.
      </p>
    </div>

    <div
      v-if="pending && !settings"
      data-testid="settings-loading-state"
      class="rounded-lg border border-asphalt-border bg-asphalt-surface p-6 font-mono text-sm text-highway-muted"
    >
      Carregando configurações do motorista...
    </div>

    <UAlert
      v-else-if="error && !settings"
      color="error"
      variant="subtle"
      data-testid="settings-error-state"
      title="Não foi possível carregar as configurações"
      description="Verifique sua sessão ou tente atualizar os dados novamente."
    >
      <template #actions>
        <UButton
          label="Tentar novamente"
          color="neutral"
          variant="outline"
          size="xs"
          data-testid="settings-retry-btn"
          @click="refresh()"
        />
      </template>
    </UAlert>

    <div
      v-else-if="!settings"
      data-testid="settings-empty-state"
      class="rounded-lg border border-asphalt-border bg-asphalt-surface p-6 font-mono text-sm text-highway-muted"
    >
      Nenhum perfil de motorista encontrado para esta sessão.
    </div>

    <div v-else class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div class="space-y-6 lg:col-span-2">
        <DriverProfileForm
          :profile="settings"
          :saving="savingProfile"
          :error-message="profileError"
          @submit="handleSaveProfile"
        />

        <SecurityCredentialsForm
          :email="settings.email"
          :updated-at="settings.updatedAt"
          :saving="savingCredentials"
          :error-message="credentialsError"
          @submit="handleSaveCredentials"
        />
      </div>

      <div class="space-y-6">
        <TelemetryTargetsCard
          :target-consumption-km-l="settings.targetConsumptionKmL"
          :max-cost-per-km-reais="settings.maxCostPerKmReais"
          :saving="savingTargets"
          :error-message="targetsError"
          @submit="handleSaveTargets"
        />

        <AccountingExportCard :month="selectedMonth" :month-label="formattedMonthLabel" />
      </div>
    </div>
  </div>
</template>
