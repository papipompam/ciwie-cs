import type { PrismaClient } from '@prisma/client'
import type { AuthRepository, AuthUserRecord } from '../services/auth-service'

export class PrismaAuthRepository implements AuthRepository {
  constructor(private readonly db: PrismaClient) {}

  async findByEmail(normalizedEmail: string): Promise<AuthUserRecord | null> {
    const user = await this.db.user.findUnique({
      where: { normalizedEmail },
      include: {
        studentProfile: { include: { enrollments: { where: { coopTerm: { isActive: true } }, orderBy: { createdAt: 'desc' }, take: 1 } } },
        lecturerProfile: true,
      },
    })
    if (!user) return null
    return {
      id: user.id,
      normalizedEmail: user.normalizedEmail,
      passwordHash: user.passwordHash,
      role: user.role,
      status: user.status,
      sessionVersion: user.sessionVersion,
      mustChangePassword: user.mustChangePassword,
      studentTermId: user.studentProfile?.enrollments[0]?.id,
      lecturerId: user.lecturerProfile?.id,
    }
  }

  async recordSuccessfulLogin(userId: string, at: Date): Promise<void> {
    await this.db.user.update({ where: { id: userId }, data: { lastLoginAt: at } })
  }
}
