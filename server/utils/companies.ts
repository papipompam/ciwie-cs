import type { RegionCode } from '@prisma/client'

export const regionToPrisma: Record<string, RegionCode> = {
  'ภาคเหนือ': 'NORTH',
  'ภาคตะวันออกเฉียงเหนือ': 'NORTHEAST',
  'ภาคกลาง': 'CENTRAL',
  'ภาคตะวันออก': 'EAST',
  'ภาคตะวันตก': 'WEST',
  'ภาคใต้': 'SOUTH',
}

const regionFromPrisma: Record<RegionCode, string> = Object.fromEntries(
  Object.entries(regionToPrisma).map(([label, code]) => [code, label]),
) as Record<RegionCode, string>

interface CompanySiteRecord {
  id: string
  branchName: string
  address: string
  latitude: { toNumber(): number } | number | null
  longitude: { toNumber(): number } | number | null
  contactName: string | null
  contactPhone: string | null
  recordStatus: 'ACTIVE' | 'INACTIVE'
  createdAt: Date
  updatedAt: Date
  company: { legalName: string }
  province: { nameTh: string, region: RegionCode | null }
}

const decimalNumber = (value: CompanySiteRecord['latitude']) => value == null ? null : typeof value === 'number' ? value : value.toNumber()

export const toCompanyRecord = (site: CompanySiteRecord) => ({
  id: site.id,
  name: site.company.legalName,
  branch: site.branchName,
  province: site.province.nameTh,
  region: site.province.region ? regionFromPrisma[site.province.region] : 'ภาคกลาง',
  address: site.address,
  contactName: site.contactName ?? '',
  contactPhone: site.contactPhone ?? '',
  latitude: decimalNumber(site.latitude),
  longitude: decimalNumber(site.longitude),
  status: site.recordStatus === 'ACTIVE' ? 'active' as const : 'inactive' as const,
  createdAt: site.createdAt.toISOString(),
  updatedAt: site.updatedAt.toISOString(),
})
