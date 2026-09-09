import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)
const keyLength = 64

export const hashPassword = async (password: string) => {
  const salt = randomBytes(16).toString('hex')
  const derivedKey = await scrypt(password, salt, keyLength) as Buffer
  return `scrypt$${salt}$${derivedKey.toString('hex')}`
}

export const verifyPassword = async (password: string, storedHash: string) => {
  const [algorithm, salt, encodedKey] = storedHash.split('$')
  if (algorithm !== 'scrypt' || !salt || !encodedKey) return false

  try {
    const storedKey = Buffer.from(encodedKey, 'hex')
    if (storedKey.length !== keyLength) return false
    const derivedKey = await scrypt(password, salt, keyLength) as Buffer
    return timingSafeEqual(storedKey, derivedKey)
  }
  catch {
    return false
  }
}
