import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

async function text(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8')
}

describe('production operations configuration', () => {
  it('limits app object mutations and deletion to application-owned prefixes', async () => {
    const bootstrap = await text('scripts/bootstrap-object-storage.sh')
    expect(bootstrap).toContain('"s3:GetObject","s3:PutObject","s3:DeleteObject"')
    expect(bootstrap).toContain('arn:aws:s3:::$S3_BUCKET/uploads/*')
    expect(bootstrap).toContain('arn:aws:s3:::$S3_BUCKET/imports/*')
    expect(bootstrap).toContain('arn:aws:s3:::$S3_BUCKET/exports/*')
    expect(bootstrap).not.toContain('"s3:DeleteObject"],"Resource":["arn:aws:s3:::$S3_BUCKET/*"]')
  })

  it('forces off-site backup in the production compose override', async () => {
    const productionCompose = await text('compose.production.yaml')
    expect(productionCompose).toMatch(/backup:\s+environment:\s+BACKUP_OFFSITE_REQUIRED: "true"/)
    expect(productionCompose).not.toContain('BACKUP_OFFSITE_REQUIRED: ${')
  })

  it('validates the required flag and required off-site credentials', async () => {
    const copyScript = await text('scripts/offsite-copy.mjs')
    expect(copyScript).toContain("requiredSetting !== 'true' && requiredSetting !== 'false'")
    expect(copyScript).toContain("['BACKUP_OFFSITE_REGION', 'BACKUP_OFFSITE_ACCESS_KEY_ID', 'BACKUP_OFFSITE_SECRET_ACCESS_KEY']")
    expect(copyScript).toContain("if (required) throw new Error('BACKUP_OFFSITE_BUCKET is required")
  })

  it('gates application traffic on dependency readiness while retaining liveness separately', async () => {
    const compose = await text('compose.yaml')
    const runbook = await text('docs/OPERATIONS_RUNBOOK.md')
    expect(compose).toContain("fetch('http://127.0.0.1:3000/api/ready')")
    expect(runbook).toContain('`/api/health` (liveness)')
    expect(runbook).toContain('`/api/ready`')
    expect(runbook).not.toContain('/api/readiness')
  })

  it('seeds the initializer from injected container environment without requiring an env file', async () => {
    const initialize = await text('scripts/initialize.sh')
    expect(initialize).toContain('pnpm exec tsx prisma/seed.ts')
    expect(initialize).not.toContain('pnpm prisma:seed')
  })

  it('provides Nitro runtime aliases for storage and antivirus readiness', async () => {
    const compose = await text('compose.yaml')
    expect(compose).toContain('NUXT_STORAGE_ENDPOINT: http://storage:9000')
    expect(compose).toContain('NUXT_STORAGE_ACCESS_KEY_ID: ${S3_APP_ACCESS_KEY_ID:-ciwie_app}')
    expect(compose).toContain('NUXT_ANTIVIRUS_HOST: antivirus')
    expect(compose).toContain('NUXT_ANTIVIRUS_PORT: 3310')
  })

  it('requires an explicit source bucket when restoring objects into an isolated bucket', async () => {
    const compose = await text('compose.yaml')
    const restore = await text('scripts/object-restore.mjs')
    expect(compose).toContain('RESTORE_SOURCE_BUCKET: ${RESTORE_SOURCE_BUCKET:-}')
    expect(restore).toContain('process.env.RESTORE_SOURCE_BUCKET || process.env.S3_BUCKET')
    expect(restore).toContain('manifest.bucket !== expectedSourceBucket')
  })

  it('normalizes MariaDB trigger comments before restoring into MySQL 8', async () => {
    const restore = await text('scripts/restore.sh')
    expect(restore).toContain("sed -z -i 's/;[[:space:]]*\\n\\*\\/;;/\\n*\\/;;/g'")
  })

  it('restores CI markers into an isolated bucket without mutating the source bucket', async () => {
    const bootstrap = await text('scripts/bootstrap-object-storage.sh')
    const compose = await text('compose.yaml')
    const workflow = await text('.github/workflows/ci.yaml')
    const runbook = await text('docs/OPERATIONS_RUNBOOK.md')
    expect(workflow).toContain('S3_BUCKET=ciwie-restore RESTORE_SOURCE_BUCKET=ciwie-private')
    expect(workflow).toContain('S3_APP_POLICY_NAME=ciwie-restore-app')
    expect(workflow).toContain('S3_BACKUP_POLICY_NAME=ciwie-restore-backup')
    expect(workflow).toContain('S3_BACKUP_ACCESS_KEY_ID=ciwie_restore_backup')
    expect(workflow).toContain('source-app/$S3_BUCKET/uploads/ci/source-app-marker.txt')
    expect(workflow).toContain('source-backup/$S3_BUCKET/ci/restore-marker.txt')
    expect(workflow).not.toContain('mc rm "local/$S3_BUCKET/ci/restore-marker.txt"')
    expect(bootstrap).toContain('app_policy_name=${S3_APP_POLICY_NAME:-ciwie-app}')
    expect(bootstrap).toContain('backup_policy_name=${S3_BACKUP_POLICY_NAME:-ciwie-backup}')
    expect(compose).toContain('S3_APP_POLICY_NAME: ${S3_APP_POLICY_NAME:-ciwie-app}')
    expect(compose).toContain('S3_BACKUP_POLICY_NAME: ${S3_BACKUP_POLICY_NAME:-ciwie-backup}')
    expect(runbook).toContain('S3_BUCKET=ciwie-restore')
    expect(runbook).toContain('RESTORE_SOURCE_BUCKET=ciwie-private')
    expect(runbook).toContain('S3_APP_POLICY_NAME=ciwie-restore-app')
    expect(runbook).toContain('S3_BACKUP_POLICY_NAME=ciwie-restore-backup')
  })
})
