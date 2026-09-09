import { beforeEach, describe, expect, it, vi } from 'vitest'

let user = { id: 'staff-001', role: 'staff' }
let body: Record<string, unknown> = {}
const site = {
  id: 'SITE-1', branchName: 'สำนักงานใหญ่', address: '123 ถนนตัวอย่าง', latitude: 14.99, longitude: 103.1,
  contactName: 'คุณสมชาย', contactPhone: '044-000-000', recordStatus: 'ACTIVE',
  createdAt: new Date('2026-09-01T00:00:00.000Z'), updatedAt: new Date('2026-09-02T00:00:00.000Z'),
  company: { legalName: 'บริษัท ตัวอย่าง จำกัด' }, province: { nameTh: 'บุรีรัมย์', region: 'NORTHEAST' },
}

vi.mock('../server/utils/session', () => ({ requireUserSession: vi.fn(async () => user) }))
vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
vi.stubGlobal('readBody', async () => body)
vi.stubGlobal('getRouterParam', () => 'SITE-1')
vi.stubGlobal('setResponseStatus', vi.fn())
vi.stubGlobal('createError', (details: { statusCode: number, statusMessage: string }) => Object.assign(new Error(details.statusMessage), details))

const findSites = vi.fn(async () => [site])
const findCompany = vi.fn(async () => null)
const findSite = vi.fn(async () => ({ id: 'SITE-1', companyId: 'COMPANY-1' }))
const upsertProvince = vi.fn(async () => ({ id: 31 }))
const createCompany = vi.fn(async () => ({ id: 'COMPANY-1' }))
const createSite = vi.fn(async () => site)
const updateCompany = vi.fn(async () => ({ id: 'COMPANY-1' }))
const updateSite = vi.fn(async () => site)
const findUpdatedSite = vi.fn(async () => site)

vi.stubGlobal('usePrisma', () => ({
  companySite: { findMany: findSites, findUnique: findSite },
  company: { findUnique: findCompany },
  $transaction: vi.fn(async (callback: (transaction: unknown) => unknown) => callback({
    province: { upsert: upsertProvince },
    company: { create: createCompany, update: updateCompany },
    companySite: { create: createSite, update: updateSite, findUniqueOrThrow: findUpdatedSite },
  })),
}))

const { default: listCompanies } = await import('../server/api/companies.get')
const { default: addCompany } = await import('../server/api/companies.post')
const { default: updateCompanySite } = await import('../server/api/companies/[id].patch')

beforeEach(() => {
  user = { id: 'staff-001', role: 'staff' }
  body = {}
  vi.clearAllMocks()
})

describe('company APIs', () => {
  it('lists persisted company sites for staff and lecturers', async () => {
    const result = await listCompanies({} as Parameters<typeof listCompanies>[0])
    expect(result.companies[0]).toMatchObject({
      id: 'SITE-1', name: 'บริษัท ตัวอย่าง จำกัด', province: 'บุรีรัมย์', region: 'ภาคตะวันออกเฉียงเหนือ',
      latitude: 14.99, status: 'active',
    })
  })

  it('creates the province, company, and site in one transaction', async () => {
    body = {
      name: 'บริษัท ตัวอย่าง จำกัด', branch: 'สำนักงานใหญ่', province: 'บุรีรัมย์', region: 'ภาคตะวันออกเฉียงเหนือ',
      address: '123 ถนนตัวอย่าง', contactName: 'คุณสมชาย', contactPhone: '044-000-000', latitude: 14.99, longitude: 103.1,
    }
    await expect(addCompany({} as Parameters<typeof addCompany>[0])).resolves.toMatchObject({ id: 'SITE-1', status: 'active' })
    expect(createCompany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ createdById: 'staff-001' }) }))
    expect(createSite).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ companyId: 'COMPANY-1', provinceId: 31 }) }))
  })

  it('soft-deactivates a site instead of deleting referenced history', async () => {
    body = { status: 'inactive' }
    await updateCompanySite({} as Parameters<typeof updateCompanySite>[0])
    expect(updateSite).toHaveBeenCalledWith({ where: { id: 'SITE-1' }, data: { recordStatus: 'INACTIVE' } })
  })
})
