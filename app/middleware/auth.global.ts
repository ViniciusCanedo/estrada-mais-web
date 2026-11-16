import { useAuthSession } from '../composables/useAuthSession'

const PUBLIC_AUTH_ROUTES = new Set(['/login', '/forgot-password', '/reset-password'])

function normalizeRoutePath(path: string): string {
  if (path.length > 1 && path.endsWith('/')) {
    return path.slice(0, -1)
  }
  return path
}

/**
 * Middleware global que protege rotas operacionais e redireciona sessões ausentes para /login.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const { user, fetchSession } = useAuthSession()
  const normalizedPath = normalizeRoutePath(to.path)
  const isPublicRoute = PUBLIC_AUTH_ROUTES.has(normalizedPath)

  await fetchSession()

  if (!user.value && !isPublicRoute) {
    return navigateTo('/login', { replace: true })
  }

  if (user.value && normalizedPath === '/login') {
    return navigateTo('/', { replace: true })
  }
})
