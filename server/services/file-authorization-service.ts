import type { PrismaClient } from '@prisma/client'
import type { SessionActor } from '../../shared/types/api'
import { DomainError } from '../domain/errors'

export async function assertCanDownloadFileVersion(db: PrismaClient, actor: SessionActor, fileVersionId: string, createdById: string): Promise<void> {
  if (actor.role === 'ADMIN' || createdById === actor.userId) return
  if (actor.role === 'LECTURER') {
    const [application, document, response, delivery] = await Promise.all([
      db.applicationEvidenceFile.count({ where: { fileVersionId, application: { coopTerm: { isActive: true } } } }),
      db.documentVersion.count({ where: { fileVersionId, batch: { coopTerm: { isActive: true } } } }),
      db.responseForm.count({ where: { fileVersionId, batch: { coopTerm: { isActive: true } } } }),
      db.deliveryEvidenceFile.count({ where: { fileVersionId, delivery: { batch: { coopTerm: { isActive: true } } } } }),
    ])
    if (application + document + response + delivery > 0) return
  }
  if (actor.role === 'STUDENT' && actor.studentTermId) {
    const [application, document, response, delivery, exportJob] = await Promise.all([
      db.applicationEvidenceFile.count({ where: { fileVersionId, application: { studentTermId: actor.studentTermId } } }),
      db.documentVersion.count({ where: { fileVersionId, batch: { members: { some: { studentTermId: actor.studentTermId } } } } }),
      db.responseForm.count({
        where: { fileVersionId, batch: { members: { some: { studentTermId: actor.studentTermId } } } },
      }),
      db.deliveryEvidenceFile.count({ where: { fileVersionId, delivery: { ownerUserId: actor.userId } } }),
      db.exportJob.count({ where: { fileVersionId, requestedById: actor.userId } }),
    ])
    if (application + document + response + delivery + exportJob > 0) return
  }
  throw new DomainError('NOT_FOUND', 'File was not found')
}
