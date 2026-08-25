import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

const required = ['S3_ENDPOINT', 'S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'OBJECT_EXPORT_DIR']
for (const name of required) {
  if (!process.env[name]) throw new Error(`${name} is required`)
}

const exportDir = process.env.OBJECT_EXPORT_DIR
const manifest = JSON.parse(await readFile(`${exportDir}/manifest.json`, 'utf8'))
const expectedSourceBucket = process.env.RESTORE_SOURCE_BUCKET || process.env.S3_BUCKET
if (manifest.bucket !== expectedSourceBucket || !Array.isArray(manifest.objects)) {
  throw new Error('Object backup manifest does not match the expected source bucket')
}

const client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || 'us-east-1',
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
})

for (const object of manifest.objects) {
  if (typeof object.key !== 'string' || !/^\d{8}$/.test(object.file) || !/^[a-f0-9]{64}$/.test(object.sha256)) {
    throw new Error('Object backup manifest contains an invalid entry')
  }
  const localPath = `${exportDir}/data/${object.file}`
  const fileStat = await stat(localPath)
  if (fileStat.size !== object.size) throw new Error(`Object size mismatch in archive: ${object.key}`)
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(localPath)) hash.update(chunk)
  if (hash.digest('hex') !== object.sha256) throw new Error(`Object checksum mismatch in archive: ${object.key}`)
  await client.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: object.key,
    Body: createReadStream(localPath),
    ContentLength: fileStat.size,
  }))
}

console.info(`Restored and verified ${manifest.objects.length} objects.`)
