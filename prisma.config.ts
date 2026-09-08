import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'mysql://ciwie:ciwie@localhost:3306/ciwie_db'
    }
  }
})
