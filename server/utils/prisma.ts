import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const prismaGlobal = globalThis as typeof globalThis & { cwiePrisma?: PrismaClient }
const DEFAULT_DATABASE_URL = 'postgresql://ciwie:ciwie@localhost:5432/ciwie_db'

/** Normalize values pasted from Vercel/JSON/dotenv without hiding malformed URLs. */
export const toPostgresConnectionString = (connectionString: string) => {
  let normalized = connectionString.trim().replace(/^DATABASE_URL\s*=\s*/i, '')
  normalized = normalized.replace(/\\(["'`])/g, '$1').replace(/\\\//g, '/').replace(/\\u003a/gi, ':').replace(/\\u002f/gi, '/').replace(/\\r?\\n/g, '').replace(/[\r\n]/g, '').trim()
  const schemeIndex = normalized.search(/(?:postgres|postgresql):\/\//i)
  if (schemeIndex >= 0) normalized = normalized.slice(schemeIndex)
  normalized = normalized.match(/^postgres(?:ql)?:\/\/[^\s"'`}]+/i)?.[0] ?? normalized
  normalized = normalized.replace(/^["'`]+|["'`},]+$/g, '').trim()
  return normalized.replace(/^postgres:\/\//i, 'postgresql://')
}

export const getDatabaseConnectionString = () => {
  const configured = process.env.DATABASE_URL
  if (!configured && process.env.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL is required in production. Set the Supabase pooled PostgreSQL URL in Vercel.')
  }
  return toPostgresConnectionString(configured || DEFAULT_DATABASE_URL)
}

const createPrismaClient = () => {
  const connectionString = getDatabaseConnectionString()
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
}

export const usePrisma = () => {
  prismaGlobal.cwiePrisma ??= createPrismaClient()
  return prismaGlobal.cwiePrisma
}
