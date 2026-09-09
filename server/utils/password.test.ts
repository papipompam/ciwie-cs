import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from './password'

describe('password hashing', () => {
  it('verifies the original password without storing it in plaintext', async () => {
    const hash = await hashPassword('Cwie@2569')

    expect(hash).not.toContain('Cwie@2569')
    await expect(verifyPassword('Cwie@2569', hash)).resolves.toBe(true)
    await expect(verifyPassword('wrong-password', hash)).resolves.toBe(false)
  })
})
