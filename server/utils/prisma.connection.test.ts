import { describe, expect, it } from 'vitest'
import { toMariaDbConnectionString } from './prisma'

describe('toMariaDbConnectionString', () => {
  it('accepts Prisma mysql URLs with the MariaDB adapter', () => {
    expect(toMariaDbConnectionString('mysql://user:pass@example.com:3306/ciwie_db'))
      .toBe('mariadb://user:pass@example.com:3306/ciwie_db')
  })
})
