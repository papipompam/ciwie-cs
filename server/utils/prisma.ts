import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '@prisma/client'

const prismaGlobal = globalThis as typeof globalThis & { cwiePrisma?: PrismaClient }

export const toMariaDbConnectionString = (connectionString: string) => {
  const withoutAssignment = connectionString.trim().replace(/^DATABASE_URL\s*=\s*/i, '')
  const unquoted = withoutAssignment.replace(/\\(["'])/g, '$1').replace(/^["'`]+|["'`]+$/g, '').trim()
  return unquoted.replace(/^(?:mysql|mysql2):\/\//i, 'mariadb://')
}

export const toMariaDbConnectionConfig = (connectionString: string) => {
  const url = new URL(toMariaDbConnectionString(connectionString))
  const config: Record<string, string | number> = {
    host: url.hostname,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)),
  }
  if (url.port) config.port = Number(url.port)
  for (const [key, value] of url.searchParams) config[key] = value
  return config
}

const createPrismaClient = () => {
  const connectionString = toMariaDbConnectionString(
    process.env.DATABASE_URL ?? 'mysql://ciwie:ciwie@localhost:3307/ciwie_db',
  )
  return new PrismaClient({ adapter: new PrismaMariaDb(toMariaDbConnectionConfig(connectionString)) })
}

export const usePrisma = () => {
  prismaGlobal.cwiePrisma ??= createPrismaClient()
  return prismaGlobal.cwiePrisma
}
