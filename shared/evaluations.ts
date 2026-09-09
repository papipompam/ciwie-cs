import { z } from 'zod'

export const evaluationRatingSchema = z.coerce.number().int().min(1).max(5)

export const studentRatingSchema = z.object({
  responsibility: evaluationRatingSchema,
  ethics: evaluationRatingSchema,
  communication: evaluationRatingSchema,
  knowledge: evaluationRatingSchema,
  work_quality: evaluationRatingSchema,
  problem_solving: evaluationRatingSchema,
}).strict()

const studentNotesSchema = z.object({
  strengths: z.string().trim().max(5000).default(''),
  issues: z.string().trim().max(5000).default(''),
  suggestions: z.string().trim().max(5000).default(''),
  followUp: z.string().trim().max(5000).default(''),
})

export const saveStudentEvaluationSchema = z.discriminatedUnion('status', [
  studentNotesSchema.extend({ status: z.literal('draft'), ratings: studentRatingSchema.partial() }).strict(),
  studentNotesSchema.extend({ status: z.literal('submitted'), ratings: studentRatingSchema }).strict(),
])

export const companyRatingSchema = z.object({
  field_relevance: evaluationRatingSchema,
  work_scope: evaluationRatingSchema,
  learning_opportunity: evaluationRatingSchema,
  supervisor_readiness: evaluationRatingSchema,
  student_support: evaluationRatingSchema,
  environment: evaluationRatingSchema,
  safety: evaluationRatingSchema,
  resources: evaluationRatingSchema,
  allowance: evaluationRatingSchema,
  transportation: evaluationRatingSchema,
  public_transport: evaluationRatingSchema,
  nearby_accommodation: evaluationRatingSchema,
  coordination: evaluationRatingSchema,
}).strict()

const companyRecommendationSchema = z.enum(['recommended', 'conditional', 'follow_up', 'not_recommended', 'safety_risk'])
const companyNotesSchema = z.object({
  observations: z.string().trim().max(5000).default(''),
  companyRequirements: z.string().trim().max(5000).default(''),
  issues: z.string().trim().max(5000).default(''),
  suggestions: z.string().trim().max(5000).default(''),
})

export const saveCompanyEvaluationSchema = z.discriminatedUnion('status', [
  companyNotesSchema.extend({
    status: z.literal('draft'),
    ratings: companyRatingSchema.partial(),
    recommendation: companyRecommendationSchema.optional(),
  }).strict(),
  companyNotesSchema.extend({
    status: z.literal('submitted'),
    ratings: companyRatingSchema,
    recommendation: companyRecommendationSchema,
  }).strict(),
])

const persistedEvaluationBaseSchema = z.object({
  appointmentId: z.string().trim().min(1).max(30),
  status: z.enum(['draft', 'submitted']),
  submittedAt: z.string().datetime().nullable(),
})
const persistedRatingSchema = z.enum(['1', '2', '3', '4', '5'])
const persistedStudentRatingsSchema = z.object({
  responsibility: persistedRatingSchema.optional(),
  ethics: persistedRatingSchema.optional(),
  communication: persistedRatingSchema.optional(),
  knowledge: persistedRatingSchema.optional(),
  work_quality: persistedRatingSchema.optional(),
  problem_solving: persistedRatingSchema.optional(),
}).strict()
const persistedCompanyRatingsSchema = z.object({
  field_relevance: persistedRatingSchema.optional(),
  work_scope: persistedRatingSchema.optional(),
  learning_opportunity: persistedRatingSchema.optional(),
  supervisor_readiness: persistedRatingSchema.optional(),
  student_support: persistedRatingSchema.optional(),
  environment: persistedRatingSchema.optional(),
  safety: persistedRatingSchema.optional(),
  resources: persistedRatingSchema.optional(),
  allowance: persistedRatingSchema.optional(),
  transportation: persistedRatingSchema.optional(),
  public_transport: persistedRatingSchema.optional(),
  nearby_accommodation: persistedRatingSchema.optional(),
  coordination: persistedRatingSchema.optional(),
}).strict()

export const persistedStudentEvaluationSchema = persistedEvaluationBaseSchema.extend({
  studentId: z.string().trim().min(1).max(100),
  lecturerId: z.string().trim().min(1).max(30),
  ratings: persistedStudentRatingsSchema,
  strengths: z.string(),
  issues: z.string(),
  suggestions: z.string(),
  followUp: z.string(),
}).strict()

export const persistedCompanyEvaluationSchema = persistedEvaluationBaseSchema.extend({
  evaluatorId: z.string().trim().min(1).max(30),
  ratings: persistedCompanyRatingsSchema,
  recommendation: companyRecommendationSchema.or(z.literal('')),
  observations: z.string(),
  companyRequirements: z.string(),
  issues: z.string(),
  suggestions: z.string(),
}).strict()

export const persistedEvaluationBundleSchema = z.object({
  appointmentId: z.string().trim().min(1).max(30),
  studentEvaluations: z.array(persistedStudentEvaluationSchema).max(500),
  companyEvaluation: persistedCompanyEvaluationSchema.nullable(),
}).strict()
