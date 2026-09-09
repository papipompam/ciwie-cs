import { Prisma } from '@prisma/client'
import { companyInputSchema } from '#shared/companies'
import { companySourceCode, provinceSourceCode } from '../utils/companySites'
import { regionToPrisma, toCompanyRecord } from '../utils/companies'
import { requireUserSession } from '../utils/session'

export default defineEventHandler(async (event) => {
  const user = await requireUserSession(event, ['staff', 'lecturer'])
  const parsed = companyInputSchema.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'COMPANY_INVALID' })
  const input = parsed.data
  const prisma = usePrisma()
  const code = companySourceCode(input.name, input.address, input.province)
  const existing = await prisma.company.findUnique({ where: { code }, select: { id: true } })
  if (existing) throw createError({ statusCode: 409, statusMessage: 'COMPANY_ALREADY_EXISTS' })

  const site = await prisma.$transaction(async (transaction) => {
    const province = await transaction.province.upsert({
      where: { nameTh: input.province },
      update: { region: regionToPrisma[input.region] },
      create: { code: provinceSourceCode(input.province), nameTh: input.province, region: regionToPrisma[input.region] },
      select: { id: true },
    })
    const company = await transaction.company.create({
      data: { code, legalName: input.name, status: 'ACTIVE', createdById: user.id },
      select: { id: true },
    })
    return transaction.companySite.create({
      data: {
        branchName: input.branch, address: input.address, latitude: input.latitude, longitude: input.longitude,
        provinceId: province.id, companyId: company.id, contactName: input.contactName, contactPhone: input.contactPhone,
      },
      select: {
        id: true, branchName: true, address: true, latitude: true, longitude: true,
        contactName: true, contactPhone: true, recordStatus: true, createdAt: true, updatedAt: true,
        company: { select: { legalName: true } }, province: { select: { nameTh: true, region: true } },
      },
    })
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  setResponseStatus(event, 201)
  return toCompanyRecord(site)
})
