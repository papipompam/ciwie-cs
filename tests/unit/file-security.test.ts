import { describe, expect, it, vi } from 'vitest'
import { validateUploadedFile } from '../../server/domain/file-validation'
import { assertFileDownloadable, scanUploadedFile } from '../../server/services/file-security-service'

describe('file security', () => {
  it('checks extension, MIME, size, and magic bytes', () => {
    expect(() => validateUploadedFile({ filename: 'response.pdf', mimeType: 'application/pdf', size: 20, head: new Uint8Array([0x25, 0x50, 0x44, 0x46]) })).not.toThrow()
    expect(() => validateUploadedFile({ filename: 'response.pdf', mimeType: 'application/pdf', size: 20, head: new Uint8Array([0x4D, 0x5A]) })).toThrow('signature')
  })

  it('fails closed when scanner is unavailable', async () => {
    const repository = { markPending: vi.fn(), markClean: vi.fn(), markRejected: vi.fn() }
    await expect(scanUploadedFile(repository, { scan: vi.fn().mockRejectedValue(new Error('offline')) }, 'file-1', new Uint8Array([1])))
      .rejects.toThrow('download remains blocked')
    expect(repository.markRejected).toHaveBeenCalledWith('file-1', 'Malware scanner unavailable')
    expect(repository.markClean).not.toHaveBeenCalled()
  })

  it('allows download only when clean and stored', () => {
    expect(() => assertFileDownloadable({ scanStatus: 'PENDING_SCAN', objectKey: 'object' })).toThrow()
    expect(() => assertFileDownloadable({ scanStatus: 'CLEAN', objectKey: 'object' })).not.toThrow()
  })
})
