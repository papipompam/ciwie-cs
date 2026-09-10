import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '@prisma/client'

const prismaGlobal = globalThis as typeof globalThis & { cwiePrisma?: PrismaClient }

export const toMariaDbConnectionString = (connectionString: string) => {
  let normalized = connectionString.trim().replace(/^DATABASE_URL\s*=\s*/i, '')
  normalized = normalized.replace(/\\(["'`])/g, '$1').replace(/\\r?\\n/g, '').trim()
  const schemeIndex = normalized.search(/(?:mariadb|mysql2?):\/\//i)
  if (schemeIndex >= 0) normalized = normalized.slice(schemeIndex)
  normalized = normalized.replace(/^["'`]+|["'`}]+$/g, '').trim()
  return normalized.replace(/^(?:mysql|mysql2):\/\//i, 'mariadb://')
}

export const toMariaDbConnectionConfig = (connectionString: string) => {
  const normalized = toMariaDbConnectionString(connectionString)
  let url: URL
  try {
    url = new URL(normalized)
  }
  catch (error) {
    console.error('[DEBUG-DBURL]', {
      length: normalized.length,
      scheme: normalized.match(/^[^:]+:/)?.[0] ?? null,
      hasProtocol: normalized.includes('://'),
      firstCode: normalized.charCodeAt(0),
      lastCode: normalized.charCodeAt(normalized.length - 1),
      braces: (normalized.match(/[{}]/g) ?? []).length,
      newline: /\r|\n/.test(normalized),
    })
    throw error
  }
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
