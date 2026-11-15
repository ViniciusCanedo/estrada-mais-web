import { execFileSync } from 'node:child_process'

const BLOCKED_SEVERITIES = new Set(['high', 'critical'])

function runNpmAuditJson() {
  const npmCliPath = process.env.npm_execpath
  if (!npmCliPath) {
    throw new Error('Execute via npm run audit:check para disponibilizar npm_execpath.')
  }

  try {
    const stdout = execFileSync(process.execPath, [npmCliPath, 'audit', '--json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    return JSON.parse(stdout)
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'stdout' in error &&
      typeof error.stdout === 'string' &&
      error.stdout.length > 0
    ) {
      return JSON.parse(error.stdout)
    }
    throw error
  }
}

const report = runNpmAuditJson()
const vulnerabilities = report.vulnerabilities ?? {}
const blocking = Object.values(vulnerabilities).filter((vuln) =>
  BLOCKED_SEVERITIES.has(vuln.severity),
)

if (blocking.length > 0) {
  const details = blocking.map((v) => ` - ${v.name} (${v.severity})`).join('\n')
  process.stderr.write(
    `❌ Vulnerabilidades high/critical bloqueantes encontradas (${blocking.length}):\n${details}\n`,
  )
  process.exit(1)
}

process.stdout.write('✔ npm audit: 0 vulnerabilidades high/critical encontradas.\n')
