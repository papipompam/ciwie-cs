import { CreateBucketCommand, HeadBucketCommand, S3Client } from '@aws-sdk/client-s3'

const required = ['S3_ENDPOINT', 'S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY']
for (const name of required) {
  if (!process.env[name]) throw new Error(`${name} is required for storage initialization`)
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

try {
  await client.send(new HeadBucketCommand({ Bucket: process.env.S3_BUCKET }))
  console.info(`Storage bucket ${process.env.S3_BUCKET} already exists.`)
} catch (error) {
  const status = error?.$metadata?.httpStatusCode
  if (status !== 404 && error?.name !== 'NotFound' && error?.name !== 'NoSuchBucket') throw error
  await client.send(new CreateBucketCommand({ Bucket: process.env.S3_BUCKET }))
  console.info(`Storage bucket ${process.env.S3_BUCKET} created.`)
}
