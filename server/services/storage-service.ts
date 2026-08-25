import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export interface PrivateStorageConfig {
  endpoint?: string
  region: string
  bucket: string
  accessKeyId?: string
  secretAccessKey?: string
}

export async function createAuthorizedDownloadUrl(config: PrivateStorageConfig, objectKey: string): Promise<string> {
  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: Boolean(config.endpoint),
    ...(config.accessKeyId && config.secretAccessKey
      ? { credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey } }
      : {}),
  })
  return await getSignedUrl(client, new GetObjectCommand({ Bucket: config.bucket, Key: objectKey }), { expiresIn: 60 })
}
