import { defineEventHandler } from 'h3'
import { validateUploadedFile } from '../../domain/file-validation'
import { previewStudentImport } from '../../services/student-import-service'
import { DomainError } from '../../domain/errors'
import { getCorrelationId, getSessionActor, toHttpError } from '../../utils/http'
import { prisma } from '../../utils/prisma'
import { readBoundedMultipartFormData } from '../../utils/multipart'

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try {
    const actor = await getSessionActor(event); const parts = await readBoundedMultipartFormData(event)
    const file = parts?.find(part => part.name === 'file' && part.filename); const coopTermId = parts?.find(part => part.name === 'coopTermId')?.data.toString('utf8')
    if (!file?.filename || !file.type || !coopTermId) throw new DomainError('BAD_REQUEST', 'file and coopTermId are required')
    const extension = file.filename.toLowerCase().endsWith('.xlsx') ? '.xlsx' as const : '.csv' as const
    validateUploadedFile({ filename: file.filename, mimeType: file.type, size: file.data.byteLength, head: file.data.subarray(0, 8) }, { extensions: ['.csv', '.xlsx'] })
    const config = useRuntimeConfig(event)
    return await previewStudentImport(prisma, actor, { content: file.data, filename: file.filename, mimeType: file.type, coopTermId, extension, storage: config.storage, clamav: config.antivirus })
  } catch (error) { return toHttpError(error, correlationId) }
})
