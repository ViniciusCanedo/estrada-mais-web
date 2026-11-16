/**
 * Calcula as iniciais do motorista para exibição no avatar da Sidebar.
 */
export function computeInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) {
    return 'E'
  }

  const first = parts[0]?.[0] ?? 'E'
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return `${first}${last}`.toUpperCase()
}

/**
 * Resume o modelo do veículo para exibição compacta na Sidebar (ex.: "Scania R450 • 6x2").
 */
export function formatDriverSummary(vehicleModel: string): string {
  const trimmed = vehicleModel.trim()
  if (trimmed.length === 0) {
    return 'Frota TAC'
  }

  const withoutYear = trimmed.replace(/\(\d{4}\)/g, ' ')
  const tractionMatch = /\b(\d+x\d+)\b/i.exec(withoutYear)
  const traction = tractionMatch?.[1]?.toLowerCase() ?? ''
  const modelSource = tractionMatch ? withoutYear.replace(tractionMatch[0], ' ') : withoutYear
  const modelLabel = modelSource.trim().split(/\s+/).filter(Boolean).slice(0, 2).join(' ')

  if (modelLabel && traction) {
    return `${modelLabel} • ${traction}`
  }

  return modelLabel || traction || trimmed
}
