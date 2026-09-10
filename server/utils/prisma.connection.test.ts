import { describe, expect, it } from 'vitest'
import { toMariaDbConnectionConfig, toMariaDbConnectionString } from './prisma'

describe('toMariaDbConnectionString', () => {
  it('accepts Prisma mysql URLs with the MariaDB adapter', () => {
    expect(toMariaDbConnectionString('mysql://user:pass@example.com:3306/ciwie_db'))
      .toBe('mariadb://user:pass@example.com:3306/ciwie_db')
  })

  it('strips quotes that were pasted into an environment variable value', () => {
    expect(toMariaDbConnectionString('"mysql://user:pass@example.com:3306/ciwie_db"'))
      .toBe('mariadb://user:pass@example.com:3306/ciwie_db')
  })

  it('handles escaped quotes and a pasted dotenv assignment', () => {
    expect(toMariaDbConnectionString('DATABASE_URL=\\"mysql2://user:pass@example.com:3306/ciwie_db\\"'))
      .toBe('mariadb://user:pass@example.com:3306/ciwie_db')
  })

  it('extracts a URL wrapped in serialized dotenv text', () => {
    expect(toMariaDbConnectionString('{"DATABASE_URL":"mysql://user:pass@example.com:3306/ciwie_db"}'))
      .toBe('mariadb://user:pass@example.com:3306/ciwie_db')
  })

  it('converts the URL to a driver config object', () => {
    expect(toMariaDbConnectionConfig('mysql://user:p%40ss@example.com:3307/ciwie_db?ssl=true'))
      .toEqual({ host: 'example.com', user: 'user', password: 'p@ss', database: 'ciwie_db', port: 3307, ssl: 'true' })
  })
})
