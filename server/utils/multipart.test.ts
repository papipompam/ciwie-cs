import { describe, expect, it } from 'vitest'
import { normalizeMultipartContentType } from './multipart'

describe('multipart content type normalization', () => {
  it('unwraps a quoted boundary accepted by RFC-compatible clients', () => {
    expect(normalizeMultipartContentType('multipart/form-data; boundary="abc-123"'))
      .toBe('multipart/form-data; boundary=abc-123')
  })

  it('leaves an unquoted boundary unchanged', () => {
    const contentType = 'multipart/form-data; boundary=abc-123'
    expect(normalizeMultipartContentType(contentType)).toBe(contentType)
  })
})
