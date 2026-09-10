import { describe, expect, it, vi } from 'vitest'

const put = vi.fn(async () => ({
  url: 'https://blob.example/documents/2026/09/file.pdf',
  pathname: 'documents/2026/09/file.pdf',
}))
const get = vi.fn(async () => ({
  statusCode: 200 as const,
  stream: new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('%PDF-1.4\nblob'))
      controller.close()
    },
  }),
  headers: new Headers(),
  blob: { url: 'https://blob.example/documents/2026/09/file.pdf', pathname: 'documents/2026/09/file.pdf', contentType: 'application/pdf', size: 12 },
}))
const del = vi.fn(async () => undefined)

vi.mock('@vercel/blob', () => ({ put, get, del }))
vi.stubEnv('VERCEL', '1')
vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'test-token')
vi.stubGlobal('useRuntimeConfig', () => ({ fileStorageRoot: '.data/uploads' }))
vi.stubGlobal('createError', (details: { statusCode: number, statusMessage: string }) => Object.assign(new Error(details.statusMessage), details))

const { storePdf, readStoredFile, removeStoredFile } = await import('../server/utils/fileStorage')

describe('file storage on Vercel', () => {
  it('uses private Vercel Blob instead of the serverless filesystem', async () => {
    const event = {} as Parameters<typeof storePdf>[0]
    const stored = await storePdf(event, Buffer.from('%PDF-1.4\nblob'), 'เอกสาร.pdf')

    expect(put).toHaveBeenCalledWith(expect.stringMatching(/^documents\/\d{4}\/\d{2}\/.*\.pdf$/), expect.any(Buffer), expect.objectContaining({ access: 'private', contentType: 'application/pdf' }))
    expect(stored.storageKey).toBe('https://blob.example/documents/2026/09/file.pdf')
    await expect(readStoredFile(event, stored.storageKey)).resolves.toEqual(Buffer.from('%PDF-1.4\nblob'))
    await removeStoredFile(event, stored.storageKey)
    expect(del).toHaveBeenCalledWith(stored.storageKey)
  })
})
