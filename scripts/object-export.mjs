import { createHash } from 'node:crypto'
import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { pipeline } from 'node:stream/promises'
import { GetObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3'

const required = ['S3_ENDPOINT', 'S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'BACKUP_STAMP', 'OBJECT_EXPORT_DIR']
for (const name of required) {
  if (!process.env[name]) throw new Error(`${name} is required`)
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

const exportDir = process.env.OBJECT_EXPORT_DIR
const dataDir = `${exportDir}/data`
await mkdir(dataDir, { recursive: true })

const listed = []
let continuationToken
do {
  const page = await client.send(new ListObjectsV2Command({ Bucket: process.env.S3_BUCKET, ContinuationToken: continuationToken }))
  listed.push(...(page.Contents || []).filter(object => object.Key))
  continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined
} while (continuationToken)

const objects = []
for (const [index, object] of listed.entries()) {
  const file = String(index).padStart(8, '0')
  const localPath = `${dataDir}/${file}`
  const response = await client.send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: object.Key }))
  if (!response.Body) throw new Error(`Object has no body: ${object.Key}`)
  await pipeline(response.Body, createWriteStream(localPath, { flags: 'wx' }))
  const hash = createHash('sha256')
  await pipeline(createReadStream(localPath), hash)
  objects.push({ key: object.Key, file, size: object.Size, sha256: hash.digest('hex') })
}

await writeFile(`${exportDir}/manifest.json`, `${JSON.stringify({
  bucket: process.env.S3_BUCKET,
  createdAt: new Date().toISOString(),
  objects,
}, null, 2)}\n`, { flag: 'wx' })

console.info(`Exported ${objects.length} objects for backup ${process.env.BACKUP_STAMP}.`)
