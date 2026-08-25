import { createReadStream } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

const requiredSetting = process.env.BACKUP_OFFSITE_REQUIRED || 'false'
if (requiredSetting !== 'true' && requiredSetting !== 'false') {
  throw new Error('BACKUP_OFFSITE_REQUIRED must be exactly true or false')
}
const required = requiredSetting === 'true'
const bucket = process.env.BACKUP_OFFSITE_BUCKET
if (!bucket) {
  if (required) throw new Error('BACKUP_OFFSITE_BUCKET is required when BACKUP_OFFSITE_REQUIRED=true')
  console.info('Off-site backup copy is not configured; encrypted local artifacts were retained.')
  process.exit(0)
}

const requiredNames = ['BACKUP_OFFSITE_REGION', 'BACKUP_OFFSITE_ACCESS_KEY_ID', 'BACKUP_OFFSITE_SECRET_ACCESS_KEY']
for (const name of requiredNames) {
  if (!process.env[name]) throw new Error(`${name} is required when BACKUP_OFFSITE_BUCKET is set`)
}

const files = process.argv.slice(2)
if (files.length !== 4) throw new Error('Exactly four encrypted backup/checksum paths are required')
for (const file of files) {
  const absolute = resolve(file)
  if (!absolute.startsWith('/backups/') || !(absolute.endsWith('.enc') || absolute.endsWith('.enc.sha256'))) {
    throw new Error(`Refusing to upload unexpected backup path: ${file}`)
  }
}

const client = new S3Client({
  endpoint: process.env.BACKUP_OFFSITE_ENDPOINT || undefined,
  region: process.env.BACKUP_OFFSITE_REGION,
  forcePathStyle: Boolean(process.env.BACKUP_OFFSITE_ENDPOINT),
  credentials: {
    accessKeyId: process.env.BACKUP_OFFSITE_ACCESS_KEY_ID,
    secretAccessKey: process.env.BACKUP_OFFSITE_SECRET_ACCESS_KEY,
  },
})
const prefix = (process.env.BACKUP_OFFSITE_PREFIX || 'ciwie').replace(/^\/+|\/+$/g, '')

for (const file of files) {
  const fileStat = await stat(file)
  const checksum = file.endsWith('.sha256') ? undefined : (await readFile(`${file}.sha256`, 'utf8')).split(/\s+/)[0]
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: `${prefix}/${basename(file)}`,
    Body: createReadStream(file),
    ContentLength: fileStat.size,
    ...(checksum ? { Metadata: { sha256: checksum } } : {}),
  }))
}

console.info(`Copied ${files.length} encrypted backup artifacts to off-site storage.`)
