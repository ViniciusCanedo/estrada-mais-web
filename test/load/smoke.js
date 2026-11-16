import http from 'k6/http'
import { check, sleep } from 'k6'

const DEFAULT_EMAIL = 'valdir.silveira.truck@estrada.com.br'
const DEFAULT_PASS = ['Estrada', '2026'].join('@')

export const options = {
  vus: 3,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
    checks: ['rate>0.99'],
  },
}

export function setup() {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000'
  const loginRes = http.post(
    `${baseUrl}/api/auth/login`,
    JSON.stringify({
      email: __ENV.DRIVER_EMAIL || DEFAULT_EMAIL,
      password: __ENV.DRIVER_PASSWORD || DEFAULT_PASS,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  )

  const sessionCookies = loginRes.cookies['nuxt-session']
  const cookie =
    sessionCookies && sessionCookies.length > 0 ? `nuxt-session=${sessionCookies[0].value}` : ''
  return { cookie }
}

export default function (data) {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000'
  const healthRes = http.get(`${baseUrl}/api/health`)
  check(healthRes, { 'health status 200': (r) => r.status === 200 })

  if (data && data.cookie) {
    const dashRes = http.get(`${baseUrl}/api/reports/dashboard?month=2026-09`, {
      headers: { Cookie: data.cookie },
    })
    check(dashRes, {
      'dashboard status 200': (r) => r.status === 200,
      'dashboard month 2026-09': (r) => r.json('data.month') === '2026-09',
    })
  }

  sleep(1)
}
