import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockStudentApplications } from '../server/utils/mockStudentApplications'

const request = { body: {} as unknown, id: '' }
vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
vi.stubGlobal('readBody', async () => request.body)
vi.stubGlobal('getRouterParam', () => request.id)
vi.stubGlobal('setResponseStatus', vi.fn())
vi.stubGlobal('createError', (details: { statusCode: number, statusMessage: string }) => Object.assign(new Error(details.statusMessage), details))

const { default: createApplication } = await import('../server/api/student/applications.post')
const { default: updateApplication } = await import('../server/api/student/applications/[id].patch')
const event = {} as Parameters<typeof createApplication>[0]
const input = {
  companyName: 'บริษัททดสอบ',
  position: 'นักพัฒนา',
  companyLocation: 'บุรีรัมย์',
  recipientName: '  ผู้จัดการฝ่ายบุคคล  ',
  letterAddress: '  สำนักงานกรุงเทพ  ',
  latitude: 14.99,
  longitude: 103.1,
}

beforeEach(() => {
  mockStudentApplications.splice(0)
  request.body = { ...input }
  request.id = ''
})

describe('prototype application endpoint flow', () => {
  it('creates and edits recipient data without overwriting company location', async () => {
    const created = await createApplication(event)
    expect(created.recipientName).toBe('ผู้จัดการฝ่ายบุคคล')
    expect(created.letterAddress).toBe('สำนักงานกรุงเทพ')
    request.id = created.id
    request.body = { ...input, recipientName: 'ผู้อำนวยการ', province: 'บุรีรัมย์', appliedAt: created.appliedAt, status: 'submitted' }
    const updated = await updateApplication(event)
    expect(updated.recipientName).toBe('ผู้อำนวยการ')
    expect(updated.companyLocation).toBe('บุรีรัมย์')
  })

  it('rejects missing recipient details before creating a record', async () => {
    request.body = { ...input, recipientName: '' }
    await expect(createApplication(event)).rejects.toMatchObject({ statusCode: 400 })
    expect(mockStudentApplications).toHaveLength(0)
  })

  it('requires acceptance, locks selection and prevents applying to another company', async () => {
    const created = await createApplication(event)
    request.id = created.id
    request.body = { status: 'completed' }
    await expect(updateApplication(event)).rejects.toMatchObject({ statusCode: 409 })
    request.body = { status: 'accepted' }
    await updateApplication(event)
    request.body = { status: 'completed' }
    expect((await updateApplication(event)).status).toBe('completed')
    request.body = { status: 'cancelled' }
    await expect(updateApplication(event)).rejects.toMatchObject({ statusCode: 409 })
    request.body = { ...input }
    await expect(createApplication(event)).rejects.toMatchObject({ statusCode: 409 })
    expect(mockStudentApplications).toHaveLength(1)
  })

  it('requires legacy records to complete recipient data before selection', async () => {
    const created = await createApplication(event)
    created.status = 'accepted'
    delete created.recipientName
    request.id = created.id
    request.body = { status: 'completed' }
    await expect(updateApplication(event)).rejects.toMatchObject({ statusCode: 400 })
    expect(created.status).toBe('accepted')
  })

  it('does not allow full-form editing to bypass the selection lock', async () => {
    const created = await createApplication(event)
    created.status = 'completed'
    request.id = created.id
    request.body = { ...input, companyName: 'บริษัทอื่น', province: 'บุรีรัมย์', appliedAt: created.appliedAt, status: 'rejected' }
    await expect(updateApplication(event)).rejects.toMatchObject({ statusCode: 409 })
    expect(created.companyName).toBe(input.companyName)
    expect(created.status).toBe('completed')
  })

  it('allows another company after rejection', async () => {
    const created = await createApplication(event)
    request.id = created.id
    request.body = { status: 'rejected' }
    await updateApplication(event)
    request.body = { ...input, companyName: 'บริษัทถัดไป' }
    expect((await createApplication(event)).companyName).toBe('บริษัทถัดไป')
    expect(mockStudentApplications).toHaveLength(2)
  })

  it('does not allow another company after cancellation', async () => {
    const created = await createApplication(event)
    request.id = created.id
    request.body = { status: 'cancelled' }
    await updateApplication(event)
    request.body = { ...input, companyName: 'บริษัทถัดไป' }
    await expect(createApplication(event)).rejects.toMatchObject({ statusCode: 409 })
    expect(mockStudentApplications).toHaveLength(1)
  })
})
