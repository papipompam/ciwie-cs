# แผนการทดสอบระบบ CWIE BRU

## ขอบเขต
ตรวจ Source Code จริงของ Nuxt, Nitro API, Prisma Schema, Zod Schema, Middleware, Composable และ Automated Test โดยไม่แก้ Source Code ระบบใช้ Prisma ฝั่ง Server แต่บางหน้าจอยังใช้ข้อมูลจำลองหรือ Prototype State

## วัตถุประสงค์
ตรวจ Authentication, Session, Authorization/RBAC ของ Student/Lecturer/Staff, Business Rule, Placement, Supervision, Evaluation, Import/Export, Database, Security และ UI/UX

## Feature Inventory และ Coverage Matrix
| Feature | Role | Page | API | Database | Permission | Status |
|---|---|---|---|---|---|---|
| Authentication | ทุก Role | /login, /first-login, /account/password | /api/auth/* | User, Session | ตรวจ Role/Status/Version | ตรวจบางส่วน |
| Student Application | Student, Staff | /student/applications, /student/placements/* | /api/student/applications*, /api/placement-requests* | StudentApplication, PlacementRequest | Student เห็นของตนเอง; Staff ตรวจคำร้อง | พบ P0 |
| Company | Staff, Lecturer | /companies/* | /api/companies* | Company, CompanySite, Province | Staff/Lecturer | มี Requirement Gap |
| People/Import | Staff, Lecturer | /staff/[type]/*, /staff/people/import | /api/people*, /api/staff/people* | User, CycleEnrollment | Staff จัดการ; Lecturer จำกัด | ตรวจบางส่วน |
| Supervision | ทุก Role ตามสิทธิ์ | /staff/supervision, /lecturer/supervision, /student/supervision | /api/supervision/* | Groups, Appointments | เห็นเฉพาะงานเกี่ยวข้อง | ยังไม่พบ Conflict |
| Evaluation | Staff, Lecturer | /lecturer/evaluations/* | /api/evaluations/* | StudentEvaluation, CompanyEvaluation | ผู้ได้รับมอบหมาย; Staff อ่าน | Student Result Gap |
| Expenses | Staff | /staff/expenses | /api/staff/expenses* | SupervisionExpense | Staff เท่านั้น | Test ล้มเหลว |
| Notification | ทุก Role | /notifications | /api/notifications* | Notification, Recipient | เฉพาะผู้รับ | ตรวจบางส่วน |

พบ Page 34 ไฟล์, API Handler 47 ไฟล์, Prisma Model 24 รายการ และ Enum 24 รายการ

## เกณฑ์ผ่าน
P0/P1 ต้องเป็นศูนย์, API Permission Test ต้องผ่าน, Critical Rule ต้องมี Integration/Concurrency Evidence และ Test ที่ยัง Not Tested ต้องปิดครบ

## ลำดับการทดสอบ
1. Authentication 2. Role & Permission 3. Critical Business Rules 4. Student Application 5. Master Data 6. Supervision/Schedule 7. Evaluation 8. Import/Export 9. Database Integrity 10. Security 11. UI/UX 12. End-to-End
