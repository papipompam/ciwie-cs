import { createHash } from 'node:crypto'
import type { Prisma } from '@prisma/client'

const normalizeIdentityPart = (value: string) => value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('th')
const digest = (value: string) => createHash('sha256').update(value).digest('hex')

export const provinceSourceCode = (province: string) => `P-${digest(normalizeIdentityPart(province)).slice(0, 8)}`

export const companySourceCode = (companyName: string, address: string, province: string) =>
  `CMP-${digest([companyName, address, province].map(normalizeIdentityPart).join('|')).slice(0, 32)}`

interface ConfirmedCompanySnapshot {
  companyNameSnapshot: string
  companyLocationSnapshot: string
  provinceSnapshot: string
  latitude: Prisma.Decimal | number | null
  longitude: Prisma.Decimal | number | null
  recipientName: string
}

export const ensureConfirmedCompanySite = async (transaction: Prisma.TransactionClient, snapshot: ConfirmedCompanySnapshot, createdById: string) => {
  const province = await transaction.province.upsert({
    where: { nameTh: snapshot.provinceSnapshot },
    update: {},
    create: {
      code: provinceSourceCode(snapshot.provinceSnapshot),
      nameTh: snapshot.provinceSnapshot,
    },
    select: { id: true },
  })
  const code = companySourceCode(snapshot.companyNameSnapshot, snapshot.companyLocationSnapshot, snapshot.provinceSnapshot)
  const company = await transaction.company.upsert({
    where: { code },
    update: { legalName: snapshot.companyNameSnapshot, status: 'ACTIVE' },
    create: {
      code,
      legalName: snapshot.companyNameSnapshot,
      status: 'ACTIVE',
      createdById,
    },
    select: { id: true },
  })
  return transaction.companySite.upsert({
    where: { companyId_branchName: { companyId: company.id, branchName: 'สำนักงานใหญ่' } },
    update: {
      address: snapshot.companyLocationSnapshot,
      latitude: snapshot.latitude,
      longitude: snapshot.longitude,
      provinceId: province.id,
      contactName: snapshot.recipientName,
      recordStatus: 'ACTIVE',
    },
    create: {
      companyId: company.id,
      branchName: 'สำนักงานใหญ่',
      address: snapshot.companyLocationSnapshot,
      latitude: snapshot.latitude,
      longitude: snapshot.longitude,
      provinceId: province.id,
      contactName: snapshot.recipientName,
    },
    select: { id: true },
  })
}
