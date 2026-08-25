import { PrismaApplicationRepository, PrismaDocumentBatchRepository, PrismaEvaluationRepository, PrismaResponsePlacementRepository, PrismaVisitRepository } from '../repositories/workflow-repositories'
import { prisma } from '../utils/prisma'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    event.context.workflowRepositories = {
      applications: new PrismaApplicationRepository(prisma, prisma),
      responses: new PrismaResponsePlacementRepository(prisma, prisma),
      visits: new PrismaVisitRepository(prisma, prisma),
      evaluations: new PrismaEvaluationRepository(prisma, prisma),
      documentBatches: new PrismaDocumentBatchRepository(prisma, prisma),
    }
  })
})
