import { Prisma } from '@prisma/client'
import { companyInputSchema, companyStatusSchema } from '#shared/companies'
import { provinceSourceCode } from '../../utils/companySites'
import { regionToPrisma, toCompanyRecord } from '../../utils/companies'
import { requireUserSession } from '../../utils/session'

export default defineEventHandler(async (event) => {
  await requireUserSession(event, ['staff', 'lecturer'])
  const siteId = getRouterParam(event, 'id')
  if (!siteId) throw createError({ statusCode: 400, statusMessage: 'COMPANY_SITE_ID_REQUIRED' })
  const rawBody = await readBody(event)
  const status = companyStatusSchema.safeParse(rawBody)
  const details = companyInputSchema.safeParse(rawBody)
  if (!status.success && !details.success) throw createError({ statusCode: 400, statusMessage: 'COMPANY_INVALID' })
  const prisma = usePrisma()
  const current = await prisma.companySite.findUnique({ where: { id: siteId }, select: { id: true, companyId: true } })
  if (!current) throw createError({ statusCode: 404, statusMessage: 'COMPANY_SITE_NOT_FOUND' })

  const site = await prisma.$transaction(async (transaction) => {
    if (status.success) {
      await transaction.companySite.update({
        where: { id: current.id }, data: { recordStatus: status.data.status === 'active' ? 'ACTIVE' : 'INACTIVE' },
      })
    }
    else if (details.success) {
      const input = details.data
      const province = await transaction.province.upsert({
        where: { nameTh: input.province },
        update: { region: regionToPrisma[input.region] },
        create: { code: provinceSourceCode(input.province), nameTh: input.province, region: regionToPrisma[input.region] },
        select: { id: true },
      })
      await transaction.company.update({ where: { id: current.companyId }, data: { legalName: input.name } })
      await transaction.companySite.update({
        where: { id: current.id },
        data: {
          branchName: input.branch, address: input.address, provinceId: province.id,
          latitude: input.latitude, longitude: input.longitude, contactName: input.contactName, contactPhone: input.contactPhone,
        },
      })
    }
    return transaction.companySite.findUniqueOrThrow({
      where: { id: current.id },
      select: {
        id: true, branchName: true, address: true, latitude: true, longitude: true,
        contactName: true, contactPhone: true, recordStatus: true, createdAt: true, updatedAt: true,
        company: { select: { legalName: true } }, province: { select: { nameTh: true, region: true } },
      },
    })
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  return toCompanyRecord(site)
})
