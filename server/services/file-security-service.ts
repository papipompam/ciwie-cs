import { createConnection } from 'node:net'
import { DomainError } from '../domain/errors'

export interface MalwareScanner {
  scan(content: Uint8Array): Promise<'CLEAN' | 'INFECTED'>
}

export interface FileScanRepository {
  markPending(fileVersionId: string): Promise<void>
  markClean(fileVersionId: string): Promise<void>
  markRejected(fileVersionId: string, reason: string): Promise<void>
}

export async function scanUploadedFile(
  repository: FileScanRepository,
  scanner: MalwareScanner,
  fileVersionId: string,
  content: Uint8Array,
): Promise<'CLEAN' | 'REJECTED'> {
  await repository.markPending(fileVersionId)
  try {
    const result = await scanner.scan(content)
    if (result === 'INFECTED') {
      await repository.markRejected(fileVersionId, 'Malware detected')
      return 'REJECTED'
    }
    await repository.markClean(fileVersionId)
    return 'CLEAN'
  } catch {
    await repository.markRejected(fileVersionId, 'Malware scanner unavailable')
    throw new DomainError('DEPENDENCY_UNAVAILABLE', 'File scan could not be completed; download remains blocked')
  }
}

export function assertFileDownloadable(file: { scanStatus: string, objectKey?: string | null }): asserts file is { scanStatus: 'CLEAN', objectKey: string } {
  if (file.scanStatus !== 'CLEAN' || !file.objectKey) {
    throw new DomainError('FORBIDDEN', 'File is not available for download')
  }
}

export class ClamAvTcpScanner implements MalwareScanner {
  constructor(
    private readonly host: string,
    private readonly port: number,
    private readonly timeoutMs = 15_000,
  ) {}

  async scan(content: Uint8Array): Promise<'CLEAN' | 'INFECTED'> {
    if (!this.host || !Number.isInteger(this.port) || this.port < 1) throw new Error('Invalid ClamAV configuration')
    return await new Promise((resolve, reject) => {
      const socket = createConnection({ host: this.host, port: this.port })
      const chunks: Buffer[] = []
      const timeout = setTimeout(() => socket.destroy(new Error('ClamAV scan timeout')), this.timeoutMs)
      socket.on('error', reject)
      socket.on('data', chunk => chunks.push(Buffer.from(chunk)))
      socket.on('close', () => {
        clearTimeout(timeout)
        const response = Buffer.concat(chunks).toString('utf8')
        if (response.includes(' FOUND')) resolve('INFECTED')
        else if (response.includes(' OK')) resolve('CLEAN')
        else reject(new Error('Unexpected ClamAV response'))
      })
      socket.on('connect', () => {
        socket.write('zINSTREAM\0')
        const length = Buffer.alloc(4)
        length.writeUInt32BE(content.byteLength)
        socket.write(length)
        socket.write(content)
        socket.end(Buffer.alloc(4))
      })
    })
  }
}
