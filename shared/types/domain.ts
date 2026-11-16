/**
 * Categorias operacionais de despesas registradas no Ledger do Estrada+.
 */
export const EXPENSE_CATEGORIES = [
  'combustivel',
  'pedagio',
  'borracharia',
  'manutencao',
  'alimentacao',
  'outros',
] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

/**
 * Meios de pagamento aceitos nos lançamentos de despesa.
 */
export const PAYMENT_METHODS = [
  'cartao_frota',
  'cartao_debito',
  'pix',
  'dinheiro',
  'boleto',
] as const

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

/**
 * Siglas oficiais das 27 Unidades Federativas do Brasil.
 */
export const BRAZILIAN_STATES = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
] as const

export type BrazilianState = (typeof BRAZILIAN_STATES)[number]

/**
 * Códigos semânticos de erro de domínio lançados pelos services e mapeados para HTTP.
 */
export type DomainErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'SERVICE_UNAVAILABLE'

/**
 * Envelope padrão da API para retorno de recurso único.
 */
export interface ApiItemResponse<T> {
  data: T
}

/**
 * Envelope padrão da API para listagens com metadados opcionais.
 */
export interface ApiListResponse<T, M = { total: number }> {
  data: T[]
  meta?: M
}

/**
 * Envelope padrão da API para ações sem entidade retornada (ex.: exclusão).
 */
export interface ApiSuccessResponse {
  success: true
}
