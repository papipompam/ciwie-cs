import { describe, expect, it } from 'vitest'
import { databaseFingerprint, readDemoSeedConfig } from '../../prisma/demo-seed'

const validEnv = {
  NODE_ENV: 'development',
  DEMO_SEED_ENABLED: 'true',
  DEMO_SEED_TARGET: 'localhost:3307/ciwie',
  DATABASE_URL: 'mysql://user:secret@localhost:3307/ciwie',
  DEMO_ADMIN_PASSWORD: 'long-enough-admin-password',
  DEMO_LECTURER_PASSWORD: 'long-enough-lecturer-password',
  DEMO_STUDENT_PASSWORD: 'long-enough-student-password',
  S3_ENDPOINT: 'http://localhost:9000',
  S3_REGION: 'us-east-1',
  S3_BUCKET: 'ciwie-private',
  S3_APP_ACCESS_KEY_ID: 'demo-app',
  S3_APP_SECRET_ACCESS_KEY: 'long-enough-storage-secret',
} satisfies NodeJS.ProcessEnv

describe('demo seed safety configuration', () => {
  it('derives a target fingerprint without credentials', () => {
    expect(databaseFingerprint(validEnv.DATABASE_URL)).toBe('localhost:3307/ciwie')
    expect(databaseFingerprint(validEnv.DATABASE_URL)).not.toContain('secret')
  })

  it('requires an explicit enable flag and exact target', () => {
    expect(() => readDemoSeedConfig({ ...validEnv, DEMO_SEED_ENABLED: 'false' })).toThrow('DEMO_SEED_ENABLED=true')
    expect(() => readDemoSeedConfig({ ...validEnv, DEMO_SEED_TARGET: 'localhost:3307/other' })).toThrow('exactly match')
  })

  it('allows only an explicit development or test environment', () => {
    expect(() => readDemoSeedConfig({ ...validEnv, NODE_ENV: 'production' })).toThrow('allowed only')
    expect(() => readDemoSeedConfig({ ...validEnv, NODE_ENV: 'Production' })).toThrow('allowed only')
    expect(() => readDemoSeedConfig({ ...validEnv, NODE_ENV: undefined })).toThrow('allowed only')
  })

  it('accepts a fully scoped local configuration', () => {
    const config = readDemoSeedConfig(validEnv)
    expect(config.target).toBe('localhost:3307/ciwie')
    expect(config.s3.bucket).toBe('ciwie-private')
  })
})
