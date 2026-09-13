import { beforeEach, describe, expect, it, vi } from 'vitest'
import { requestAwareFetch } from './requestAwareFetch'

const fetch = vi.fn()
const reload = vi.fn()

vi.stubGlobal('$fetch', fetch)
vi.stubGlobal('window', { location: { reload } })

describe('requestAwareFetch', () => {
  beforeEach(() => {
    fetch.mockReset().mockResolvedValue({ ok: true })
    reload.mockReset()
  })

  it('reloads the browser after a successful mutation', async () => {
    await requestAwareFetch('/api/example', { method: 'PATCH' })

    expect(reload).toHaveBeenCalledOnce()
  })

  it('does not reload for reads or an explicitly deferred refresh', async () => {
    await requestAwareFetch('/api/example')
    await requestAwareFetch('/api/example', { method: 'POST', reload: false })

    expect(reload).not.toHaveBeenCalled()
  })
})
