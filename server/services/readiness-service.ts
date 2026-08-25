import { createConnection } from 'node:net'
import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3'
import type { PrismaClient } from '@prisma/client'
import type { PrivateStorageConfig } from './storage-service'

async function withTimeout<T>(work: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([work, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} timeout`)), timeoutMs) })])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export async function probeClamAv(host: string, port: number): Promise<void> {
  await withTimeout(new Promise<void>((resolve, reject) => {
    const socket = createConnection({ host, port })
    let response = ''
    socket.on('connect', () => socket.end('zPING\0'))
    socket.on('data', chunk => { response += chunk.toString('utf8') })
    socket.on('error', reject)
    socket.on('close', () => response.includes('PONG') ? resolve() : reject(new Error('ClamAV did not return PONG')))
  }), 2_000, 'ClamAV')
}

export async function probeReadiness(dependencies: { database: () => Promise<unknown>, storage: () => Promise<unknown>, scanner: () => Promise<unknown> }): Promise<Record<string, 'ok'>> {
  await Promise.all([dependencies.database(), dependencies.storage(), dependencies.scanner()])
  return { database: 'ok', storage: 'ok', scanner: 'ok' }
}

export async function checkRuntimeReadiness(db: PrismaClient, storage: PrivateStorageConfig, antivirus: { host: string, port: number }) {
  const client = new S3Client({ endpoint: storage.endpoint, region: storage.region, forcePathStyle: Boolean(storage.endpoint), ...(storage.accessKeyId && storage.secretAccessKey ? { credentials: { accessKeyId: storage.accessKeyId, secretAccessKey: storage.secretAccessKey } } : {}) })
  return await probeReadiness({
    database: () => withTimeout(db.$queryRaw`SELECT 1`, 2_000, 'Database'),
    storage: () => withTimeout(client.send(new HeadBucketCommand({ Bucket: storage.bucket })), 2_000, 'Storage'),
    scanner: () => probeClamAv(antivirus.host, antivirus.port),
  })
}
