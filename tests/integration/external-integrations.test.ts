import { createServer as createHttpServer } from 'node:http'
import { createServer as createTcpServer, type AddressInfo, type Server } from 'node:net'
import type { PrismaClient } from '@prisma/client'
import nodemailer from 'nodemailer'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SessionActor } from '../../shared/types/api'
import { processNextOutbox } from '../../server/services/outbox-worker-service'
import { checkRuntimeReadiness } from '../../server/services/readiness-service'
import { previewStudentImport } from '../../server/services/student-import-service'

const admin: SessionActor = { userId: 'admin-1', role: 'ADMIN', active: true, sessionVersion: 1 }
const servers: Server[] = []

afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => server.close(() => resolve()))))
})

async function listen(server: Server): Promise<number> {
  servers.push(server)
  await new Promise<void>((resolve, reject) => server.listen(0, '127.0.0.1', resolve).once('error', reject))
  return (server.address() as AddressInfo).port
}

async function createS3Double(): Promise<{ endpoint: string, objects: Map<string, Buffer> }> {
  const objects = new Map<string, Buffer>()
  const server = createHttpServer((request, response) => {
    const path = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname)
    if (request.method === 'HEAD' && (path === '/ciwie-private' || path === '/ciwie-private/')) { response.writeHead(200, { 'x-amz-bucket-region': 'us-east-1' }); response.end(); return }
    if (request.method === 'PUT' && path.startsWith('/ciwie-private/')) {
      const chunks: Buffer[] = []
      request.on('data', chunk => chunks.push(Buffer.from(chunk)))
      request.on('end', () => { objects.set(path.slice('/ciwie-private/'.length), Buffer.concat(chunks)); response.writeHead(200, { etag: '"local-etag"' }); response.end() })
      return
    }
    if (request.method === 'DELETE' && path.startsWith('/ciwie-private/')) { objects.delete(path.slice('/ciwie-private/'.length)); response.writeHead(204); response.end(); return }
    response.writeHead(404); response.end()
  })
  const port = await listen(server)
  return { endpoint: `http://127.0.0.1:${port}`, objects }
}

async function createClamAvDouble(result: 'OK' | 'FOUND' = 'OK'): Promise<number> {
  const server = createTcpServer((socket) => {
    let request = Buffer.alloc(0)
    socket.on('data', (chunk) => {
      request = Buffer.concat([request, chunk])
      if (request.includes(Buffer.from('zPING\0'))) socket.end('PONG\0')
      else if (request.includes(Buffer.from('zINSTREAM\0')) && request.length >= 14 && request.subarray(-4).equals(Buffer.alloc(4))) socket.end(`stream: ${result}\0`)
    })
  })
  return await listen(server)
}

async function createSmtpDouble(): Promise<{ port: number, messages: string[] }> {
  const messages: string[] = []
  const server = createTcpServer((socket) => {
    socket.setEncoding('utf8')
    socket.write('220 localhost ESMTP\r\n')
    let buffer = ''; let dataMode = false
    socket.on('data', (chunk) => {
      buffer += chunk
      while (true) {
        if (dataMode) {
          const end = buffer.indexOf('\r\n.\r\n')
          if (end < 0) return
          messages.push(buffer.slice(0, end)); buffer = buffer.slice(end + 5); dataMode = false; socket.write('250 2.0.0 queued\r\n')
          continue
        }
        const end = buffer.indexOf('\r\n')
        if (end < 0) return
        const command = buffer.slice(0, end); buffer = buffer.slice(end + 2)
        if (/^(EHLO|HELO)/i.test(command)) socket.write('250-localhost\r\n250 PIPELINING\r\n')
        else if (/^(MAIL FROM|RCPT TO)/i.test(command)) socket.write('250 2.1.0 ok\r\n')
        else if (/^DATA/i.test(command)) { dataMode = true; socket.write('354 End data with <CR><LF>.<CR><LF>\r\n') }
        else if (/^QUIT/i.test(command)) { socket.end('221 2.0.0 bye\r\n'); return }
        else socket.write('250 2.0.0 ok\r\n')
      }
    })
  })
  return { port: await listen(server), messages }
}

describe('local-isolated external integration paths', () => {
  it('probes database, S3-compatible storage, and ClamAV over their real protocols', async () => {
    const storage = await createS3Double(); const clamavPort = await createClamAvDouble()
    const db = { $queryRaw: vi.fn().mockResolvedValue([{ ok: 1 }]) } as unknown as PrismaClient
    await expect(checkRuntimeReadiness(db, { endpoint: storage.endpoint, region: 'us-east-1', bucket: 'ciwie-private', accessKeyId: 'local', secretAccessKey: 'local-secret' }, { host: '127.0.0.1', port: clamavPort }))
      .resolves.toEqual({ database: 'ok', storage: 'ok', scanner: 'ok' })
  })

  it('scans an import then uploads the exact clean bytes through the AWS S3 adapter', async () => {
    const storage = await createS3Double(); const clamavPort = await createClamAvDouble()
    const content = new TextEncoder().encode('studentCode,firstNameTh,lastNameTh,email\n65000001,เอ,บี,a@example.com\n')
    const create = vi.fn().mockResolvedValue({ id: 'import-1' })
    const db = {
      coopTerm: { findUnique: vi.fn().mockResolvedValue({ isActive: true }) }, studentProfile: { findMany: vi.fn().mockResolvedValue([]) },
      user: { findMany: vi.fn().mockResolvedValue([]) },
      importJob: { findUnique: vi.fn().mockResolvedValue(null), create },
    } as unknown as PrismaClient
    await expect(previewStudentImport(db, admin, { content, filename: 'students.csv', mimeType: 'text/csv', coopTermId: 'term-1', extension: '.csv', storage: { endpoint: storage.endpoint, region: 'us-east-1', bucket: 'ciwie-private', accessKeyId: 'local', secretAccessKey: 'local-secret' }, clamav: { host: '127.0.0.1', port: clamavPort } }))
      .resolves.toMatchObject({ id: 'import-1', counts: { NEW: 1 } })
    expect([...storage.objects.keys()]).toHaveLength(1)
    expect([...storage.objects.values()][0]).toEqual(Buffer.from(content))
    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({ status: 'PREVIEW_READY', sourceFileVersion: { create: expect.objectContaining({ scanStatus: 'CLEAN' }) } }) })
  })

  it('fails closed on a positive malware result before writing to object storage', async () => {
    const storage = await createS3Double(); const clamavPort = await createClamAvDouble('FOUND')
    const db = { coopTerm: { findUnique: vi.fn().mockResolvedValue({ isActive: true }) } } as unknown as PrismaClient
    await expect(previewStudentImport(db, admin, { content: new TextEncoder().encode('studentCode,firstNameTh,lastNameTh\n65000001,เอ,บี\n'), filename: 'students.csv', mimeType: 'text/csv', coopTermId: 'term-1', extension: '.csv', storage: { endpoint: storage.endpoint, region: 'us-east-1', bucket: 'ciwie-private', accessKeyId: 'local', secretAccessKey: 'local-secret' }, clamav: { host: '127.0.0.1', port: clamavPort } }))
      .rejects.toThrow('contains malware')
    expect(storage.objects.size).toBe(0)
  })

  it('claims an outbox event, creates its in-app notification, and delivers SMTP mail', async () => {
    const smtp = await createSmtpDouble()
    const transport = nodemailer.createTransport({ host: '127.0.0.1', port: smtp.port, secure: false, ignoreTLS: true })
    const update = vi.fn().mockResolvedValue({})
    const db = {
      outboxMessage: {
        findFirst: vi.fn().mockResolvedValue({ id: 'outbox-1', status: 'PENDING', attempts: 0, eventType: 'DOCUMENT_REQUESTED', aggregateType: 'DocumentRequest', aggregateId: 'request-1', dedupeKey: 'request-1' }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }), update,
      },
      documentRequest: { findUnique: vi.fn().mockResolvedValue({ studentTerm: { student: { user: { id: 'student-user', email: 'student@example.com' } } } }) },
      notification: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({ id: 'notification-1' }) },
    } as unknown as PrismaClient
    await expect(processNextOutbox(db, transport, 'noreply@example.com')).resolves.toBe(true)
    expect(smtp.messages).toHaveLength(1)
    expect(smtp.messages[0]).toContain('X-Ciwie-Dedupe-Key: request-1:student-user')
    expect(update).toHaveBeenCalledWith({ where: { id: 'outbox-1' }, data: expect.objectContaining({ status: 'SENT', lastError: null }) })
  })
})
