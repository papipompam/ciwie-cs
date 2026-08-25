import { createHash, randomUUID } from 'node:crypto'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { defineEventHandler } from 'h3'
import { DomainError } from '../../domain/errors'
import { sanitizeOriginalFilename, validateUploadedFile } from '../../domain/file-validation'
import { ClamAvTcpScanner } from '../../services/file-security-service'
import { getCorrelationId, getSessionActor, toHttpError } from '../../utils/http'
import { prisma } from '../../utils/prisma'
import { readBoundedMultipartFormData } from '../../utils/multipart'

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try {
    const actor = await getSessionActor(event); const file = (await readBoundedMultipartFormData(event))?.find(part => part.name === 'file' && part.filename)
    if (!file?.filename || !file.type) throw new DomainError('BAD_REQUEST', 'file is required')
    validateUploadedFile({ filename: file.filename, mimeType: file.type, size: file.data.byteLength, head: file.data.subarray(0, 8) })
    const config = useRuntimeConfig(event); const scanner = new ClamAvTcpScanner(config.antivirus.host, config.antivirus.port)
    if (await scanner.scan(file.data) !== 'CLEAN') throw new DomainError('VALIDATION_FAILED', 'Uploaded file contains malware')
    const extension = `.${file.filename.split('.').pop()!.toLowerCase()}`; const objectKey = `uploads/${actor.userId}/${randomUUID()}${extension}`
    const client = new S3Client({ endpoint: config.storage.endpoint, region: config.storage.region, forcePathStyle: Boolean(config.storage.endpoint), credentials: { accessKeyId: config.storage.accessKeyId, secretAccessKey: config.storage.secretAccessKey } })
    await client.send(new PutObjectCommand({ Bucket: config.storage.bucket, Key: objectKey, Body: file.data, ContentType: file.type }))
    const stored = await prisma.storedFile.create({ data: { originalFilename: sanitizeOriginalFilename(file.filename), createdById: actor.userId, versions: { create: { revision: 1, objectKey, checksumSha256: createHash('sha256').update(file.data).digest('hex'), mimeType: file.type, extension, sizeBytes: file.data.byteLength, scanStatus: 'CLEAN', createdById: actor.userId } } }, include: { versions: true } })
    return { fileId: stored.id, fileVersionId: stored.versions[0]!.id }
  } catch (error) { return toHttpError(error, correlationId) }
})
