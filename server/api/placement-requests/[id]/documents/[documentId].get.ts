import { requireUserSession } from '../../../../utils/session'
import { readStoredFile } from '../../../../utils/fileStorage'

export default defineEventHandler(async (event) => {
  const user = await requireUserSession(event, ['student', 'staff'])
  const requestId = getRouterParam(event, 'id')
  const documentId = getRouterParam(event, 'documentId')
  if (!requestId || !documentId) throw createError({ statusCode: 400, statusMessage: 'DOCUMENT_ID_REQUIRED' })
  const document = await usePrisma().letterDocumentVersion.findFirst({
    where: {
      id: documentId,
      placementRequestId: requestId,
      status: { not: 'CANCELLED' },
      ...(user.role === 'student' ? { placementRequest: { enrollment: { studentId: user.id } } } : {}),
    },
    select: {
      storageKey: true,
      originalFileName: true,
      mimeType: true,
    },
  })
  if (!document) throw createError({ statusCode: 404, statusMessage: 'DOCUMENT_NOT_FOUND' })
  let data: Buffer
  try { data = await readStoredFile(event, document.storageKey) }
  catch { throw createError({ statusCode: 404, statusMessage: 'DOCUMENT_FILE_NOT_FOUND' }) }
  setResponseHeader(event, 'content-type', document.mimeType)
  setResponseHeader(event, 'content-length', data.length)
  setResponseHeader(event, 'content-disposition', `attachment; filename="document.pdf"; filename*=UTF-8''${encodeURIComponent(document.originalFileName)}`)
  return data
})
