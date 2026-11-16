<script setup lang="ts">
import { useCompetencePeriod } from '~/composables/useCompetencePeriod'

const { formattedMonthLabel } = useCompetencePeriod()
</script>

<template>
  <div data-testid="screen-settings">
    <UiAppModulePlaceholder
      eyebrow="CONFIGURAÇÕES DO SISTEMA"
      title="Perfil do Motorista &amp; Parâmetros"
      description="Cadastro do motorista autônomo, credenciais de acesso e metas operacionais serão implementados na spec 04-configuracoes-e-perfil."
      :period-label="formattedMonthLabel"
    >
      <template #actions>
        <UButton
          to="/"
          label="Voltar ao Painel Principal"
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="outline"
        />
      </template>
    </UiAppModulePlaceholder>
  </div>
</template>
