import { mockStudentApplications } from '../../utils/mockStudentApplications'

export default defineEventHandler(() => mockStudentApplications.filter(item => item.studentId === '66123456701'))
