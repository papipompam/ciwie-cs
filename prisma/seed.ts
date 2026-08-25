import { PrismaClient, UserRole, UserStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { pathToFileURL } from 'node:url'
import { z } from 'zod'

const prisma = new PrismaClient()

function normalizeEmail(value: string): string {
  return value.trim().normalize('NFKC').toLocaleLowerCase('en-US')
}

export interface InitialAdminConfig { password: string, email: string }

export function readInitialAdminConfig(env: NodeJS.ProcessEnv): InitialAdminConfig | null {
  if (env.SKIP_INITIAL_ADMIN === 'true') return null
  const password = env.INITIAL_ADMIN_PASSWORD
  const email = env.INITIAL_ADMIN_EMAIL?.trim()
  if (!email || !password) throw new Error('INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD are required unless SKIP_INITIAL_ADMIN=true.')

  if (password.length < 12) {
    throw new Error('INITIAL_ADMIN_PASSWORD must contain at least 12 characters.')
  }
  const normalizedEmail = normalizeEmail(email)
  if (!z.string().email().max(320).safeParse(normalizedEmail).success) {
    throw new Error('INITIAL_ADMIN_EMAIL must be a valid email address.')
  }
  return { password, email: normalizedEmail }
}

async function createInitialAdmin(config: InitialAdminConfig | null): Promise<void> {
  if (!config) {
    console.info('Initial admin creation was explicitly skipped.')
    return
  }
  const { password, email } = config
  const existing = await prisma.user.findUnique({ where: { normalizedEmail: email }, select: { id: true } })
  if (existing) {
    console.info('Initial admin already exists; seed left the account unchanged.')
    return
  }

  const passwordHash = await bcrypt.hash(password, 12)
  await prisma.user.create({
    data: {
      identifier: email,
      normalizedIdentifier: email,
      email,
      normalizedEmail: email,
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      mustChangePassword: true,
    },
  })
  console.info('Initial admin created and must change the password at first sign-in.')
}

export async function main(env: NodeJS.ProcessEnv = process.env): Promise<void> {
  await createInitialAdmin(readInitialAdminConfig(env))
}

const entry = process.argv[1]
if (entry && import.meta.url === pathToFileURL(entry).href) {
  main()
    .catch((error: unknown) => {
      console.error(error)
      process.exitCode = 1
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}
