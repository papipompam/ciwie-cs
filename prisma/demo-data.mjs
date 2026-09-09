// Deterministic records used by the opt-in development seed.
// Keep these IDs stable so `prisma db seed` remains safe to run repeatedly.
export const demoStudentApplication = {
  id: 'DEMO-APP-001',
  enrollmentId: 'ENROLLMENT-001',
  companyNameSnapshot: 'บริษัท บุรีรัมย์ดิจิทัล จำกัด',
  companyLocation: '88/8 ถนนธานี ตำบลในเมือง อำเภอเมืองบุรีรัมย์ จังหวัดบุรีรัมย์ 31000',
  recipientNameSnapshot: 'ผู้จัดการฝ่ายทรัพยากรบุคคล',
  letterAddressSnapshot: 'บริษัท บุรีรัมย์ดิจิทัล จำกัด 88/8 ถนนธานี ตำบลในเมือง อำเภอเมืองบุรีรัมย์ จังหวัดบุรีรัมย์ 31000',
  latitude: 14.993,
  longitude: 103.102,
  provinceSnapshot: 'บุรีรัมย์',
  positionTitle: 'Frontend Developer',
  appliedDate: '2026-09-10',
  status: 'COMPLETED',
  activeSlotKey: 'DEMO-ENROLLMENT-001-ACTIVE',
}

export const demoPlacementRequest = {
  id: 'DEMO-REQ-001',
  requestNo: 'REQ-DEMO-0001',
  studentApplicationId: demoStudentApplication.id,
  enrollmentId: demoStudentApplication.enrollmentId,
  companyNameSnapshot: demoStudentApplication.companyNameSnapshot,
  companyLocationSnapshot: demoStudentApplication.companyLocation,
  provinceSnapshot: demoStudentApplication.provinceSnapshot,
  latitude: demoStudentApplication.latitude,
  longitude: demoStudentApplication.longitude,
  positionTitle: demoStudentApplication.positionTitle,
  recipientName: demoStudentApplication.recipientNameSnapshot,
  recipientRole: 'ผู้จัดการฝ่ายทรัพยากรบุคคล',
  letterAddress: demoStudentApplication.letterAddressSnapshot,
  status: 'SUBMITTED',
  activeSlotKey: 'DEMO-ENROLLMENT-001-REQUEST',
  submittedAt: '2026-09-10T09:00:00.000Z',
}
