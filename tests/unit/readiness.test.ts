import { describe, expect, it, vi } from 'vitest'
import { probeReadiness } from '../../server/services/readiness-service'

describe('readiness dependencies', () => {
  it('requires database, storage, and scanner', async () => {
    await expect(probeReadiness({ database: vi.fn().mockResolvedValue(1), storage: vi.fn().mockResolvedValue(1), scanner: vi.fn().mockResolvedValue(1) })).resolves.toEqual({ database: 'ok', storage: 'ok', scanner: 'ok' })
    await expect(probeReadiness({ database: vi.fn().mockResolvedValue(1), storage: vi.fn().mockRejectedValue(new Error('offline')), scanner: vi.fn().mockResolvedValue(1) })).rejects.toThrow('offline')
  })
})
