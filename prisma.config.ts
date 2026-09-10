import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || 'postgresql://ciwie:ciwie@localhost:5432/ciwie_db',
  },
  migrations: {
    seed: 'node prisma/seed.mjs',
  },
})
