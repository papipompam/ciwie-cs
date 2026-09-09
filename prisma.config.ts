import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL || 'mysql://ciwie:ciwie@localhost:3307/ciwie_db',
  },
  migrations: {
    seed: 'node prisma/seed.mjs',
  },
})
