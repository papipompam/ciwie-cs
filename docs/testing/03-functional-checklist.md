# Functional Testing Checklist

| Module | Positive Case | Negative/Boundary Case | Permission Case | Status |
|---|---|---|---|---|
| Authentication | Login, Logout, First Login | Password ผิด, Lockout, Session หมดอายุ | เปิด URL/API ไม่มีสิทธิ์ | ตรวจบางส่วน |
| Student Application | สร้าง/อ่านของตนเอง | ซ้ำ, Rejected, Cancel, Double Submit | ใช้ ID คนอื่น/แก้ Status | เสี่ยง BUG-001 |
| Placement Request | Upload/Review/Confirm | PDF ผิด, เอกสารไม่ครบ | เปิดคำร้องคนอื่น | ตรวจบางส่วน |
| People | Create/Update/Import | ID ซ้ำ, Prefix ผิด | เรียก Staff API | ตรวจบางส่วน |
| Company | List/Create/Update | Tax ID/Code ซ้ำ | Student เรียก API | Test ล้มเหลว/มี Gap |
| Supervision | Suggest/Create/Assign | วันซ้ำ, คนซ้ำ, Status ผิด | Lecturer ไม่ได้รับมอบหมาย | ยังไม่พบ Conflict |
| Evaluation | Draft/Submit | คะแนน 0, 6, ติดลบ, Decimal | ผู้ประเมินไม่มีสิทธิ์ | ตรวจบางส่วน |
| Expenses | คำนวณ/บันทึก | ไม่มีเพศ/จำนวนเงินผิด | Staff เท่านั้น | Test ล้มเหลว |
| UI | Loading/Empty/Error/Success | Refresh, Double Click, Mobile | Navigation ตาม Role | ยังไม่ทดสอบเป็นระบบ |

Not Tested หมายถึงยังไม่มีหลักฐานการทดสอบครบถ้วน
