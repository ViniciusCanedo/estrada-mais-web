<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { computed, reactive, useId, watch } from 'vue'
import {
  expensePayloadSchema,
  type ExpenseDto,
  type ExpensePayloadInput,
} from '#shared/schemas/expense.schema'
import {
  EXPENSE_CATEGORY_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  buildExpenseFormState,
  normalizeExpensePayload,
  type ExpenseFormState,
} from '../../utils/expenses'
import AppRoadDivider from '../ui/AppRoadDivider.vue'
import AppUnitInput from '../ui/AppUnitInput.vue'

const open = defineModel<boolean>('open', { default: false })

const props = withDefaults(
  defineProps<{
    editingExpense?: ExpenseDto | null
    defaultDate: string
    saving?: boolean
    errorMessage?: string | null
  }>(),
  {
    editingExpense: null,
    saving: false,
    errorMessage: null,
  },
)

const emit = defineEmits<{
  submit: [payload: ExpensePayloadInput]
}>()

const categorySelectId = useId()
const paymentSelectId = useId()

const formState = reactive<ExpenseFormState>(
  buildExpenseFormState(props.editingExpense, props.defaultDate),
)

const isEditing = computed(() => props.editingExpense !== null)
const isFuelCategory = computed(() => formState.category === 'combustivel')

const fuelLitersInput = computed<string | number>({
  get: () => formState.fuelLiters ?? '',
  set: (value) => {
    if (value === '' || value === null) {
      formState.fuelLiters = null
      return
    }
    const parsed = typeof value === 'number' ? value : Number(value)
    formState.fuelLiters = Number.isFinite(parsed) ? parsed : null
  },
})

const amountReaisInput = computed<string | number>({
  get: () => formState.amountReais ?? '',
  set: (value) => {
    if (value === '' || value === null) {
      formState.amountReais = undefined
      return
    }
    const parsed = typeof value === 'number' ? value : Number(value)
    formState.amountReais = Number.isFinite(parsed) ? parsed : undefined
  },
})

watch(
  () => [open.value, props.editingExpense, props.defaultDate] as const,
  ([isOpen, nextEditing, nextDefaultDate]) => {
    if (isOpen) {
      Object.assign(formState, buildExpenseFormState(nextEditing, nextDefaultDate))
    }
  },
)

watch(
  () => formState.category,
  (nextCategory) => {
    if (nextCategory !== 'combustivel') {
      formState.fuelLiters = null
    }
  },
)

const expenseModalUi = {
  overlay: 'bg-black/80 backdrop-blur-xs',
  content:
    'border-2 border-expense-blue/70 bg-asphalt-surface max-w-xl divide-y divide-asphalt-border',
  header: 'bg-asphalt-bg px-6 py-4',
  title: 'font-display text-lg font-bold tracking-wide text-white uppercase',
  description: 'font-mono text-xs text-highway-muted',
  body: 'p-6',
}

function handleSubmit(event: FormSubmitEvent<ExpensePayloadInput>): void {
  emit('submit', normalizeExpensePayload(event.data))
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="isEditing ? 'Editar Despesa' : 'Lançar Nova Despesa'"
    description="Registro contábil de combustível, oficina e diárias"
    :ui="expenseModalUi"
  >
    <template #body>
      <div data-testid="modal-log-expense" class="space-y-4">
        <AppRoadDivider subtle />

        <UAlert
          v-if="errorMessage"
          color="error"
          variant="subtle"
          data-testid="expense-modal-error"
          :title="errorMessage"
        />

        <UForm
          :schema="expensePayloadSchema"
          :state="formState"
          class="space-y-4"
          @submit="handleSubmit"
        >
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <UFormField name="category">
              <label :for="categorySelectId" class="block space-y-1.5">
                <span class="block font-mono text-xs text-highway-muted">
                  Categoria da Despesa *
                </span>
                <select
                  :id="categorySelectId"
                  v-model="formState.category"
                  data-testid="expense-category-select"
                  class="w-full rounded-sm border border-asphalt-border bg-asphalt-bg px-3 py-2 text-sm text-white outline-none focus:border-expense-blue"
                >
                  <option
                    v-for="item in EXPENSE_CATEGORY_OPTIONS"
                    :key="item.value"
                    :value="item.value"
                  >
                    {{ item.formLabel }}
                  </option>
                </select>
              </label>
            </UFormField>

            <UFormField label="Data *" name="expenseDate" required>
              <UInput
                v-model="formState.expenseDate"
                type="date"
                class="w-full font-mono"
                data-testid="expense-date-input"
              />
            </UFormField>
          </div>

          <UFormField label="Estabelecimento / Descrição *" name="description" required>
            <UInput
              v-model="formState.description"
              type="text"
              placeholder="Ex: Posto Graal KM 120 ou Borracharia do Zé"
              class="w-full"
              data-testid="expense-description-input"
            />
          </UFormField>

          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <UFormField name="fuelLiters">
              <AppUnitInput
                v-model="fuelLitersInput"
                label="Litros (Se combustível)"
                suffix="L"
                tone="expense"
                type="number"
                step="0.1"
                placeholder="Ex: 350.0"
                :disabled="!isFuelCategory"
                data-testid="expense-liters-input"
              />
            </UFormField>

            <UFormField name="amountReais">
              <AppUnitInput
                v-model="amountReaisInput"
                label="Valor Total Pago (R$) *"
                prefix="R$"
                tone="expense"
                active
                type="number"
                step="0.01"
                placeholder="1680.00"
                data-testid="expense-amount-input"
              />
            </UFormField>
          </div>

          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <UFormField name="paymentMethod">
              <label :for="paymentSelectId" class="block space-y-1.5">
                <span class="block font-mono text-xs text-highway-muted">Forma de Pagamento</span>
                <select
                  :id="paymentSelectId"
                  v-model="formState.paymentMethod"
                  data-testid="expense-payment-select"
                  class="w-full rounded-sm border border-asphalt-border bg-asphalt-bg px-3 py-2 text-sm text-white outline-none focus:border-expense-blue"
                >
                  <option
                    v-for="method in PAYMENT_METHOD_OPTIONS"
                    :key="method.value"
                    :value="method.value"
                  >
                    {{ method.formLabel }}
                  </option>
                </select>
              </label>
            </UFormField>

            <UFormField label="Número do Cupom / NF-e" name="receiptReference">
              <UInput
                v-model="formState.receiptReference"
                type="text"
                placeholder="Ex: NF-e 99241"
                class="w-full font-mono"
                data-testid="expense-receipt-input"
              />
            </UFormField>
          </div>

          <div class="flex items-center justify-end gap-3 border-t border-asphalt-border pt-4">
            <UButton
              type="button"
              label="Cancelar"
              color="neutral"
              variant="outline"
              data-testid="expense-cancel-btn"
              @click="open = false"
            />
            <UButton
              type="submit"
              :loading="saving"
              :label="isEditing ? 'Salvar Alterações' : 'Salvar Despesa'"
              data-testid="expense-submit-btn"
              class="bg-expense-blue font-display text-sm font-semibold tracking-wider text-asphalt-bg uppercase hover:bg-expense-blue-dark"
            />
          </div>
        </UForm>
      </div>
    </template>
  </UModal>
</template>
