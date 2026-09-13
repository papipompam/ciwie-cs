import { beforeEach, describe, expect, it, vi } from 'vitest'

let appointmentId = 'APPOINTMENT-1'
const transaction = {
  supervisionAppointment: {
    findUnique: vi.fn(async () => ({ id: 'APPOINTMENT-1' })),
    delete: vi.fn(async () => ({ id: 'APPOINTMENT-1' })),
  },
  studentEvaluation: { deleteMany: vi.fn(async () => ({ count: 2 })) },
  supervisionAppointmentStudent: { deleteMany: vi.fn(async () => ({ count: 1 })) },
  companyEvaluation: { deleteMany: vi.fn(async () => ({ count: 1 })) },
  supervisionAppointmentLecturer: { deleteMany: vi.fn(async () => ({ count: 1 })) },
}
const prisma = { $transaction: vi.fn(async (work: (client: typeof transaction) => Promise<unknown>) => work(transaction)) }

vi.mock('../server/utils/session', () => ({ requireUserSession: vi.fn(async () => ({ id: 'staff-001', role: 'staff' })) }))
vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
vi.stubGlobal('getRouterParam', () => appointmentId)
vi.stubGlobal('createError', (details: { statusCode: number, statusMessage: string }) => Object.assign(new Error(details.statusMessage), details))
vi.stubGlobal('usePrisma', () => prisma)

const { default: deleteAppointment } = await import('../server/api/staff/supervision/appointments/[id].delete')

beforeEach(() => {
  appointmentId = 'APPOINTMENT-1'
  vi.clearAllMocks()
})

describe('staff supervision appointment deletion API', () => {
  it('deletes only the requested appointment and its dependent records', async () => {
    await expect(deleteAppointment({} as Parameters<typeof deleteAppointment>[0])).resolves.toEqual({ id: 'APPOINTMENT-1' })

    expect(transaction.studentEvaluation.deleteMany).toHaveBeenCalledWith({ where: { appointmentStudent: { appointmentId: 'APPOINTMENT-1' } } })
    expect(transaction.supervisionAppointmentStudent.deleteMany).toHaveBeenCalledWith({ where: { appointmentId: 'APPOINTMENT-1' } })
    expect(transaction.companyEvaluation.deleteMany).toHaveBeenCalledWith({ where: { appointmentId: 'APPOINTMENT-1' } })
    expect(transaction.supervisionAppointmentLecturer.deleteMany).toHaveBeenCalledWith({ where: { appointmentId: 'APPOINTMENT-1' } })
    expect(transaction.supervisionAppointment.delete).toHaveBeenCalledWith({ where: { id: 'APPOINTMENT-1' } })
  })

  it('rejects an invalid appointment ID before querying the database', async () => {
    appointmentId = 'x'.repeat(31)
    await expect(deleteAppointment({} as Parameters<typeof deleteAppointment>[0])).rejects.toMatchObject({ statusCode: 400, statusMessage: 'APPOINTMENT_ID_INVALID' })
    expect(transaction.supervisionAppointment.findUnique).not.toHaveBeenCalled()
  })
})
