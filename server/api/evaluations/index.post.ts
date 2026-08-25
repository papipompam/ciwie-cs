import { defineEventHandler, readBody } from 'h3'
import { studentEvaluationDraftSchema } from '../../../shared/schemas/evaluation'
import { saveStudentEvaluationDraft } from '../../services/student-evaluation-draft-service'
import { getCorrelationId, getSessionActor, parseStrict, toHttpError } from '../../utils/http'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => { const correlationId = getCorrelationId(event); try { return await saveStudentEvaluationDraft(prisma, await getSessionActor(event), parseStrict(studentEvaluationDraftSchema, await readBody(event))) } catch (error) { return toHttpError(error, correlationId) } })
