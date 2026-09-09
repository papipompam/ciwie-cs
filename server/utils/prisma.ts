import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '@prisma/client'

const prismaGlobal = globalThis as typeof globalThis & { cwiePrisma?: PrismaClient }

const createPrismaClient = () => {
  const connectionString = process.env.DATABASE_URL ?? 'mysql://ciwie:ciwie@localhost:3307/ciwie_db'
  return new PrismaClient({ adapter: new PrismaMariaDb(connectionString) })
}

export const usePrisma = () => {
  prismaGlobal.cwiePrisma ??= createPrismaClient()
  return prismaGlobal.cwiePrisma
}
