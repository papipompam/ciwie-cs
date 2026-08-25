import { defineEventHandler, getRouterParam } from 'h3'
import { DomainError } from '../../../domain/errors'
import { assertFileDownloadable } from '../../../services/file-security-service'
import { assertCanDownloadFileVersion } from '../../../services/file-authorization-service'
import { createAuthorizedDownloadUrl } from '../../../services/storage-service'
import { getCorrelationId, getSessionActor, toHttpError } from '../../../utils/http'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try {
    const actor = await getSessionActor(event)
    const id = getRouterParam(event, 'id')
    if (!id) throw new DomainError('BAD_REQUEST', 'File version id is required')
    const file = await prisma.fileVersion.findUnique({ where: { id }, include: { file: true } })
    if (!file) throw new DomainError('NOT_FOUND', 'File was not found')
    await assertCanDownloadFileVersion(prisma, actor, file.id, file.createdById)
    assertFileDownloadable(file)
    const config = useRuntimeConfig(event).storage
    const url = await createAuthorizedDownloadUrl({
      endpoint: config.endpoint,
      region: config.region,
      bucket: config.bucket,
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    }, file.objectKey)
    return { url, expiresInSeconds: 60 }
  } catch (error) {
    return toHttpError(error, correlationId)
  }
})
