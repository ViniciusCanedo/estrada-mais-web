import { healthResponseSchema, type HealthStatusPayload } from '../../shared/schemas/health.schema'
import { healthRepository, type IHealthRepository } from '../repositories/health.repository'
import { DomainError } from '../utils/domain-error'

export interface IHealthService {
  getHealthStatus(driverId?: number, month?: string): HealthStatusPayload
}

/**
 * Serviço de verificação de saúde da aplicação e da conexão com o SQLite.
 */
export class HealthService implements IHealthService {
  public constructor(private readonly repository: IHealthRepository = healthRepository) {}

  public getHealthStatus(driverId?: number, month?: string): HealthStatusPayload {
    if (!this.repository.pingDatabase()) {
      throw new DomainError('SERVICE_UNAVAILABLE', 'Banco de dados indisponível.')
    }

    const basePayload = {
      status: 'ok' as const,
      database: 'connected' as const,
      timestamp: new Date().toISOString(),
    }

    if (typeof driverId === 'number') {
      return healthResponseSchema.parse({
        ...basePayload,
        navigationCounts: this.repository.getNavigationCounts(driverId, month),
      })
    }

    return healthResponseSchema.parse(basePayload)
  }
}

export const healthService = new HealthService()
