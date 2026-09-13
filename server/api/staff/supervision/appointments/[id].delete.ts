import { Prisma } from '@prisma/client'
import { supervisionAppointmentIdSchema } from '#shared/supervision-appointments'
import { requireUserSession } from '../../../../utils/session'

export default defineEventHandler(async (event) => {
  await requireUserSession(event, ['staff'])
  const appointmentId = getRouterParam(event, 'id')
  if (!appointmentId) throw createError({ statusCode: 400, statusMessage: 'APPOINTMENT_ID_REQUIRED' })
  const parsedAppointmentId = supervisionAppointmentIdSchema.safeParse(appointmentId)
  if (!parsedAppointmentId.success) throw createError({ statusCode: 400, statusMessage: 'APPOINTMENT_ID_INVALID' })

  const prisma = usePrisma()
  await prisma.$transaction(async (transaction) => {
    const appointment = await transaction.supervisionAppointment.findUnique({ where: { id: parsedAppointmentId.data }, select: { id: true } })
    if (!appointment) throw createError({ statusCode: 404, statusMessage: 'SUPERVISION_APPOINTMENT_NOT_FOUND' })
    await transaction.studentEvaluation.deleteMany({ where: { appointmentStudent: { appointmentId: parsedAppointmentId.data } } })
    await transaction.supervisionAppointmentStudent.deleteMany({ where: { appointmentId: parsedAppointmentId.data } })
    await transaction.companyEvaluation.deleteMany({ where: { appointmentId: parsedAppointmentId.data } })
    await transaction.supervisionAppointmentLecturer.deleteMany({ where: { appointmentId: parsedAppointmentId.data } })
    await transaction.supervisionAppointment.delete({ where: { id: parsedAppointmentId.data } })
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

  return { id: parsedAppointmentId.data }
})
