import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  stages: [
    { duration: '2m', target: 15 },
    { duration: '6m', target: 15 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800', 'p(99)<1500'],
    checks: ['rate>0.99'],
  },
}

export default function () {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000'
  const res = http.get(`${baseUrl}/api/health`)
  check(res, {
    'status 200': (r) => r.status === 200,
    'database connected': (r) => r.json('database') === 'connected',
  })
  sleep(1)
}
