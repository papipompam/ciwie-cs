import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '@prisma/client'

const prismaGlobal = globalThis as typeof globalThis & { cwiePrisma?: PrismaClient }

export const toMariaDbConnectionString = (connectionString: string) => {
  const trimmed = connectionString.trim()
  const unquoted = trimmed.replace(/^(?:"([\s\S]*)"|'([\s\S]*)')$/, (_, doubleQuoted, singleQuoted) => doubleQuoted ?? singleQuoted)
  return unquoted.replace(/^(?:mysql|mysql2):\/\//i, 'mariadb://')
}

const createPrismaClient = () => {
  const connectionString = toMariaDbConnectionString(
    process.env.DATABASE_URL ?? 'mysql://ciwie:ciwie@localhost:3307/ciwie_db',
  )
  return new PrismaClient({ adapter: new PrismaMariaDb(connectionString) })
}

export const usePrisma = () => {
  prismaGlobal.cwiePrisma ??= createPrismaClient()
  return prismaGlobal.cwiePrisma
}
