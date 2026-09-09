import { requireUserSession } from '../utils/session'
import { toCompanyRecord } from '../utils/companies'

export default defineEventHandler(async (event) => {
  await requireUserSession(event, ['staff', 'lecturer'])
  const sites = await usePrisma().companySite.findMany({
    select: {
      id: true, branchName: true, address: true, latitude: true, longitude: true,
      contactName: true, contactPhone: true, recordStatus: true, createdAt: true, updatedAt: true,
      company: { select: { legalName: true } },
      province: { select: { nameTh: true, region: true } },
    },
    orderBy: [{ company: { legalName: 'asc' } }, { branchName: 'asc' }],
    take: 5001,
  })
  if (sites.length > 5000) throw createError({ statusCode: 422, statusMessage: 'COMPANIES_TOO_LARGE' })
  return { companies: sites.map(toCompanyRecord) }
})
