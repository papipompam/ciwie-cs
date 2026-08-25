import { defineEventHandler, getRouterParam } from 'h3'
import { DomainError } from '../../domain/errors'
import { allowedApplicationTransitions } from '../../services/application-service'
import { getCorrelationId, getSessionActor, toHttpError } from '../../utils/http'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try {
    const actor = await getSessionActor(event); const id = getRouterParam(event, 'id')
    const item = id ? await prisma.application.findFirst({
      where: { id, ...(actor.role === 'STUDENT' ? { studentTermId: actor.studentTermId } : actor.role === 'LECTURER' ? { coopTerm: { isActive: true } } : {}) },
      include: {
        coopTerm: { select: { isActive: true } },
        workSite: { include: { organization: true } },
        studentTerm: { include: { student: true } },
        histories: { orderBy: { createdAt: 'desc' } },
        evidenceFiles: { include: { fileVersion: { select: { id: true, mimeType: true, sizeBytes: true, scanStatus: true, file: { select: { originalFilename: true } } } } } },
      },
    }) : null
    if (!item) throw new DomainError('NOT_FOUND', 'Application was not found')
    const allowedTransitions = allowedApplicationTransitions({ id: item.id, studentTermId: item.studentTermId, status: item.status, version: item.version, activeTerm: item.coopTerm.isActive }, actor)
    return {
      ...item,
      evidenceFiles: item.evidenceFiles.map(evidence => ({ id: evidence.id, fileVersionId: evidence.fileVersionId, visibility: evidence.visibility, filename: evidence.fileVersion.file.originalFilename, mimeType: evidence.fileVersion.mimeType, sizeBytes: evidence.fileVersion.sizeBytes.toString(), scanStatus: evidence.fileVersion.scanStatus })),
      studentName: `${item.studentTerm.student.firstNameTh} ${item.studentTerm.student.lastNameTh}`,
      allowedTransitions,
      capabilities: { transition: allowedTransitions.length > 0 },
    }
  } catch (error) { return toHttpError(error, correlationId) }
})
