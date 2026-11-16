import type { ExpenseDto } from '../../shared/schemas/expense.schema'
import type {
  DashboardSummaryResponse,
  ReportDriverProfile,
} from '../../shared/schemas/report.schema'
import type { TripDto } from '../../shared/schemas/trip.schema'
import type { ExpenseCategory, PaymentMethod } from '../../shared/types/domain'
import type { MonthlyRawAggregates } from '../repositories/report.repository'
import { fromCents } from '../../shared/utils/units'

const CSV_INJECTION_PREFIX_PATTERN = /^[=+\-@\t\r]/

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  combustivel: 'Combustível',
  pedagio: 'Pedágio',
  borracharia: 'Borracharia',
  manutencao: 'Manutenção',
  alimentacao: 'Alimentação',
  outros: 'Outras',
}

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cartao_frota: 'Cartão Frota',
  cartao_debito: 'Cartão de Débito',
  pix: 'PIX Direto',
  dinheiro: 'Dinheiro em Espécie',
  boleto: 'Faturado / Boleto',
}

/**
 * Sanitiza células textuais contra CSV Injection prefixando aspas simples antes do escape RFC 4180.
 */
export function sanitizeCsvTextCell(value: string | null | undefined): string {
  const raw = value ?? ''
  const neutralized = CSV_INJECTION_PREFIX_PATTERN.test(raw) ? `'${raw}` : raw
  const singleLine = neutralized.replace(/\r?\n|\r/g, ' ')
  if (/[;"]/.test(singleLine)) {
    return `"${singleLine.replaceAll('"', '""')}"`
  }
  return singleLine
}

function formatCsvNumber(value: number, fractionDigits = 2): string {
  return value.toFixed(fractionDigits).replace('.', ',')
}

function formatCsvDateBr(isoDate: string): string {
  return `${isoDate.slice(8, 10)}/${isoDate.slice(5, 7)}/${isoDate.slice(0, 4)}`
}

function joinCsvRow(cells: readonly string[]): string {
  return cells.join(';')
}

function buildMetadataLines(
  driverProfile: ReportDriverProfile,
  summary: DashboardSummaryResponse,
): string[] {
  return [
    'RELATÓRIO MENSAL CONTÁBIL - ESTRADA+',
    joinCsvRow([
      'Motorista',
      sanitizeCsvTextCell(driverProfile.name),
      'RNTRC',
      sanitizeCsvTextCell(driverProfile.rntrc),
      'Veículo',
      sanitizeCsvTextCell(driverProfile.vehicleModel),
      'Placas',
      sanitizeCsvTextCell(driverProfile.vehiclePlates),
      'Competência',
      sanitizeCsvTextCell(`${summary.monthLabel} (${summary.month})`),
    ]),
    '',
  ]
}

function buildSummaryLines(summary: DashboardSummaryResponse, raw: MonthlyRawAggregates): string[] {
  const rows: Array<[string, string]> = [
    ['Total KM Rodados', String(summary.stats.kmDriven.totalKm)],
    ['Média Diesel (km/L)', formatCsvNumber(summary.stats.dieselAverage.kmPerLiter)],
    ['Custo Médio Operacional (R$/km)', formatCsvNumber(summary.hero.costPerKmReais)],
    ['Fretes Brutos (R$)', formatCsvNumber(summary.stats.netMargin.grossFreightReais)],
    ['Total Despesas (R$)', formatCsvNumber(summary.stats.netMargin.totalExpensesReais)],
    ['Sobra Líquida (R$)', formatCsvNumber(summary.stats.netMargin.netMarginReais)],
    ['Margem Líquida (%)', formatCsvNumber(summary.stats.netMargin.marginPercent, 1)],
    ['Combustível (R$)', formatCsvNumber(fromCents(raw.expensesByCategoryCents.combustivel))],
    ['Pedágios (R$)', formatCsvNumber(fromCents(raw.expensesByCategoryCents.pedagio))],
    ['Borracharia (R$)', formatCsvNumber(fromCents(raw.expensesByCategoryCents.borracharia))],
    ['Manutenção (R$)', formatCsvNumber(fromCents(raw.expensesByCategoryCents.manutencao))],
    ['Alimentação (R$)', formatCsvNumber(fromCents(raw.expensesByCategoryCents.alimentacao))],
    ['Outras Despesas (R$)', formatCsvNumber(fromCents(raw.expensesByCategoryCents.outros))],
  ]

  return [
    'RESUMO MENSAL (LIVRO-CAIXA)',
    'Indicador;Valor',
    ...rows.map(([label, value]) => joinCsvRow([sanitizeCsvTextCell(label), value])),
    '',
  ]
}

function buildTripLines(tripsList: readonly TripDto[]): string[] {
  const header =
    'Data;NF-e/CT-e;Origem;Destino;Carga (ton);KM Inicial;KM Final;Distância (km);Diesel (L);Média (km/L);Custo Diesel (R$);Pedágio (R$);Frete Bruto (R$)'

  const rows = tripsList.map((trip) =>
    joinCsvRow([
      formatCsvDateBr(trip.tripDate),
      sanitizeCsvTextCell(trip.invoiceNumber),
      sanitizeCsvTextCell(trip.origin),
      sanitizeCsvTextCell(trip.destination),
      trip.cargoWeightTons !== null ? formatCsvNumber(trip.cargoWeightTons, 1) : '',
      String(trip.kmStart),
      String(trip.kmEnd),
      String(trip.distanceKm),
      formatCsvNumber(trip.fuelLiters, 1),
      formatCsvNumber(trip.kmPerLiter, 2),
      formatCsvNumber(trip.fuelCostReais),
      formatCsvNumber(trip.tollCostReais),
      formatCsvNumber(trip.freightValueReais),
    ]),
  )

  return ['VIAGENS DO MÊS', header, ...rows, '']
}

function buildExpenseLines(expensesList: readonly ExpenseDto[]): string[] {
  const header =
    'Data;Categoria;Estabelecimento / Descrição;Litros (L);Preço/L (R$);Forma de Pagamento;Comprovante;Vínculo Viagem;Valor (R$)'

  const rows = expensesList.map((expense) =>
    joinCsvRow([
      formatCsvDateBr(expense.expenseDate),
      sanitizeCsvTextCell(CATEGORY_LABELS[expense.category]),
      sanitizeCsvTextCell(expense.description),
      expense.fuelLiters !== null ? formatCsvNumber(expense.fuelLiters, 1) : '',
      expense.pricePerLiterReais !== null ? formatCsvNumber(expense.pricePerLiterReais, 2) : '',
      sanitizeCsvTextCell(PAYMENT_LABELS[expense.paymentMethod]),
      sanitizeCsvTextCell(expense.receiptReference ?? 'Sem comprovante'),
      expense.isTripLinked ? `Viagem #${expense.tripId}` : 'Avulsa',
      formatCsvNumber(expense.amountReais),
    ]),
  )

  return ['DESPESAS DO MÊS', header, ...rows]
}

export interface MonthlyCsvBuildInput {
  driverProfile: ReportDriverProfile
  summary: DashboardSummaryResponse
  rawAggregates: MonthlyRawAggregates
  trips: readonly TripDto[]
  expenses: readonly ExpenseDto[]
}

/**
 * Monta o conteúdo CSV contábil completo em UTF-8 com BOM (\uFEFF) e separador ponto e vírgula.
 */
export function buildMonthlyAccountingCsv(input: MonthlyCsvBuildInput): string {
  const lines = [
    ...buildMetadataLines(input.driverProfile, input.summary),
    ...buildSummaryLines(input.summary, input.rawAggregates),
    ...buildTripLines(input.trips),
    ...buildExpenseLines(input.expenses),
  ]

  return `\uFEFF${lines.join('\r\n')}`
}
