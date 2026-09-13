# รายการ Test Case

| TC-ID | Module/Role | สถานการณ์ทดสอบ | Expected Result | Status/Priority |
|---|---|---|---|---|
| AUTH-001 | Auth/ทุก Role | Login ถูกต้อง | สร้าง Session และ Role ถูกต้อง | Not Tested/P0 |
| AUTH-002 | Auth/ทุก Role | Password ผิด/ไม่มี User/ช่องว่าง | 401/400 และไม่สร้าง Session | Not Tested/P0 |
| AUTH-003 | Auth/ทุก Role | Login ผิด 3 ครั้ง | Lock ชั่วคราว | Pass/P1 |
| AUTH-004 | Auth/ทุก Role | Logout แล้ว Refresh/Back/API | 401 และ Session ถูกทำลาย | Not Tested/P0 |
| RBAC-001 | Student | เรียก Staff API | 403 | Not Tested/P0 |
| RBAC-002 | Lecturer | เรียก Staff CRUD | 403 | Not Tested/P0 |
| RBAC-003 | Student/IDOR | เรียก Application ของคนอื่น | 404/403 และไม่เปลี่ยนข้อมูล | Pass จาก Code/P0 |
| APP-001 | Student | ไม่มี Application แล้วส่งข้อมูลถูกต้อง | สร้าง SUBMITTED หนึ่งรายการ | Pass/P0 |
| APP-002 | Student | มี Active แล้วส่งซ้ำ | 409 และไม่สร้างซ้ำ | Pass จาก Unique/P0 |
| APP-003 | Student | POST พร้อมกันสอง Request | สำเร็จหนึ่งรายการ อีกอัน 409 | Not Tested/P0 |
| APP-004 | Student | PATCH เป็น accepted | ต้องปฏิเสธหากไม่มีสิทธิ์ | Fail: BUG-001/P0 |
| APP-005 | Student | Cancel แล้วสมัครใหม่ | เป็นไปตามกฎ Slot | เสี่ยง BUG-002/P1 |
| SUP-001 | Staff | อาจารย์วัน/ช่วงเวลาเดิม | 409 Conflict | ยังไม่พบหลักฐาน/P1 |
| EVAL-001 | Lecturer | ส่งคะแนน 1–5 | บันทึกได้ | Pass จาก Code/P1 |
| IMP-001 | Staff | File มีรหัสซ้ำ | 409 และ Rollback | Pass จาก Code/P1 |
| SEC-001 | ทุก Role | ส่ง XSS/SQL-like Input | Validation และไม่เปิดเผย Secret | Not Tested/P0 |
