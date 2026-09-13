# รายงาน Bug

## BUG-001: Student เปลี่ยน Application Status และอาจยืนยัน Placement เองได้
- Module: Student Application API
- Role: Student
- Severity: Critical
- Priority: P0
- ขั้นตอน: เรียก PATCH /api/student/applications/{id} ด้วย Full Form และ status accepted จากนั้นส่ง status completed
- Expected: Student แก้เฉพาะข้อมูลที่อนุญาต; Status ที่ควบคุมโดยบริษัท/Staff ต้องตรวจ Server
- Actual: followsProgress ใช้กับทั้ง Student และ Staff และ ACCEPTED -> COMPLETED สร้าง Placement Request
- Affected File: server/api/student/applications/[id].patch.ts:13,33-53,58-87
- Evidence: ตรวจ Source Code โดยตรง
- Recommendation: แยก Schema แก้ข้อมูล Student จาก Schema เปลี่ยน Status ของ Staff และกำหนด Actor/Transition Matrix

## BUG-002: Cancel Application ไม่เคลียร์ Active Slot
- Module: Student Application
- Role: Student
- Severity: Major
- Priority: P1
- Expected: ทำงานตามกฎสถานะจบ
- Actual: เคลียร์ activeSlotKey เฉพาะ REJECTED แต่ไม่เคลียร์ CANCELLED ขณะที่ Shared Helper ถือว่า cancelled เป็นสถานะจบ
- Affected Files: server/api/student/applications/[id].patch.ts:115 และ shared/student-applications.ts
- Recommendation: ตัดสินกฎ Cancellation แล้วปรับ API, UI และ Test ให้ตรงกัน

## Regression Evidence
pnpm test พบ Test ล้มเหลว 5 รายการ ได้แก่ Company, Supervision Metadata, Notification Assertion และ Expense Gender Rule 2 รายการ ต้องยืนยัน Contract ก่อนจัดเป็น Product Bug
