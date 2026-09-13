# Security Testing Checklist

| หัวข้อ | หลักฐานจาก Code | ผลประเมิน |
|---|---|---|
| Authentication | H3 Session, httpOnly, sameSite=lax, อายุ 8 ชั่วโมง | ต้องทดสอบ Expiry/Logout |
| Session Invalidation | ตรวจ sessionVersion กับ Database | ทดสอบ Suspend/เปลี่ยน Role |
| RBAC Server-side | API ส่วนใหญ่เรียก requireUserSession | ต้องรัน API Matrix |
| IDOR | Query จำกัด Student และงาน Lecturer | ต้องทดสอบทุก ID Endpoint |
| Mass Assignment | ใช้ Zod และ Strict Object | BUG-001 เป็นช่องโหว่เชิงสิทธิ์ |
| SQL Injection | ใช้ Prisma และ Zod | ต้องทดสอบ Payload |
| XSS | มี Text Field หลายจุด | ตรวจการ Escape |
| CSRF | sameSite=lax แต่ไม่พบ CSRF Token | ประเมินก่อน Production |
| File Upload | ตรวจ PDF, Magic Bytes, ขนาด 5MB | ยังไม่พบ Malware Scan |
| Error Disclosure | ใช้ข้อความ Error ทั่วไป | ทดสอบ 400/401/403/404/409/422/500 |

เป็น Safe Security Testing เท่านั้น ไม่ได้ทำลายข้อมูล
