import type { H3Event } from 'h3'
import type { ApplicationRepository } from '../services/application-service'
import type { EvaluationRepository } from '../services/evaluation-service'
import type { ResponsePlacementRepository } from '../services/response-placement-service'
import type { VisitRepository } from '../services/visit-service'
import type { DocumentBatchRepository } from '../services/document-batch-service'
import { DomainError } from '../domain/errors'

export interface WorkflowRepositories {
  applications: ApplicationRepository
  responses: ResponsePlacementRepository
  visits: VisitRepository
  evaluations: EvaluationRepository
  documentBatches: DocumentBatchRepository
}

export function getWorkflowRepositories(event: H3Event): WorkflowRepositories {
  const repositories = event.context.workflowRepositories as WorkflowRepositories | undefined
  if (!repositories) throw new DomainError('DEPENDENCY_UNAVAILABLE', 'Workflow repositories are not initialized')
  return repositories
}
