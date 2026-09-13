# สถานะการทำงาน: ย้าย Runtime Demo Data ไปใช้ Backend

วันที่: 12 กันยายน 2569  
อ้างอิงแผน: [backend-real-data-agent-runbook.md](./backend-real-data-agent-runbook.md)

## สิ่งที่ทำในรอบนี้

- เพิ่ม `GET /api/coop-cycles` พร้อม shared Zod schema และเปลี่ยน `useCoopCycles` ให้ cache จาก API เริ่มต้นว่าง เลือกรอบที่เปิดอยู่หรือรอบล่าสุดอย่าง deterministic
- เพิ่ม calendar custom-event schemas และ `GET`/`POST /api/calendar/events`; custom events มาจาก account ใน session และคงอยู่หลัง refresh
- ตัด local placement flow เก่า (`useStudentPlacements`), mock document route และ mock student-application helper; upload/review/confirm ใน preview ใช้ endpoint จริงแล้ว
- เปลี่ยนหน้าและ assistant ของ supervision groups ให้โหลด/persist ผ่าน endpoints และไม่ fallback กลับไปยัง group/company/schedule demo
- เปลี่ยน people, student applications, notifications และ evaluations ให้ runtime cache เริ่มต้นเป็น array ว่าง และ reload response จาก server หลัง mutation ที่เกี่ยวข้อง
- lecturer applications ใช้ aggregate list endpoint แบบ read-only โดย server อนุญาต staff และ lecturer; student ยังถูกปฏิเสธ
- เปลี่ยน dashboard lecturer ที่เคยใช้ id ตายตัวให้ใช้ account จาก session ในส่วนที่แก้ไข

## สิ่งที่ตัดออก

- `app/composables/useStudentPlacements.ts`
- `server/api/mock-documents/[fileName].get.ts`
- `server/utils/mockStudentApplications.ts`
- หน้า supervision grouping prototype ที่เป็น runtime route
- ชุดทดสอบ composable/preview ที่ทดสอบ local in-memory placement interface เดิม

## สิ่งที่ยังต้องทำก่อนกล่าวว่า migration ครบ

- ลบ local mutation ที่ตายแล้วใน `usePeopleDirectory` และ `useSupervisionGroups` ให้หมดหลังยืนยัน caller ที่เหลือ; fixture declarations ของ flow ที่ย้ายในรอบนี้ถูกลบแล้ว
- เปลี่ยน staff/lecturer/student dashboards ทุกส่วนให้ใช้ session/query จริง และเพิ่ม lecturer dashboard aggregate endpoint ตาม runbook
- ขยาย server tests สำหรับ cycle route, calendar owner scope และ placement transition/concurrency ตาม acceptance matrix
- ทำ PostgreSQL integration smoke โดยใช้ฐานชั่วคราวที่ agent สร้างเท่านั้น

## ข้อควรระวัง

- ไม่มี Prisma schema migration ในรอบนี้ และไม่ได้เรียก seed, migrate, Docker destructive command หรือแตะ secrets
- Working tree มีการแก้ไขของผู้ใช้อยู่ก่อนแล้วหลายไฟล์ โดยเฉพาะ companies และ supervision; ผล full test ที่ไม่เกี่ยวกับสิ่งข้างต้นต้องรายงานแยกจากงานรอบนี้
- ผลตรวจล่าสุด: lint, typecheck, Prisma schema validation และ Docker Compose config ผ่าน; targeted tests ของ flow ที่ย้ายผ่าน 70 tests. Full test เหลือ 5 failures จาก expectation ของ `company-api`, `staff-supervision-api`, `supervision-appointment-api`, `supervision-expense-api` และ `expenses.test` ที่ไม่ตรงกับพฤติกรรม companies/supervision/expense ซึ่งมีอยู่ใน working tree เดิม. Production build ผ่าน client/server แต่ Nitro final bundle ใช้เวลานานเกินเกณฑ์ของ environment นี้จึงหยุด process ที่ agent สร้าง
