import { spawnSync } from 'node:child_process'

const run = (command, args) => {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32' })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

if (process.env.ALLOW_DEMO_SEED === 'true') {
  run('pnpm', ['exec', 'prisma', 'migrate', 'deploy'])
  run('pnpm', ['exec', 'prisma', 'db', 'seed'])
}

run('pnpm', ['exec', 'nuxt', 'build'])
