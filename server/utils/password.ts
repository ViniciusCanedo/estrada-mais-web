import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

const SALT_BYTES = 16
const DERIVED_KEY_LENGTH = 64
const HASH_ALGORITHM_PREFIX = 'scrypt'

function deriveScryptKey(plain: string, saltHex: string, keyLength: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(plain, saltHex, keyLength, (error, derivedKey) => {
      if (error) {
        reject(error)
        return
      }
      resolve(derivedKey)
    })
  })
}

/**
 * Gera hash seguro com algoritmo scrypt e salt aleatório de 16 bytes no formato scrypt$salt$hash.
 */
export async function hashPassword(plain: string): Promise<string> {
  const saltHex = randomBytes(SALT_BYTES).toString('hex')
  const derivedKey = await deriveScryptKey(plain, saltHex, DERIVED_KEY_LENGTH)
  return `${HASH_ALGORITHM_PREFIX}$${saltHex}$${derivedKey.toString('hex')}`
}

/**
 * Verifica senha em texto puro contra hash armazenado utilizando comparação em tempo constante.
 */
export async function verifyPassword(plain: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split('$')
  if (parts.length !== 3) {
    return false
  }

  const [prefix, saltHex, expectedKeyHex] = parts
  if (prefix !== HASH_ALGORITHM_PREFIX || !saltHex || !expectedKeyHex) {
    return false
  }

  const expectedBuffer = Buffer.from(expectedKeyHex, 'hex')
  if (expectedBuffer.length !== DERIVED_KEY_LENGTH) {
    return false
  }

  const derivedBuffer = await deriveScryptKey(plain, saltHex, expectedBuffer.length)
  if (derivedBuffer.length !== expectedBuffer.length) {
    return false
  }

  return timingSafeEqual(derivedBuffer, expectedBuffer)
}

/**
 * Gera digest SHA-256 hexadecimal para persistência segura de tokens de uso único.
 */
export function hashTokenSha256(rawToken: string): string {
  return createHash('sha256').update(rawToken, 'utf8').digest('hex')
}
