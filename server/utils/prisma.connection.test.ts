import { describe, expect, it } from 'vitest'
import { getDatabaseConnectionString, toPostgresConnectionString } from './prisma'

describe('toPostgresConnectionString', () => {
  it('accepts PostgreSQL URLs', () => {
    expect(toPostgresConnectionString('postgresql://user:pass@example.com:5432/ciwie_db'))
      .toBe('postgresql://user:pass@example.com:5432/ciwie_db')
  })

  it('normalizes postgres URLs and pasted dotenv/JSON wrappers', () => {
    expect(toPostgresConnectionString('DATABASE_URL=\\"postgres://user:pass@example.com:5432/ciwie_db?pgbouncer=true\\"'))
      .toBe('postgresql://user:pass@example.com:5432/ciwie_db?pgbouncer=true')
    expect(toPostgresConnectionString('{"DATABASE_URL":"postgresql://user:pass@example.com:5432/ciwie_db",}'))
      .toBe('postgresql://user:pass@example.com:5432/ciwie_db')
  })

  it('keeps Supabase pooler parameters', () => {
    expect(toPostgresConnectionString('postgresql://user:p%40ss@pooler.example.com:6543/postgres?pgbouncer=true&sslmode=require'))
      .toBe('postgresql://user:p%40ss@pooler.example.com:6543/postgres?pgbouncer=true&sslmode=require')
  })
})

describe('getDatabaseConnectionString', () => {
  it('uses the local PostgreSQL default outside production', () => {
    const previousUrl = process.env.DATABASE_URL
    const previousNodeEnv = process.env.NODE_ENV
    delete process.env.DATABASE_URL
    process.env.NODE_ENV = 'test'
    expect(getDatabaseConnectionString()).toBe('postgresql://ciwie:ciwie@localhost:5432/ciwie_db')
    if (previousUrl === undefined) delete process.env.DATABASE_URL
    else process.env.DATABASE_URL = previousUrl
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = previousNodeEnv
  })
})
