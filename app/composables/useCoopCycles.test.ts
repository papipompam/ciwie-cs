import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'

const requestAwareFetch = vi.fn()

vi.mock('../utils/requestAwareFetch', () => ({ requestAwareFetch }))

const { useCoopCycles } = await import('./useCoopCycles')

describe('useCoopCycles', () => {
  let runMounted: () => void = () => undefined

  beforeEach(() => {
    const state = new Map<string, ReturnType<typeof ref>>()
    vi.stubGlobal('useState', (key: string, init: () => unknown) => {
      if (!state.has(key)) state.set(key, ref(init()))
      return state.get(key)
    })
    vi.stubGlobal('computed', computed)
    vi.stubGlobal('onMounted', (callback: () => void) => { runMounted = callback })
    requestAwareFetch.mockResolvedValue({ cycles: [] })
    requestAwareFetch.mockClear()
  })

  afterEach(() => vi.unstubAllGlobals())

  it('waits until mount before loading cycles', async () => {
    const cycles = useCoopCycles()

    expect(requestAwareFetch).not.toHaveBeenCalled()
    expect(cycles.status.value).toBe('idle')

    runMounted()
    await vi.waitFor(() => expect(cycles.status.value).toBe('success'))
    expect(requestAwareFetch).toHaveBeenCalledOnce()
  })
})
