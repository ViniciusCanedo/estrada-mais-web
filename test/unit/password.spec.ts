import { describe, expect, it } from 'vitest'
import { hashPassword, hashTokenSha256, verifyPassword } from '../../server/utils/password'

describe('Utilitários Criptográficos de Senha e Token (server/utils/password)', () => {
  it('deve gerar hash scrypt com salt único e verificar senha correta com sucesso', async () => {
    const firstHash = await hashPassword('SenhaSegura@2026')
    const secondHash = await hashPassword('SenhaSegura@2026')

    expect(firstHash).toMatch(/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/)
    expect(firstHash).not.toBe(secondHash)
    await expect(verifyPassword('SenhaSegura@2026', firstHash)).resolves.toBe(true)
    await expect(verifyPassword('SenhaErrada@2026', firstHash)).resolves.toBe(false)
  })

  it('deve retornar false com segurança para hashes malformados sem lançar exceção', async () => {
    await expect(verifyPassword('qualquer', '')).resolves.toBe(false)
    await expect(verifyPassword('qualquer', 'hash-sem-separador')).resolves.toBe(false)
    await expect(verifyPassword('qualquer', 'bcrypt$salt$hash')).resolves.toBe(false)
    await expect(verifyPassword('qualquer', 'scrypt$$abcd')).resolves.toBe(false)
    await expect(verifyPassword('qualquer', 'scrypt$salt$abcd')).resolves.toBe(false)
  })

  it('deve gerar digest SHA-256 determinístico diferente do token bruto', () => {
    const rawToken = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2'
    const digestA = hashTokenSha256(rawToken)
    const digestB = hashTokenSha256(rawToken)
    const otherDigest = hashTokenSha256(`${rawToken}0`)

    expect(digestA).toMatch(/^[a-f0-9]{64}$/)
    expect(digestA).toBe(digestB)
    expect(digestA).not.toBe(rawToken)
    expect(digestA).not.toBe(otherDigest)
  })
})
