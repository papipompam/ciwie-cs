import { describe, expect, it } from 'vitest'
import { generateTemporaryPassword } from './temporaryPassword'

describe('generateTemporaryPassword', () => {
  it('generates a strong, printable temporary password', () => {
    const password = generateTemporaryPassword()

    expect(password).toHaveLength(16)
    expect(password).toMatch(/^[A-Za-z0-9]+$/)
  })

  it('generates different passwords for different accounts', () => {
    expect(generateTemporaryPassword()).not.toBe(generateTemporaryPassword())
  })
})
