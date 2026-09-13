# การทดสอบ Critical Business Rule

## กฎ Active Application
Schema มี StudentApplication.activeSlotKey เป็น Nullable Unique และ API กำหนดค่าเป็น enrollment.id จึงป้องกัน Active Application ซ้ำในระดับ Database นอกจากนี้ getActiveEnrollment จำกัด Enrollment ที่ Active และอยู่ในรอบที่เปิดรับหรือกำลังฝึกงาน

## ประเด็นที่พบ
1. server/api/student/applications/[id].patch.ts:49-53 ตรวจ Transition โดยไม่ได้จำกัด Actor
2. Student อาจเปลี่ยน SUBMITTED เป็น ACCEPTED หรือ REJECTED
3. ACCEPTED -> COMPLETED ถูกอนุญาตสำหรับ Student และบรรทัด 58-87 สร้าง Placement Request
4. CANCELLED ไม่เคลียร์ activeSlotKey แต่ Shared Helper ถือว่าเป็นสถานะจบ
5. ยังไม่มี Test สำหรับ Concurrent POST, Refresh และ Unique Constraint บน PostgreSQL จริง

## Test ที่ต้องทำ
BR-001 ไม่มี Application ต้องสมัครได้; BR-002 มี Active ต้องสมัครใหม่ไม่ได้; BR-003 Waiting/Interview ต้องสมัครใหม่ไม่ได้; BR-004 Rejected สมัครใหม่ได้ตามกฎ; BR-005 ยิง API ซ้ำต้องถูกปฏิเสธ; BR-006 Double Click ไม่ซ้ำ; BR-007 Concurrent Request เหลือหนึ่งรายการ; BR-008 Refresh ไม่ Insert ซ้ำ; BR-009 เปลี่ยน Student ID ต้องสร้างให้ผู้อื่นไม่ได้
