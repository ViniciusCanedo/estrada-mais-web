import { z } from 'zod'

/**
 * Competência mensal no formato AAAA-MM compartilhada entre Top Bar, Dashboard, Viagens, Despesas e Relatórios.
 */
export const competenceMonthSchema = z
  .string({ error: 'O período de competência é obrigatório.' })
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'O período deve estar no formato AAAA-MM (ex.: 2026-09).')

/**
 * Query string opcional para filtragem por competência mensal.
 */
export const competenceQuerySchema = z.object({
  month: competenceMonthSchema.optional(),
})

export type CompetenceMonth = z.infer<typeof competenceMonthSchema>
export type CompetenceQuery = z.infer<typeof competenceQuerySchema>
