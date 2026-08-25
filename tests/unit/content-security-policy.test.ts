import { describe, expect, it } from 'vitest'
import { buildHtmlContentSecurityPolicy } from '../../server/utils/content-security-policy'

describe('HTML content security policy', () => {
  it('hashes Nuxt inline payloads without allowing arbitrary inline scripts', () => {
    const policy = buildHtmlContentSecurityPolicy('<html><script>window.__NUXT__={}</script><script src="/entry.js"></script></html>')

    expect(policy).toContain("script-src 'self' 'sha256-")
    expect(policy).not.toContain("script-src 'self' 'unsafe-inline'")
    expect(policy).toContain("form-action 'self'")
  })
})
