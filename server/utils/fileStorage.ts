import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, normalize, resolve, sep } from 'node:path'
import type { H3Event } from 'h3'

const maxPdfBytes = 5 * 1024 * 1024

const storageRoot = (event: H3Event) => resolve(useRuntimeConfig(event).fileStorageRoot)
const isVercelRuntime = () => process.env.VERCEL === '1'
const hasBlobToken = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN)
const isBlobKey = (storageKey: string) => /^https?:\/\//i.test(storageKey)
let blobModulePromise: Promise<typeof import('@vercel/blob')> | undefined
const blobModule = () => blobModulePromise ??= import('@vercel/blob')

const requireBlobStorage = () => {
  if (!hasBlobToken()) throw createError({ statusCode: 503, statusMessage: 'DOCUMENT_STORAGE_NOT_CONFIGURED' })
}

export const storePdf = async (event: H3Event, data: Buffer, originalFileName: string) => {
  if (!data.length || data.length > maxPdfBytes) throw createError({ statusCode: 400, statusMessage: 'PDF_SIZE_INVALID' })
  if (extname(originalFileName).toLowerCase() !== '.pdf' || data.subarray(0, 5).toString('ascii') !== '%PDF-') {
    throw createError({ statusCode: 400, statusMessage: 'PDF_CONTENT_INVALID' })
  }
  const now = new Date()
  const storageKey = `documents/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${randomUUID()}.pdf`

  if (isVercelRuntime()) {
    requireBlobStorage()
    const { put } = await blobModule()
    const blob = await put(storageKey, data, {
      access: 'private',
      addRandomSuffix: false,
      contentType: 'application/pdf',
      cacheControlMaxAge: 60,
    })
    return {
      storageKey: blob.url,
      originalFileName: basename(originalFileName).slice(0, 255),
      mimeType: 'application/pdf',
      detectedMimeType: 'application/pdf',
      sizeBytes: BigInt(data.length),
      sha256: createHash('sha256').update(data).digest('hex'),
    }
  }

  const root = storageRoot(event)
  const target = resolve(root, normalize(storageKey))
  if (!target.startsWith(`${root}${sep}`)) throw createError({ statusCode: 500, statusMessage: 'FILE_STORAGE_PATH_INVALID' })
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, data, { flag: 'wx' })
  return {
    storageKey,
    originalFileName: basename(originalFileName).slice(0, 255),
    mimeType: 'application/pdf',
    detectedMimeType: 'application/pdf',
    sizeBytes: BigInt(data.length),
    sha256: createHash('sha256').update(data).digest('hex'),
  }
}

export const removeStoredFile = async (event: H3Event, storageKey: string) => {
  if (isBlobKey(storageKey)) {
    requireBlobStorage()
    const { del } = await blobModule()
    await del(storageKey)
    return
  }
  const root = storageRoot(event)
  const target = resolve(root, normalize(storageKey))
  if (target.startsWith(`${root}${sep}`)) await rm(target, { force: true })
}

export const readStoredFile = async (event: H3Event, storageKey: string) => {
  if (isBlobKey(storageKey)) {
    requireBlobStorage()
    const { get } = await blobModule()
    const blob = await get(storageKey, { access: 'private' })
    if (!blob || blob.statusCode !== 200) throw createError({ statusCode: 404, statusMessage: 'DOCUMENT_NOT_FOUND' })
    return Buffer.from(await new Response(blob.stream).arrayBuffer())
  }
  const root = storageRoot(event)
  const target = resolve(root, normalize(storageKey))
  if (!target.startsWith(`${root}${sep}`)) throw createError({ statusCode: 404, statusMessage: 'DOCUMENT_NOT_FOUND' })
  return readFile(target)
}
