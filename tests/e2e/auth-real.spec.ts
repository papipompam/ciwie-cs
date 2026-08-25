import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { expect, test } from '@playwright/test'
import bcrypt from 'bcryptjs'

const databaseUrl = process.env.TEST_DATABASE_URL
const prisma = databaseUrl ? new PrismaClient({ datasources: { db: { url: databaseUrl } } }) : null
const email = `e2e-admin-${randomUUID()}@example.test`
const password = 'RealE2ePassphrase123!'

test.describe('real authentication boundary', () => {
  test.skip(!prisma, 'TEST_DATABASE_URL is required for real API and session coverage')

  test.beforeAll(async () => {
    await prisma!.user.create({
      data: {
        identifier: email,
        normalizedIdentifier: email,
        email,
        normalizedEmail: email,
        passwordHash: await bcrypt.hash(password, 4),
        role: 'ADMIN',
        status: 'ACTIVE',
        mustChangePassword: false,
      },
    })
  })

  test.afterAll(async () => {
    await prisma!.user.deleteMany({ where: { normalizedEmail: email } })
    await prisma!.$disconnect()
  })

  test('logs in, revalidates the database-backed session, and logs out', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('อีเมล').fill(email)
    await page.getByLabel('รหัสผ่าน', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click()

    await expect(page).toHaveURL(/\/$/)
    const session = await page.request.get('/api/auth/session')
    expect(session.ok()).toBe(true)
    await expect(session.json()).resolves.toMatchObject({ user: { role: 'ADMIN' } })

    const logout = page.getByRole('button', { name: 'ออกจากระบบ' })
    if (!await logout.isVisible()) await page.getByRole('button', { name: 'เปิดเมนู' }).click()
    await logout.click()
    await expect(page).toHaveURL(/\/login$/)
    expect((await page.request.get('/api/auth/session')).status()).toBe(401)
  })
})
