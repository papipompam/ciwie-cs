import { describe, expect, it } from 'vitest'
import { readInitialAdminConfig } from '../../prisma/seed'

describe('initial admin seed configuration', () => {
  it('fails closed when bootstrap credentials are missing', () => {
    expect(() => readInitialAdminConfig({})).toThrow('INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD are required')
  })

  it('allows no-admin local setup only through an explicit skip flag', () => {
    expect(readInitialAdminConfig({ SKIP_INITIAL_ADMIN: 'true' })).toBeNull()
    expect(() => readInitialAdminConfig({ SKIP_INITIAL_ADMIN: 'TRUE' })).toThrow()
  })

  it('normalizes the required login email', () => {
    expect(readInitialAdminConfig({ INITIAL_ADMIN_EMAIL: ' Admin.Demo@BRU.AC.TH ', INITIAL_ADMIN_PASSWORD: 'long-password-123' }))
      .toEqual({ email: 'admin.demo@bru.ac.th', password: 'long-password-123' })
  })

  it.each(['admin', '   ', `${'a'.repeat(311)}@bru.ac.th`])('rejects an unusable admin email: %s', (email) => {
    expect(() => readInitialAdminConfig({ INITIAL_ADMIN_EMAIL: email, INITIAL_ADMIN_PASSWORD: 'long-password-123' }))
      .toThrow()
  })
})
