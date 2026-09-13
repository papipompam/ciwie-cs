# End-to-End Test Scenario

## E2E-01 Student Application
Staff สร้าง/Import Student และเปิดรอบ → Student Login ครั้งแรกและเปลี่ยนรหัสผ่าน → ส่งใบสมัคร → Refresh ตรวจรายการ → ส่งซ้ำต้องได้ 409 → ใบสมัครถูก Reject → สมัครบริษัทใหม่

เพิ่มกรณี Student แก้ Status เองและส่ง Request พร้อมกัน

## E2E-02 Supervision
Staff ยืนยัน Placement → สร้าง Group และมอบหมาย Lecturer → Publish Appointment → Student เห็นเฉพาะงานของตน → Lecturer เห็นเฉพาะงานที่มอบหมาย → บันทึกผล → ส่ง Evaluation → Staff อ่านและ Export

เพิ่มกรณีตารางชนกันของ Lecturer, Student และ Company

## E2E-03 Documents
Student Upload PDF → Staff Review → Return ต้องมีเหตุผล → Upload ใหม่แล้ว Version เพิ่ม → เปิด Document ของผู้อื่นต้องถูกปฏิเสธ

## E2E-04 Account Lifecycle
Staff Suspend/Terminate → Session เดิมถูกยกเลิก → Login ไม่ได้ → Reset Password แล้วเข้าสู่ First Login

สถานะ: ยังไม่ได้ทดสอบเป็น Browser E2E จริง
