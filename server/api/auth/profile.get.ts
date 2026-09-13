import { studentProfileResponseSchema } from '#shared/student-profile'
import { requireUserSession } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await requireUserSession(event, ['student'])
  const profile = await usePrisma().user.findUnique({
    where: { id: user.id },
    select: { id: true, username: true, namePrefix: true, firstName: true, lastName: true, cohortYear: true, section: true, phone: true, email: true },
  })
  if (!profile) throw createError({ statusCode: 404, statusMessage: 'STUDENT_PROFILE_NOT_FOUND' })
  return studentProfileResponseSchema.parse({
    profile: { id: profile.id, username: profile.username, prefix: profile.namePrefix, firstName: profile.firstName, lastName: profile.lastName, cohortYear: profile.cohortYear, section: profile.section, phone: profile.phone, email: profile.email },
  })
})
