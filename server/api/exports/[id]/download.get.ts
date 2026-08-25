import { defineEventHandler, getRouterParam } from 'h3'
import { DomainError } from '../../../domain/errors'
import { assertFileDownloadable } from '../../../services/file-security-service'
import { authorizeExportDownload } from '../../../services/export-service'
import { createAuthorizedDownloadUrl } from '../../../services/storage-service'
import { getCorrelationId, getSessionActor, toHttpError } from '../../../utils/http'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => { const correlationId = getCorrelationId(event); try { const actor = await getSessionActor(event); const id = getRouterParam(event, 'id'); if (!id) throw new DomainError('BAD_REQUEST', 'Export id is required'); const fileVersion = await authorizeExportDownload(prisma, actor, id); assertFileDownloadable(fileVersion); return { url: await createAuthorizedDownloadUrl(useRuntimeConfig(event).storage, fileVersion.objectKey), expiresInSeconds: 60 } } catch (error) { return toHttpError(error, correlationId) } })
