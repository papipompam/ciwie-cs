# ตารางสิทธิ์ตาม Role

| พื้นที่ระบบ | Student | Lecturer | Staff | หลักฐาน/หมายเหตุ |
|---|---|---|---|---|
| Login/Session | อนุญาต | อนุญาต | อนุญาต | /api/auth และ server/utils/session.ts |
| Student Application | เฉพาะตนเอง | อ่านผ่าน Staff Endpoint | อ่าน/เปลี่ยนสถานะ | มี BUG-001 |
| Placement Document | คำร้องตนเอง | ไม่พบสิทธิ์ | Upload/Review/Read | placement-requests API |
| Company | ไม่พบ API | อ่าน/เพิ่ม/แก้ | อ่าน/เพิ่ม/แก้ | Student Browse เป็น Gap |
| People | ไม่อนุญาต | อ่าน/แก้ชื่อจำกัด | CRUD/Import/บัญชี | มี Server Guard |
| Supervision | รายการของตนเอง | งานที่มอบหมาย | ทั้งหมด | ต้องทดสอบ IDOR |
| Evaluation | ไม่พบ API อ่านผล | งานที่มอบหมาย | อ่าน/จัดการ | Student Result Gap |
| Calendar/Notification | ของตนเอง | ของตนเอง | ของตนเอง | กรอง Owner/Recipient |
| Dashboard/Expenses | ไม่อนุญาต | ไม่อนุญาต | อนุญาต | ตรวจ Role ที่ Server |

## Route Matrix
| Role | หน้า Student | หน้า Lecturer | หน้า Staff |
|---|---|---|---|
| Student | Allow | Deny | Deny |
| Lecturer | Deny ตามสิทธิ์ | Allow | Deny |
| Staff | Deny ตามสิทธิ์ | Deny ตามสิทธิ์ | Allow |

Client Middleware ไม่ใช่ความปลอดภัยเพียงอย่างเดียว ต้องทดสอบ Direct API และแก้ไข ID ในทุก Endpoint
