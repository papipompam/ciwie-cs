import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const testDatabaseUrl = process.env.TEST_DATABASE_URL
const describeWithMySql = testDatabaseUrl ? describe : describe.skip

describeWithMySql('MySQL runtime constraints', () => {
  const ids = {
    actorUser: randomUUID(),
    studentUser: randomUUID(),
    studentProfile: randomUUID(),
    term: randomUUID(),
    enrollment: randomUUID(),
    organization: randomUUID(),
    workSite: randomUUID(),
    application: randomUUID(),
    file: randomUUID(),
    fileVersion: randomUUID(),
    requests: [randomUUID(), randomUUID()],
    batches: [randomUUID(), randomUUID()],
    members: [randomUUID(), randomUUID()],
    forms: [randomUUID(), randomUUID()],
    results: [randomUUID(), randomUUID()],
    placementAttempts: [randomUUID(), randomUUID()],
    visits: [randomUUID(), randomUUID()],
    visitStudents: [randomUUID(), randomUUID()],
    visitSlots: [randomUUID(), randomUUID()],
    rollbackForm: randomUUID(),
    rollbackResult: randomUUID(),
    audit: randomUUID(),
    invalidEmailUser: randomUUID(),
  }
  const suffix = ids.actorUser.slice(0, 8)
  const prisma = new PrismaClient({ datasourceUrl: testDatabaseUrl })

  beforeAll(async () => {
    await prisma.$connect()
    await prisma.user.createMany({
      data: [
        {
          id: ids.actorUser,
          identifier: `mysql-admin-${suffix}`,
          normalizedIdentifier: `mysql-admin-${suffix}`,
          email: `mysql-admin-${suffix}@example.test`,
          normalizedEmail: `mysql-admin-${suffix}@example.test`,
          passwordHash: 'not-used-by-runtime-test',
          role: 'ADMIN',
          status: 'ACTIVE',
          mustChangePassword: false,
        },
        {
          id: ids.studentUser,
          identifier: `mysql-student-${suffix}`,
          normalizedIdentifier: `mysql-student-${suffix}`,
          email: `mysql-student-${suffix}@example.test`,
          normalizedEmail: `mysql-student-${suffix}@example.test`,
          passwordHash: 'not-used-by-runtime-test',
          role: 'STUDENT',
          status: 'ACTIVE',
          mustChangePassword: false,
        },
      ],
    })
    await prisma.studentProfile.create({
      data: {
        id: ids.studentProfile,
        userId: ids.studentUser,
        studentCode: `RT-${suffix}`,
        firstNameTh: 'ทดสอบ',
        lastNameTh: 'รันไทม์',
      },
    })
    await prisma.coopTerm.create({
      data: {
        id: ids.term,
        academicYear: 100_000 + Number.parseInt(suffix.slice(0, 5), 16),
        semester: Number.parseInt(suffix.slice(5, 8), 16),
        name: `MySQL runtime ${suffix}`,
        startsOn: new Date('2098-01-01T00:00:00.000Z'),
        endsOn: new Date('2098-12-31T00:00:00.000Z'),
      },
    })
    await prisma.studentTermEnrollment.create({
      data: { id: ids.enrollment, studentId: ids.studentProfile, coopTermId: ids.term },
    })
    await prisma.organization.create({
      data: {
        id: ids.organization,
        nameTh: `องค์กรทดสอบ ${suffix}`,
        normalizedName: `mysql-runtime-${suffix}`,
        createdById: ids.actorUser,
        updatedById: ids.actorUser,
      },
    })
    await prisma.workSite.create({
      data: {
        id: ids.workSite,
        organizationId: ids.organization,
        name: `Runtime site ${suffix}`,
        normalizedName: `runtime-site-${suffix}`,
        addressLine: 'Runtime integration test only',
        province: 'Bangkok',
        region: 'Central',
      },
    })
    await prisma.application.create({
      data: {
        id: ids.application,
        studentTermId: ids.enrollment,
        coopTermId: ids.term,
        workSiteId: ids.workSite,
        createdById: ids.studentUser,
        updatedById: ids.studentUser,
      },
    })
    await prisma.storedFile.create({
      data: { id: ids.file, originalFilename: 'runtime-response.pdf', createdById: ids.actorUser },
    })
    await prisma.fileVersion.create({
      data: {
        id: ids.fileVersion,
        fileId: ids.file,
        revision: 1,
        objectKey: `runtime/${suffix}/${ids.fileVersion}.pdf`,
        checksumSha256: 'a'.repeat(64),
        mimeType: 'application/pdf',
        extension: 'pdf',
        sizeBytes: 1n,
        scanStatus: 'CLEAN',
        createdById: ids.actorUser,
      },
    })

    for (const index of [0, 1] as const) {
      await prisma.documentRequest.create({
        data: {
          id: ids.requests[index],
          studentTermId: ids.enrollment,
          applicationId: ids.application,
          coopTermId: ids.term,
          workSiteId: ids.workSite,
          createdById: ids.studentUser,
          updatedById: ids.studentUser,
        },
      })
      await prisma.documentBatch.create({
        data: {
          id: ids.batches[index],
          coopTermId: ids.term,
          workSiteId: ids.workSite,
          documentType: `RUNTIME_${index}`,
          createdById: ids.actorUser,
          updatedById: ids.actorUser,
        },
      })
      await prisma.documentBatchMember.create({
        data: {
          id: ids.members[index],
          batchId: ids.batches[index],
          requestId: ids.requests[index],
          studentTermId: ids.enrollment,
          coopTermId: ids.term,
          workSiteId: ids.workSite,
          snapshot: { testRun: suffix },
        },
      })
      await prisma.responseForm.create({
        data: {
          id: ids.forms[index],
          batchId: ids.batches[index],
          revision: 1,
          fileVersionId: ids.fileVersion,
          status: 'CONFIRMED',
          uploadedById: ids.actorUser,
          confirmedAt: new Date(),
          confirmedById: ids.actorUser,
        },
      })
      await prisma.responseStudentResult.create({
        data: {
          id: ids.results[index],
          responseFormId: ids.forms[index],
          batchMemberId: ids.members[index],
          batchId: ids.batches[index],
          result: 'ACCEPTED',
          confirmedById: ids.actorUser,
          confirmedAt: new Date(),
        },
      })
    }
  }, 30_000)

  afterAll(async () => {
    await prisma.visitStudentSlot.deleteMany({ where: { id: { in: ids.visitSlots } } })
    await prisma.visitStudent.deleteMany({ where: { id: { in: ids.visitStudents } } })
    await prisma.supervisionVisit.deleteMany({ where: { id: { in: ids.visits } } })
    await prisma.placement.deleteMany({ where: { id: { in: ids.placementAttempts } } })
    await prisma.responseStudentResult.deleteMany({ where: { id: { in: [...ids.results, ids.rollbackResult] } } })
    await prisma.responseForm.deleteMany({ where: { id: { in: [...ids.forms, ids.rollbackForm] } } })
    await prisma.documentBatchMember.deleteMany({ where: { id: { in: ids.members } } })
    await prisma.documentBatch.deleteMany({ where: { id: { in: ids.batches } } })
    await prisma.documentRequest.deleteMany({ where: { id: { in: ids.requests } } })
    await prisma.application.deleteMany({ where: { id: ids.application } })
    await prisma.fileVersion.deleteMany({ where: { id: ids.fileVersion } })
    await prisma.storedFile.deleteMany({ where: { id: ids.file } })
    await prisma.studentTermEnrollment.deleteMany({ where: { id: ids.enrollment } })
    await prisma.workSite.deleteMany({ where: { id: ids.workSite } })
    await prisma.organization.deleteMany({ where: { id: ids.organization } })
    await prisma.coopTerm.deleteMany({ where: { id: ids.term } })
    await prisma.studentProfile.deleteMany({ where: { id: ids.studentProfile } })
    await prisma.user.deleteMany({ where: { id: { in: [ids.actorUser, ids.studentUser] } } })
    await prisma.$disconnect()
  }, 30_000)

  it('lets exactly one concurrent placement win the student-term unique constraint', async () => {
    const attempts = await Promise.allSettled(ids.placementAttempts.map((id, index) => prisma.placement.create({
      data: {
        id,
        studentTermId: ids.enrollment,
        currentWorkSiteId: ids.workSite,
        sourceResponseResultId: ids.results[index]!,
        confirmedById: ids.actorUser,
        confirmedAt: new Date(),
      },
    })))

    expect(attempts.filter(result => result.status === 'fulfilled')).toHaveLength(1)
    const rejected = attempts.find(result => result.status === 'rejected')
    expect(rejected).toBeDefined()
    expect((rejected as PromiseRejectedResult).reason).toMatchObject({ code: 'P2002' })
    expect(await prisma.placement.count({ where: { studentTermId: ids.enrollment } })).toBe(1)
  })

  it('rolls back a conflicting visit transaction and permits the slot after release', async () => {
    const visitDate = new Date('2098-06-15T00:00:00.000Z')
    await prisma.supervisionVisit.create({
      data: {
        id: ids.visits[0],
        coopTermId: ids.term,
        workSiteId: ids.workSite,
        round: 'ROUND_1',
        visitDate,
        period: 'MORNING',
        createdById: ids.actorUser,
        updatedById: ids.actorUser,
      },
    })
    await prisma.visitStudent.create({
      data: {
        id: ids.visitStudents[0],
        visitId: ids.visits[0],
        studentTermId: ids.enrollment,
        coopTermId: ids.term,
      },
    })
    await prisma.visitStudentSlot.create({
      data: {
        id: ids.visitSlots[0],
        visitId: ids.visits[0],
        studentTermId: ids.enrollment,
        round: 'ROUND_1',
        visitDate,
        period: 'MORNING',
      },
    })

    await expect(prisma.$transaction(async (tx) => {
      await tx.supervisionVisit.create({
        data: {
          id: ids.visits[1],
          coopTermId: ids.term,
          workSiteId: ids.workSite,
          round: 'ROUND_1',
          visitDate,
          period: 'AFTERNOON',
          createdById: ids.actorUser,
          updatedById: ids.actorUser,
        },
      })
      await tx.visitStudent.create({
        data: {
          id: ids.visitStudents[1],
          visitId: ids.visits[1],
          studentTermId: ids.enrollment,
          coopTermId: ids.term,
        },
      })
      await tx.visitStudentSlot.create({
        data: {
          id: ids.visitSlots[1],
          visitId: ids.visits[1],
          studentTermId: ids.enrollment,
          round: 'ROUND_1',
          visitDate,
          period: 'AFTERNOON',
        },
      })
    })).rejects.toMatchObject({ code: 'P2002' })
    expect(await prisma.supervisionVisit.findUnique({ where: { id: ids.visits[1] } })).toBeNull()

    await prisma.visitStudentSlot.delete({ where: { id: ids.visitSlots[0] } })
    await prisma.supervisionVisit.create({
      data: {
        id: ids.visits[1],
        coopTermId: ids.term,
        workSiteId: ids.workSite,
        round: 'ROUND_1',
        visitDate,
        period: 'AFTERNOON',
        createdById: ids.actorUser,
        updatedById: ids.actorUser,
      },
    })
    await prisma.visitStudent.create({
      data: {
        id: ids.visitStudents[1],
        visitId: ids.visits[1],
        studentTermId: ids.enrollment,
        coopTermId: ids.term,
      },
    })
    await prisma.visitStudentSlot.create({
      data: {
        id: ids.visitSlots[1],
        visitId: ids.visits[1],
        studentTermId: ids.enrollment,
        round: 'ROUND_1',
        visitDate,
        period: 'AFTERNOON',
      },
    })
    expect(await prisma.visitStudentSlot.count({ where: { studentTermId: ids.enrollment } })).toBe(1)
  })

  it('rolls back a response form and its member result when a transaction fails', async () => {
    await expect(prisma.$transaction(async (tx) => {
      await tx.responseForm.create({
        data: {
          id: ids.rollbackForm,
          batchId: ids.batches[0],
          revision: 99,
          fileVersionId: ids.fileVersion,
          uploadedById: ids.actorUser,
        },
      })
      await tx.responseStudentResult.create({
        data: {
          id: ids.rollbackResult,
          responseFormId: ids.rollbackForm,
          batchMemberId: ids.members[0],
          batchId: ids.batches[0],
          result: 'DECLINED',
        },
      })
      throw new Error('force response rollback')
    })).rejects.toThrow('force response rollback')

    expect(await prisma.responseForm.findUnique({ where: { id: ids.rollbackForm } })).toBeNull()
    expect(await prisma.responseStudentResult.findUnique({ where: { id: ids.rollbackResult } })).toBeNull()
  })

  it('rejects audit update and delete even through a root connection', async () => {
    await expect(prisma.$transaction(async (tx) => {
      await tx.auditLog.create({
        data: {
          id: ids.audit,
          actorId: ids.actorUser,
          action: 'MYSQL_RUNTIME_TEST',
          entityType: 'RuntimeFixture',
          entityId: ids.application,
          requestId: `runtime-${suffix}`,
          afterData: { state: 'created' },
        },
      })

      await expect(tx.auditLog.update({
        where: { id: ids.audit },
        data: { reason: 'must be rejected' },
      })).rejects.toThrow(/append-only: UPDATE forbidden/)
      await expect(tx.auditLog.delete({ where: { id: ids.audit } }))
        .rejects.toThrow(/append-only: DELETE forbidden/)

      throw new Error('rollback audit fixture')
    })).rejects.toThrow('rollback audit fixture')
    expect(await prisma.auditLog.findUnique({ where: { id: ids.audit } })).toBeNull()
  })

  it('rejects a user whose canonical login value is not an email', async () => {
    await expect(prisma.user.create({
      data: {
        id: ids.invalidEmailUser,
        identifier: `invalid-${suffix}`,
        normalizedIdentifier: `invalid-${suffix}`,
        email: 'not-an-email',
        normalizedEmail: 'not-an-email',
        passwordHash: 'not-used-by-runtime-test',
        role: 'STUDENT',
        status: 'ACTIVE',
        mustChangePassword: false,
      },
    })).rejects.toThrow()
    expect(await prisma.user.findUnique({ where: { id: ids.invalidEmailUser } })).toBeNull()
  })
})
