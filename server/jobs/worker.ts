import nodemailer from 'nodemailer'
import { prisma } from '../utils/prisma'
import { processNextExportJob } from '../services/export-service'
import { enqueueDueNotifications } from '../services/notification-scheduler'
import { processNextOutbox } from '../services/outbox-worker-service'

const storage = {
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || 'us-east-1',
  bucket: process.env.S3_BUCKET || 'ciwie-private',
  accessKeyId: process.env.S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
}

const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER && process.env.SMTP_PASSWORD
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
    : undefined,
})

async function main(): Promise<void> {
  await prisma.outboxMessage.updateMany({
    where: { status: 'PROCESSING', updatedAt: { lt: new Date(Date.now() - 15 * 60_000) } },
    data: { status: 'FAILED', nextAttemptAt: new Date(), lastError: 'Recovered stale worker claim' },
  })
  await prisma.exportJob.updateMany({
    where: { status: 'PROCESSING', updatedAt: { lt: new Date(Date.now() - 15 * 60_000) } },
    data: { status: 'PENDING', failureReason: 'Recovered stale worker claim' },
  })
  let nextReminderScanAt = 0
  for (;;) {
    if (Date.now() >= nextReminderScanAt) {
      await enqueueDueNotifications(prisma)
      nextReminderScanAt = Date.now() + 5 * 60_000
    }
    const worked = await processNextExportJob(prisma, storage) || await processNextOutbox(prisma, transport, process.env.SMTP_FROM)
    if (!worked) await new Promise(resolve => setTimeout(resolve, 5_000))
  }
}

main().finally(async () => prisma.$disconnect())
