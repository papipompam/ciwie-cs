import { expect, test, type Page } from '@playwright/test'

type Role = 'STUDENT' | 'LECTURER' | 'ADMIN'

async function loginAs(page: Page, role: Role) {
  await page.route('**/api/auth/login', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }))
  await page.route('**/api/auth/session', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ user: { userId: `${role.toLowerCase()}-1`, role, active: true, sessionVersion: 1 } })
  }))
  await page.goto('/login')
  await page.getByLabel('อีเมล').fill(`${role.toLowerCase()}@example.test`)
  await page.getByLabel('รหัสผ่าน', { exact: true }).fill('ValidPassphrase123!')
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click()
  await expect(page).toHaveURL(/\/$/)
}

async function navigateInApp(page: Page, path: string) {
  await page.evaluate(async (target) => {
    const nuxt = (window as unknown as { useNuxtApp: () => { $router: { push: (value: string) => Promise<void> } } }).useNuxtApp()
    await nuxt.$router.push(target)
  }, path)
}

async function openNavigation(page: Page) {
  const navigation = page.getByRole('navigation', { name: 'เมนูหลัก' })
  if (!await navigation.isVisible()) await page.getByRole('button', { name: 'เปิดเมนู' }).click()
  await expect(navigation).toBeVisible()
  return navigation
}

async function mockLookups(page: Page, overrides: Record<string, Array<Record<string, unknown>>> = {}) {
  const defaults: Record<string, Array<Record<string, unknown>>> = {
    COOP_TERMS: [{ id: 'term-1', label: 'ภาคเรียนทดสอบ' }],
    ORGANIZATIONS: [{ id: 'org-1', label: 'บริษัทตัวอย่าง' }],
    WORK_SITES: [{ id: 'site-1', label: 'บริษัทตัวอย่าง — สำนักงานใหญ่' }],
    CONTACTS: [],
    STUDENT_TERMS: [{ id: 'student-term-1', userId: 'student-1', label: '65000001 — สมชาย ใจดี' }, { id: 'student-term-2', userId: 'student-2', label: '65000002 — สมหญิง จริงใจ' }],
    LECTURERS: [{ id: 'lecturer-1', userId: 'lecturer-user-1', label: 'อาจารย์หนึ่ง' }],
    EVALUATION_TEMPLATES: [{ id: 'template-version-1', label: 'แบบประเมินมาตรฐาน (v1)' }],
    DOCUMENT_BATCHES: [{ id: 'batch-1', label: 'DOC-001' }],
    DELIVERIES: [{ id: 'delivery-1', label: 'DOC-001 — บริษัทตัวอย่าง' }]
  }
  await page.route('**/api/lookups**', (route) => {
    const resource = new URL(route.request().url()).searchParams.get('resource') || ''
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: overrides[resource] || defaults[resource] || [] }) })
  })
}

test('login validates required credentials without calling the API', async ({ page }) => {
  let requested = false
  await page.route('**/api/auth/login', (route) => { requested = true; return route.abort() })
  await page.goto('/login')
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click()
  await expect(page.getByRole('alert')).toContainText('กรุณากรอกอีเมลและรหัสผ่าน')
  expect(requested).toBe(false)
})

test('first login requires a password change before opening protected data', async ({ page }) => {
  await page.route('**/api/auth/login', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }))
  await page.route('**/api/auth/session', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ user: { userId: 'admin-1', role: 'ADMIN', active: true, sessionVersion: 1, mustChangePassword: true } })
  }))
  await page.goto('/login')
  await page.getByLabel('อีเมล').fill('admin@example.test')
  await page.getByLabel('รหัสผ่าน', { exact: true }).fill('InitialPassphrase123!')
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click()
  await expect(page).toHaveURL(/\/change-password$/)
  await expect(page.getByRole('heading', { name: 'เปลี่ยนรหัสผ่านครั้งแรก' })).toBeVisible()
})

test('student sees only student navigation and is blocked from admin expense', async ({ page }) => {
  await loginAs(page, 'STUDENT')
  const navigation = await openNavigation(page)
  await expect(navigation.getByRole('link', { name: 'ใบสมัครงาน' })).toBeVisible()
  await expect(navigation.getByRole('link', { name: 'นักศึกษา' })).toHaveCount(0)
  await expect(navigation.getByRole('link', { name: 'ค่าใช้จ่าย' })).toHaveCount(0)
  await navigateInApp(page, '/expenses')
  await expect(page.getByRole('heading', { name: 'ไม่มีสิทธิ์เข้าถึง' })).toBeVisible()
})

test('lecturer can open evaluation work queue', async ({ page }) => {
  await page.route('**/api/evaluations**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ data: [], meta: { total: 0, page: 1, pageSize: 20 } })
  }))
  await loginAs(page, 'LECTURER')
  await (await openNavigation(page)).getByRole('link', { name: 'การประเมิน' }).click()
  await expect(page.getByRole('heading', { name: 'การประเมิน' })).toBeVisible()
  await expect(page.getByText('ยังไม่มีข้อมูล')).toBeVisible()
  await expect(page.getByRole('link', { name: 'ค่าใช้จ่าย' })).toHaveCount(0)
})

test('admin list supports three-state server sort and accessible table controls', async ({ page }) => {
  await page.route('**/api/applications**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ data: [{ id: 'app-1', studentName: 'สมชาย ใจดี', organizationName: 'บริษัทตัวอย่าง', workSiteName: 'กรุงเทพฯ', status: 'SUBMITTED', updatedAt: '2026-08-18' }], meta: { total: 1, page: 1, pageSize: 20 } })
  }))
  await loginAs(page, 'ADMIN')
  await (await openNavigation(page)).getByRole('link', { name: 'ใบสมัครงาน' }).click()
  await expect(page.getByRole('heading', { name: 'ใบสมัครงาน' })).toBeVisible()
  const statusSort = page.getByRole('columnheader', { name: /สถานะ/ }).getByRole('button')
  await statusSort.click()
  await expect(page).toHaveURL(/sort=status.*order=asc|order=asc.*sort=status/)
  await statusSort.click()
  await expect(page).toHaveURL(/sort=status.*order=desc|order=desc.*sort=status/)
  await statusSort.click()
  await expect(page).not.toHaveURL(/sort=status/)
  await expect(page.getByLabel('รีเฟรชข้อมูล')).toBeVisible()
  await expect(page.getByLabel('จำนวนรายการต่อหน้า')).toBeVisible()
})

test('mobile uses top bar drawer navigation', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'ตรวจเฉพาะ mobile project')
  await loginAs(page, 'ADMIN')
  await page.getByRole('button', { name: 'เปิดเมนู' }).click()
  await expect(page.getByRole('navigation', { name: 'เมนูหลัก' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'ประวัติระบบ' })).toBeVisible()
  await page.getByRole('button', { name: 'ปิดเมนู', exact: true }).last().click()
  await expect(page.getByRole('navigation', { name: 'เมนูหลัก' })).toBeHidden()
})

test('student records every shared-response member result before submitting review', async ({ page }) => {
  let draftBody: unknown
  await page.route('**/api/responses**', async (route) => {
    const url = new URL(route.request().url())
    if (route.request().method() === 'PUT') {
      draftBody = route.request().postDataJSON()
      expect(route.request().headers()['idempotency-key']).toBeTruthy()
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'response-1', version: 3 }) })
    }
    if (url.pathname === '/api/responses/response-1') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'response-1', version: 2, status: 'DRAFT', members: [{ batchMemberId: 'member-1', studentName: 'สมชาย ใจดี' }, { batchMemberId: 'member-2', studentName: 'สมหญิง จริงใจ' }] }) })
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [{ id: 'response-1', batchNumber: 'B-001', workSiteName: 'บริษัทตัวอย่าง', memberCount: 2, status: 'DRAFT' }], meta: { total: 1 } }) })
  })
  await loginAs(page, 'STUDENT')
  await (await openNavigation(page)).getByRole('link', { name: 'แบบตอบรับ' }).click()
  await page.getByRole('button', { name: 'ดู' }).click()
  await page.getByLabel('ผลตอบรับของ สมชาย ใจดี').selectOption('ACCEPTED')
  await page.getByLabel('ผลตอบรับของ สมหญิง จริงใจ').selectOption('DECLINED')
  await page.getByRole('button', { name: 'บันทึกร่าง' }).click()
  await expect.poll(() => draftBody).toEqual({ expectedVersion: 2, results: [{ batchMemberId: 'member-1', result: 'ACCEPTED' }, { batchMemberId: 'member-2', result: 'DECLINED' }] })
})

test('lecturer completes required rubric and submits evaluation snapshot', async ({ page }) => {
  let submitBody: unknown
  await page.route('**/api/evaluations**', async (route) => {
    const url = new URL(route.request().url())
    if (route.request().method() === 'POST') { submitBody = route.request().postDataJSON(); return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'evaluation-1', version: 2 }) }) }
    if (url.pathname === '/api/evaluations/evaluation-1') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'evaluation-1', version: 1, status: 'DRAFT', subjectType: 'STUDENT', round: 1, visitStudentId: 'visit-student-1', templateVersionId: 'template-version-3', templateVersion: { version: 3, items: [{ id: 'item-1', code: 'RESPONSIBILITY', label: 'ความรับผิดชอบ', answerType: 'SCORE', maxScore: 5, required: true }] }, answers: [] }) })
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [{ id: 'evaluation-1', round: 1, subjectType: 'STUDENT', workSiteName: 'บริษัทตัวอย่าง', templateVersion: 3, status: 'DRAFT', capabilities: { edit: true } }], total: 1, page: 1, pageSize: 20 }) })
  })
  await loginAs(page, 'LECTURER')
  await (await openNavigation(page)).getByRole('link', { name: 'การประเมิน' }).click()
  await page.getByRole('button', { name: 'ดู' }).click()
  await page.getByLabel('คะแนน (0–5)').fill('4')
  await page.getByRole('button', { name: 'ตรวจสอบและส่ง' }).click()
  await page.getByRole('button', { name: 'ยืนยันส่งผล' }).click()
  await expect.poll(() => submitBody).toEqual({ expectedVersion: 1, answers: [{ itemId: 'item-1', score: 4 }] })
})

test('admin schedules visit with arrays and idempotency key', async ({ page }) => {
  let visitBody: unknown
  await page.route('**/api/visits**', async (route) => {
    if (route.request().method() === 'POST') { visitBody = route.request().postDataJSON(); expect(route.request().headers()['idempotency-key']).toBeTruthy(); return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ visitId: 'visit-1' }) }) }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [], total: 0, page: 1, pageSize: 20 }) })
  })
  await mockLookups(page)
  await loginAs(page, 'ADMIN')
  await (await openNavigation(page)).getByRole('link', { name: 'การนิเทศ' }).click()
  await page.getByRole('button', { name: 'จัดตารางนิเทศ' }).click()
  await page.getByLabel('ภาคสหกิจ', { exact: true }).selectOption('term-1')
  await page.getByLabel('สถานที่ปฏิบัติงาน', { exact: true }).selectOption('site-1')
  await page.getByLabel('วันที่ *').fill('2026-09-01')
  await page.getByLabel('นักศึกษาที่มี Placement ณ สถานที่นี้', { exact: true }).selectOption(['student-term-1', 'student-term-2'])
  await page.getByLabel('อาจารย์นิเทศ', { exact: true }).selectOption('lecturer-1')
  await page.getByRole('button', { name: 'บันทึกตาราง' }).click()
  await expect.poll(() => visitBody).toMatchObject({ coopTermId: 'term-1', workSiteId: 'site-1', round: 1, date: '2026-09-01', period: 'MORNING', studentTermIds: ['student-term-1', 'student-term-2'], lecturerIds: ['lecturer-1'] })
})

test('admin previews selected import rows before atomic confirmation', async ({ page }) => {
  let confirmBody: unknown
  const previewHash = 'a'.repeat(64)
  await page.route('**/api/students**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [], total: 0, page: 1, pageSize: 20 }) }))
  await page.route('**/api/imports/**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname === '/api/imports/students') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'import-1', previewHash }) })
    if (url.pathname.endsWith('/preview')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [{ rowNumber: 2, studentCode: '65000001', displayName: 'สมชาย ใจดี', classification: 'NEW' }, { rowNumber: 3, studentCode: '65000002', displayName: 'ข้อมูลซ้ำ', classification: 'CONFLICT', message: 'ข้อมูลเปลี่ยนแปลง' }], page: 1, pageSize: 20, total: 2, previewHash }) })
    confirmBody = route.request().postDataJSON()
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'import-1', imported: 1 }) })
  })
  await loginAs(page, 'ADMIN')
  await (await openNavigation(page)).getByRole('link', { name: 'นักศึกษา' }).click()
  await page.getByRole('button', { name: 'นำเข้ารายชื่อ' }).click()
  await page.getByLabel('ภาคสหกิจ *').fill('term-1')
  await page.getByLabel('เลือกไฟล์ CSV หรือ XLSX').setInputFiles({ name: 'students.csv', mimeType: 'text/csv', buffer: Buffer.from('studentCode,name\n65000001,สมชาย') })
  await page.getByRole('button', { name: 'บันทึก' }).click()
  await expect(page.getByText('เลือกนำเข้า 1 แถว')).toBeVisible()
  await expect(page.getByLabel('เลือกแถว 2')).toBeChecked()
  await expect(page.getByLabel('เลือกแถว 3')).toHaveCount(0)
  await page.getByRole('button', { name: 'ยืนยันการนำเข้า' }).click()
  await expect.poll(() => confirmBody).toEqual({ previewHash, acceptedRowNumbers: [2], coopTermId: 'term-1' })
})

test('student application form sends only the strict application DTO', async ({ page }) => {
  let requestBody: unknown
  await mockLookups(page)
  await loginAs(page, 'STUDENT')
  await page.route('**/api/applications', async (route) => {
    if (route.request().method() === 'POST') {
      requestBody = route.request().postDataJSON()
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'application-1', status: 'SUBMITTED' }) })
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [], total: 0, page: 1, pageSize: 20 }) })
  })
  await (await openNavigation(page)).getByRole('link', { name: 'ใบสมัครงาน' }).click()
  await page.getByRole('button', { name: 'เพิ่มใบสมัคร' }).click()
  await page.getByLabel('รหัสภาคสหกิจของนักศึกษา *').fill('student-term-1')
  await page.getByLabel('สถานที่ปฏิบัติงาน', { exact: true }).selectOption('site-1')
  await page.getByLabel('ตำแหน่งที่สมัคร *').fill('Software Developer')
  await page.getByLabel('วันที่สมัคร *').fill('2026-08-24')
  await page.getByLabel('หมายเหตุ').fill('สมัครผ่านอีเมล')
  await page.getByRole('button', { name: 'บันทึก' }).click()
  await expect.poll(() => requestBody).toEqual({ studentTermId: 'student-term-1', workSiteId: 'site-1', positionTitle: 'Software Developer', appliedAt: '2026-08-24', note: 'สมัครผ่านอีเมล' })
})

test('admin expense form maps amount fields to the strict expense DTO', async ({ page }) => {
  let requestBody: unknown
  await loginAs(page, 'ADMIN')
  await page.route('**/api/expenses', async (route) => {
    if (route.request().method() === 'POST') { requestBody = route.request().postDataJSON(); return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }) }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [], total: 0, page: 1, pageSize: 20 }) })
  })
  await (await openNavigation(page)).getByRole('link', { name: 'ค่าใช้จ่าย' }).click()
  await page.getByRole('button', { name: 'เพิ่มค่าใช้จ่าย' }).click()
  await page.getByLabel('รหัสการนิเทศ *').fill('visit-1')
  await page.getByLabel('จำนวนวันเดินทาง *').fill('2')
  await page.getByLabel('ค่าเดินทาง *').fill('100.25')
  await page.getByLabel('ค่าที่พัก *').fill('200')
  await page.getByLabel('ค่าอาหาร *').fill('30')
  await page.getByRole('button', { name: 'บันทึก' }).click()
  await expect.poll(() => requestBody).toEqual({ visitId: 'visit-1', round: 1, travelDays: 2, travelAmount: 100.25, lodgingAmount: 200, mealAmount: 30 })
})

test('admin student-roster export uses uppercase format, report kind and coop term', async ({ page }) => {
  let requestBody: unknown
  await page.route('**/api/students**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [], total: 0, page: 1, pageSize: 20 }) }))
  await page.route('**/api/exports', async (route) => { requestBody = route.request().postDataJSON(); return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'export-1' }) }) })
  await loginAs(page, 'ADMIN')
  let dialogCount = 0
  page.on('dialog', dialog => { dialogCount += 1; void dialog.accept(dialogCount === 1 ? 'term-1' : 'XLSX') })
  await (await openNavigation(page)).getByRole('link', { name: 'นักศึกษา' }).click()
  await page.getByRole('button', { name: 'Export' }).click()
  await expect.poll(() => requestBody).toMatchObject({ kind: 'STUDENT_ROSTER', format: 'XLSX', coopTermId: 'term-1' })
})

test('lecturer transitions an application using the server-provided choices', async ({ page }) => {
  let body: unknown
  await loginAs(page, 'LECTURER')
  await page.route('**/api/applications/application-1**', async (route) => {
    if (route.request().method() === 'POST') { body = route.request().postDataJSON(); return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }) }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'application-1', version: 2, status: 'SUBMITTED', allowedTransitions: ['WAITING_RESPONSE', 'CANCELLED'], capabilities: { transition: true } }) })
  })
  await navigateInApp(page, '/applications/application-1')
  await page.getByLabel('สถานะปลายทาง').selectOption('WAITING_RESPONSE')
  await page.getByLabel('เหตุผล (จำเป็นสำหรับการยกเลิก ส่งกลับ หรือแก้ไข)').fill('อัปเดตตามหลักฐาน')
  await page.getByRole('button', { name: 'ยืนยันเปลี่ยนสถานะ' }).click()
  await expect.poll(() => body).toEqual({ to: 'WAITING_RESPONSE', reason: 'อัปเดตตามหลักฐาน', expectedVersion: 2 })
})

test('admin placement correction includes the replacement work site and reason', async ({ page }) => {
  let body: unknown
  await loginAs(page, 'ADMIN')
  await page.route('**/api/placements/placement-1**', async (route) => {
    if (route.request().method() === 'POST') { body = route.request().postDataJSON(); return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }) }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'placement-1', version: 3, currentWorkSiteId: 'site-old', capabilities: { correct: true, reverse: true } }) })
  })
  await navigateInApp(page, '/placements/placement-1')
  await page.getByLabel('Work Site ID ใหม่').fill('site-new')
  await page.getByLabel(/เหตุผล/).fill('แก้สถานที่ฝึกงาน')
  await page.getByRole('button', { name: 'แก้ไขข้อมูล' }).click()
  await expect.poll(() => body).toEqual({ expectedVersion: 3, workSiteId: 'site-new', reason: 'แก้สถานที่ฝึกงาน' })
})

test('admin corrects an expense with optimistic version and audit reason', async ({ page }) => {
  let body: unknown
  await loginAs(page, 'ADMIN')
  await page.route('**/api/expenses**', async (route) => {
    if (route.request().method() === 'POST') { body = route.request().postDataJSON(); return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }) }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'expense-1', visitId: 'visit-1', round: 1, travelDays: 2, travelAmount: 100, lodgingAmount: 200, mealAmount: 30, version: 4, capabilities: { correct: true } }) })
  })
  await navigateInApp(page, '/expenses/expense-1')
  await page.getByLabel('travelAmount').fill('125.50')
  await page.getByLabel(/เหตุผล/).fill('แก้ใบเสร็จ')
  await page.getByRole('button', { name: 'บันทึก Correction' }).click()
  await expect.poll(() => body).toEqual({ travelDays: 2, travelAmount: 125.5, lodgingAmount: 200, mealAmount: 30, expectedVersion: 4, reason: 'แก้ใบเสร็จ' })
})

test('lecturer corrects a submitted organization evaluation with a reason', async ({ page }) => {
  let body: unknown
  await loginAs(page, 'LECTURER')
  await page.route('**/api/organization-evaluations/evaluation-org-1/correct', async (route) => { body = route.request().postDataJSON(); return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }) })
  await page.route('**/api/evaluations/evaluation-org-1', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'evaluation-org-1', subjectType: 'ORGANIZATION', status: 'SUBMITTED', version: 2, templateVersion: { version: 1, items: [{ id: 'item-1', label: 'ความร่วมมือ', answerType: 'SCORE', maxScore: 5, required: true }] }, answers: [{ itemId: 'item-1', scoreValue: 4 }] }) }))
  await navigateInApp(page, '/evaluations/evaluation-org-1')
  await page.getByLabel('คะแนน (0–5)').fill('5')
  await page.getByLabel('เหตุผล Correction').fill('แก้ตามหลักฐาน')
  await page.getByRole('button', { name: 'บันทึก Correction' }).click()
  await expect.poll(() => body).toMatchObject({ expectedVersion: 2, reason: 'แก้ตามหลักฐาน', answers: [{ itemId: 'item-1', score: 5 }] })
})

test('admin reassigns a delivery owner with an audit reason', async ({ page }) => {
  let body: unknown
  await mockLookups(page, { LECTURERS: [{ id: 'lecturer-profile-2', userId: 'lecturer-2', label: 'อาจารย์สอง' }] })
  await loginAs(page, 'ADMIN')
  await page.route('**/api/deliveries/delivery-1/assign-owner', async (route) => { body = route.request().postDataJSON(); return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }) })
  await navigateInApp(page, '/documents/manage')
  await page.getByLabel('คำสั่ง').selectOption('assignOwner')
  await page.getByLabel('รายการนำส่ง', { exact: true }).selectOption('delivery-1')
  await page.locator('select').nth(2).selectOption('LECTURER')
  await page.getByLabel('ผู้รับผิดชอบการนำส่ง', { exact: true }).selectOption('lecturer-2')
  await page.getByPlaceholder('เหตุผลการเปลี่ยนผู้รับผิดชอบ').fill('ปรับผู้ประสานงาน')
  await page.getByRole('button', { name: 'ยืนยันคำสั่ง' }).click()
  await expect.poll(() => body).toEqual({ ownerType: 'LECTURER', ownerUserId: 'lecturer-2', reason: 'ปรับผู้ประสานงาน' })
})

test('assigned student records document delivery details', async ({ page }) => {
  let body: unknown
  await mockLookups(page)
  await loginAs(page, 'STUDENT')
  await page.route('**/api/deliveries/delivery-1/send', async (route) => { body = route.request().postDataJSON(); return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }) })
  await navigateInApp(page, '/documents/manage')
  await page.getByLabel('รายการนำส่ง', { exact: true }).selectOption('delivery-1')
  await page.getByPlaceholder('ช่องทาง').fill('อีเมล')
  await page.getByPlaceholder('ผู้รับ').fill('hr@example.test')
  await page.locator('input[type="datetime-local"]').fill('2026-08-24T10:30')
  await page.getByPlaceholder('หมายเหตุ').fill('ส่งถึงฝ่ายบุคคล')
  await page.getByRole('button', { name: 'ยืนยันคำสั่ง' }).click()
  await expect.poll(() => body).toEqual({ channel: 'อีเมล', recipient: 'hr@example.test', sentAt: '2026-08-24T03:30:00.000Z', note: 'ส่งถึงฝ่ายบุคคล' })
})

test('lecturer starts a student evaluation from the visit with a published template', async ({ page }) => {
  let draftBody: unknown
  await mockLookups(page)
  await page.route('**/api/visits/visit-1', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'visit-1', status: 'SCHEDULED', round: 'ROUND_1', lockVersion: 1, students: [{ id: 'visit-student-1', studentTermId: 'student-term-1', studentTerm: { student: { studentCode: '65000001', firstNameTh: 'สมชาย', lastNameTh: 'ใจดี' } } }], lecturers: [] }) }))
  await page.route('**/api/evaluations', async (route) => {
    if (route.request().method() === 'POST') { draftBody = route.request().postDataJSON(); return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'evaluation-new', version: 1 }) }) }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [], total: 0, page: 1, pageSize: 20 }) })
  })
  await page.route('**/api/evaluations/evaluation-new**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'evaluation-new', subjectType: 'STUDENT', status: 'DRAFT', version: 1, templateVersion: { items: [] }, answers: [] }) }))
  await loginAs(page, 'LECTURER')
  await navigateInApp(page, '/visits/visit-1')
  await page.getByRole('combobox', { name: 'นักศึกษา', exact: true }).selectOption('visit-student-1')
  await page.getByLabel('แบบประเมินฉบับที่เผยแพร่', { exact: true }).selectOption('template-version-1')
  await page.getByRole('button', { name: 'สร้างฉบับร่าง' }).click()
  await expect.poll(() => draftBody).toEqual({ visitStudentId: 'visit-student-1', templateVersionId: 'template-version-1', answers: [] })
})

test('organization evaluation draft preserves optimistic version', async ({ page }) => {
  let draftBody: unknown
  await page.route('**/api/organization-evaluations', async (route) => { draftBody = route.request().postDataJSON(); return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'evaluation-org-1', version: 4 }) }) })
  await page.route('**/api/evaluations/evaluation-org-1', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'evaluation-org-1', visitId: 'visit-1', subjectType: 'ORGANIZATION', status: 'DRAFT', version: 3, templateVersionId: 'template-version-1', templateVersion: { items: [{ id: 'item-1', label: 'ความร่วมมือ', answerType: 'SCORE', maxScore: 5, required: true }] }, answers: [{ itemId: 'item-1', scoreValue: 4 }], capabilities: { edit: true, submit: true } }) }))
  await loginAs(page, 'LECTURER')
  await navigateInApp(page, '/evaluations/evaluation-org-1')
  await page.getByRole('button', { name: 'บันทึกร่าง' }).click()
  await expect.poll(() => draftBody).toEqual({ visitId: 'visit-1', templateVersionId: 'template-version-1', answers: [{ itemId: 'item-1', score: 4 }], expectedVersion: 3 })
})

test('export notification uses page result and opens the authorized download', async ({ page }) => {
  let statusRequested = false
  let downloadRequested = false
  await page.addInitScript(() => { window.open = ((url?: string | URL) => { document.documentElement.dataset.openedUrl = String(url); return null }) as typeof window.open })
  await page.route('**/api/notifications**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [{ id: 'notification-1', title: 'ไฟล์ส่งออกพร้อมแล้ว', body: 'ดาวน์โหลดได้ภายใน 24 ชั่วโมง', entityType: 'ExportJob', entityId: 'export-1' }], total: 1, page: 1, pageSize: 100 }) }))
  await page.route('**/api/exports/export-1/download', (route) => { downloadRequested = true; return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ url: '/signed/export-1.xlsx' }) }) })
  await page.route('**/api/exports/export-1', (route) => { statusRequested = true; return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'COMPLETED' }) }) })
  await loginAs(page, 'ADMIN')
  await navigateInApp(page, '/notifications')
  await expect(page.getByText('ดาวน์โหลดได้ภายใน 24 ชั่วโมง')).toBeVisible()
  await page.getByRole('button', { name: 'ตรวจสถานะและดาวน์โหลด' }).click()
  await expect.poll(() => statusRequested && downloadRequested).toBe(true)
  await expect.poll(() => page.locator('html').getAttribute('data-opened-url')).toBe('/signed/export-1.xlsx')
})
