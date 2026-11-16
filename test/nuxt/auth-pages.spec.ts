import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { extractAuthErrorMessage, useAuthSession } from '~/composables/useAuthSession'
import AuthLayout from '~/layouts/auth.vue'
import ForgotPasswordPage from '~/pages/forgot-password.vue'
import LoginPage from '~/pages/login.vue'
import ResetPasswordPage from '~/pages/reset-password.vue'
import { DEFAULT_DRIVER_EMAIL, DEFAULT_DRIVER_SECRET } from '../../server/database/seed-data'
import type { SessionUser } from '#shared/schemas/auth.schema'

const WRONG_CREDENTIAL = ['SenhaErrada', '2026'].join('@')
const NEW_CREDENTIAL = ['NovaSenha', '2026'].join('@')
const MISMATCH_CREDENTIAL = ['Diferente', '2026'].join('@')

const MOCK_USER: SessionUser = {
  id: 1,
  name: 'Valdir Silveira',
  email: DEFAULT_DRIVER_EMAIL,
  initials: 'VS',
  vehicleSummary: 'Scania R450 • 6x2',
}

let meAuthorized = false
let loginErrorCode: 0 | 401 | 429 = 0
let forgotRateLimited = false
let resetShouldFail = false

registerEndpoint('/api/auth/me', () => {
  if (!meAuthorized) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Sessão expirada ou não autenticada.',
    })
  }
  return { data: MOCK_USER }
})

registerEndpoint('/api/auth/login', {
  method: 'POST',
  handler: () => {
    if (loginErrorCode === 401) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized',
        message: 'E-mail ou senha inválidos.',
        data: { message: 'E-mail ou senha inválidos.' },
      })
    }
    if (loginErrorCode === 429) {
      throw createError({
        statusCode: 429,
        statusMessage: 'Too Many Requests',
        message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
        data: { message: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
      })
    }
    meAuthorized = true
    return { data: MOCK_USER }
  },
})

registerEndpoint('/api/auth/logout', {
  method: 'POST',
  handler: () => {
    meAuthorized = false
    return { success: true }
  },
})

registerEndpoint('/api/auth/forgot-password', {
  method: 'POST',
  handler: () => {
    if (forgotRateLimited) {
      throw createError({
        statusCode: 429,
        statusMessage: 'Too Many Requests',
        message: 'Muitas solicitações de recuperação de senha. Tente novamente em 15 minutos.',
        data: {
          message: 'Muitas solicitações de recuperação de senha. Tente novamente em 15 minutos.',
        },
      })
    }
    return {
      success: true,
      message:
        'Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha em instantes.',
    }
  },
})

registerEndpoint('/api/auth/reset-password', {
  method: 'POST',
  handler: () => {
    if (resetShouldFail) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Token de recuperação inválido, expirado ou já utilizado.',
        data: { message: 'Token de recuperação inválido, expirado ou já utilizado.' },
      })
    }
    return {
      success: true,
      message: 'Senha redefinida com sucesso.',
    }
  },
})

describe('Páginas de Autenticação, Layout Auth, Composable e Middleware Global', () => {
  beforeEach(() => {
    meAuthorized = false
    loginErrorCode = 0
    forgotRateLimited = false
    resetShouldFail = false
    const auth = useAuthSession()
    auth.user.value = null
    auth.hasLoadedSession.value = false
  })

  it('deve extrair mensagens legíveis em extractAuthErrorMessage com fallback seguro', () => {
    expect(extractAuthErrorMessage(null, 'Erro padrão')).toBe('Erro padrão')
    expect(
      extractAuthErrorMessage({ data: { message: 'E-mail ou senha inválidos.' } }, 'Fallback'),
    ).toBe('E-mail ou senha inválidos.')
    expect(extractAuthErrorMessage(new Error('Falha de rede'), 'Fallback')).toBe('Falha de rede')
    expect(extractAuthErrorMessage(new Error('[POST] "/api/auth/login": 500'), 'Fallback')).toBe(
      'Fallback',
    )
  })

  it('deve renderizar o AuthLayout Night Highway com marca ESTRADA+ e slot', async () => {
    const wrapper = await mountSuspended(AuthLayout, {
      slots: {
        default: () => 'Formulário de Autenticação',
      },
    })

    expect(wrapper.find('[data-testid="auth-layout"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('ESTRADA')
    expect(wrapper.text()).toContain('Formulário de Autenticação')
  })

  it('deve proteger rotas operacionais e redirecionar corretamente no middleware auth.global.ts', async () => {
    const router = useRouter()
    meAuthorized = false

    await router.push('/')
    expect(router.currentRoute.value.path).toBe('/login')

    await router.push('/trips/')
    expect(router.currentRoute.value.path).toBe('/login')

    await router.push('/forgot-password')
    expect(router.currentRoute.value.path).toBe('/forgot-password')

    meAuthorized = true
    useAuthSession().hasLoadedSession.value = false
    await router.push('/login')
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('deve validar loginSchema no UForm, exibir erros HTTP e autenticar com sucesso em login.vue', async () => {
    const wrapper = await mountSuspended(LoginPage, {
      route: '/login?reset=success',
    })

    expect(wrapper.find('[data-testid="login-reset-success-alert"]').exists()).toBe(true)

    await wrapper.find('[data-testid="login-email-input"]').setValue('email-invalido')
    await wrapper.find('[data-testid="login-password-input"]').setValue('123')
    await wrapper.find('form').trigger('submit')
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Informe um endereço de e-mail válido.')
      expect(
        (wrapper.find('[data-testid="login-email-input"]').element as HTMLInputElement).disabled,
      ).toBe(false)
    })

    loginErrorCode = 401
    await wrapper.find('[data-testid="login-email-input"]').setValue(DEFAULT_DRIVER_EMAIL)
    await wrapper.find('[data-testid="login-password-input"]').setValue(WRONG_CREDENTIAL)
    await wrapper.find('form').trigger('submit')
    await vi.waitFor(() => {
      expect(wrapper.find('[data-testid="login-error-alert"]').text()).toContain(
        'E-mail ou senha inválidos.',
      )
    })

    loginErrorCode = 429
    await wrapper.find('form').trigger('submit')
    await vi.waitFor(() => {
      expect(wrapper.find('[data-testid="login-error-alert"]').text()).toContain(
        'Muitas tentativas',
      )
    })

    loginErrorCode = 0
    await wrapper.find('[data-testid="login-password-input"]').setValue(DEFAULT_DRIVER_SECRET)
    await wrapper.find('form').trigger('submit')
    await vi.waitFor(() => {
      expect(useAuthSession().user.value).toEqual(MOCK_USER)
    })
  })

  it('deve enviar solicitação de Magic Link e exibir confirmação ou rate limit em forgot-password.vue', async () => {
    const wrapper = await mountSuspended(ForgotPasswordPage, {
      route: '/forgot-password',
    })

    await wrapper.find('[data-testid="forgot-email-input"]').setValue(DEFAULT_DRIVER_EMAIL)
    await wrapper.find('form').trigger('submit')
    await vi.waitFor(() => {
      expect(wrapper.find('[data-testid="forgot-success-alert"]').text()).toContain(
        'Se o e-mail estiver cadastrado',
      )
    })

    forgotRateLimited = true
    await wrapper.find('form').trigger('submit')
    await vi.waitFor(() => {
      expect(wrapper.find('[data-testid="forgot-error-alert"]').text()).toContain(
        'Muitas solicitações',
      )
    })
  })

  it('deve validar senhas divergentes com resetPasswordSchema, detectar token ausente e concluir redefinição em reset-password.vue', async () => {
    const missingTokenWrapper = await mountSuspended(ResetPasswordPage, {
      route: '/reset-password',
    })
    expect(missingTokenWrapper.find('[data-testid="reset-missing-token-alert"]').exists()).toBe(
      true,
    )

    const validToken = 'a'.repeat(64)
    const wrapper = await mountSuspended(ResetPasswordPage, {
      route: `/reset-password?token=${validToken}`,
    })

    await wrapper.find('[data-testid="reset-password-input"]').setValue(NEW_CREDENTIAL)
    await wrapper.find('[data-testid="reset-confirm-password-input"]').setValue(MISMATCH_CREDENTIAL)
    await wrapper.find('form').trigger('submit')
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('As senhas informadas não coincidem.')
      expect(
        (wrapper.find('[data-testid="reset-confirm-password-input"]').element as HTMLInputElement)
          .disabled,
      ).toBe(false)
    })

    resetShouldFail = true
    await wrapper.find('[data-testid="reset-confirm-password-input"]').setValue(NEW_CREDENTIAL)
    await wrapper.find('form').trigger('submit')
    await vi.waitFor(() => {
      expect(wrapper.find('[data-testid="reset-error-alert"]').text()).toContain(
        'Token de recuperação inválido',
      )
    })

    resetShouldFail = false
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    await vi.waitFor(() => {
      expect(wrapper.find('[data-testid="reset-error-alert"]').exists()).toBe(false)
    })
  })

  it('deve gerenciar fetchSession, force refresh e logout no composable useAuthSession', async () => {
    const auth = useAuthSession()
    meAuthorized = true

    const first = await auth.fetchSession()
    expect(first).toEqual(MOCK_USER)

    meAuthorized = false
    const cached = await auth.fetchSession()
    expect(cached).toEqual(MOCK_USER)

    const forced = await auth.fetchSession(true)
    expect(forced).toBeNull()
    expect(auth.isAuthenticated.value).toBe(false)

    await auth.login({ email: MOCK_USER.email, password: DEFAULT_DRIVER_SECRET })
    expect(auth.isAuthenticated.value).toBe(true)

    await auth.logout()
    expect(auth.user.value).toBeNull()
  })
})
