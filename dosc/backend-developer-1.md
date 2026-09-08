# แผนพัฒนา Backend — ผู้พัฒนาคนที่ 1

## บทบาท: Backend Foundation, Identity และ Placement

ผู้พัฒนาคนที่ 1 รับผิดชอบโครงสร้างพื้นฐาน Backend ร่วมของระบบ และ Feature ตั้งแต่การจัดการบัญชีผู้ใช้จนถึงการยืนยันสถานประกอบการของนักศึกษาแบบ End-to-End

ขอบเขตนี้อ้างอิงจาก:

- [`requirement.md`](./requirement.md) ส่วน 1.3.1–1.3.5, 1.3.7–1.3.8, 1.3.11–1.3.12
- [`architecture.md`](./architecture.md) สำหรับ Nuxt/Nitro, Prisma และ MySQL
- [`database-design.md`](./database-design.md) และ [`../prisma/schema.prisma`](../prisma/schema.prisma)

ผู้พัฒนาคนที่ 1 ไม่ได้เป็นผู้ทำ Database ให้ทุก Feature แต่เป็นเจ้าของ infrastructure และ initial migration ส่วน query, service และ migration ของ Feature ฝั่ง Operations เป็นหน้าที่ของผู้พัฒนาคนที่ 2

---

## 1. เป้าหมายที่ต้องส่งมอบ

1. Backend มี Prisma, migration, seed, authentication, authorization และ validation ที่ Feature อื่นนำไปใช้ได้
2. เจ้าหน้าที่จัดการบัญชี นักศึกษา และอาจารย์ รวมถึง import/export ได้
3. นักศึกษาจัดการรายการสมัครส่วนตัวและยื่นคำร้องสถานประกอบการได้
4. อาจารย์ตรวจคำร้อง รวมคำร้องเป็นชุดหนังสือ และยืนยันผลรายบุคคลได้
5. เอกสาร PDF ถูกจัดเก็บและดาวน์โหลดผ่าน endpoint ที่ตรวจสิทธิ์
6. Mutation สำคัญถูกบันทึกลง Audit Log

---

## 2. พื้นที่โค้ดที่เป็นเจ้าของ

### 2.1 Shared Backend Infrastructure

เป็นเจ้าของหลักของไฟล์หรือโฟลเดอร์ต่อไปนี้:

```text
prisma/schema.prisma                 # merge gate และ schema baseline
prisma/migrations/**                 # initial migration
prisma/seed.ts                       # seed กลาง
server/core/prisma.ts
server/core/auth.ts
server/core/rbac.ts
server/core/validation.ts
server/core/api-error.ts
server/core/audit.ts
server/core/storage.ts
server/middleware/**                 # middleware ฝั่ง server
package.json                         # dependency ฝั่ง Backend
pnpm-lock.yaml
nuxt.config.ts
docker-compose.yml                   # migration/startup ที่เกี่ยวกับ Backend
```

หากผู้พัฒนาคนที่ 2 ต้องเพิ่ม dependency หรือแก้ shared configuration ให้แจ้งผู้พัฒนาคนที่ 1 เป็นผู้แก้ เพื่อลด merge conflict

### 2.2 Feature Modules

```text
server/features/auth/**
server/features/people/**
server/features/applications/**
server/features/placements/**
server/features/letters/**
server/features/documents/**
```

แต่ละ Feature ควรมีไฟล์เท่าที่จำเป็น:

```text
schema.ts       # Zod schema ของ Feature
repository.ts   # Prisma query
service.ts      # Business rules และ transaction
types.ts        # สร้างเมื่อมี type ที่ใช้มากกว่าหนึ่งไฟล์
*.test.ts       # Unit/integration tests ของ Feature
```

ไม่ต้องสร้าง repository interface หรือ dependency injection framework หากยังไม่มี implementation มากกว่าหนึ่งแบบ

### 2.3 API Route Namespace

```text
server/api/auth/**
server/api/users/**
server/api/people/**
server/api/applications/**
server/api/placements/**
server/api/letter-batches/**
server/api/documents/**
```

Route handler ต้องทำเพียงตรวจ request, เรียก service และแปลง response ไม่ใส่ business logic หรือ Prisma query โดยตรง

---

## 3. ตารางและ Model ที่รับผิดชอบ

ผู้พัฒนาคนที่ 1 เป็นเจ้าของ business rules และการเขียนข้อมูลของ Model ต่อไปนี้:

| Model | ความรับผิดชอบ |
|---|---|
| `User` | บัญชี, role, permission, profile นักศึกษา/อาจารย์, account status |
| `AuditLog` | ประวัติการทำรายการสำคัญของทุก Feature |
| `StudentApplication` | รายการสมัครสถานประกอบการส่วนตัวของนักศึกษา |
| `PlacementRequest` | คำร้องสถานประกอบการและสถานะปัจจุบัน |
| `PlacementRequestStatusHistory` | Timeline การเปลี่ยนสถานะคำร้อง |
| `LetterBatch` | ชุดหนังสือขอความอนุเคราะห์ |
| `LetterBatchMember` | คำร้องที่อยู่ในแต่ละชุดหนังสือ |
| `LetterDocumentVersion` | รุ่นของเอกสารและข้อมูลไฟล์ PDF |

กติกาข้าม Model:

- สามารถอ่าน `CoopCycle`, `CycleEnrollment`, `Company` และ `CompanySite` ด้วย Prisma `select` แบบจำกัด field ได้
- ห้ามแก้ข้อมูล Model เหล่านั้นโดยตรง ต้องเรียก service ของผู้พัฒนาคนที่ 2
- การสร้าง Notification ต้องเรียก notification service ของผู้พัฒนาคนที่ 2

---

## 4. แผนงานตามลำดับ

### ระยะ A — Backend Baseline ต้องทำก่อน

- [ ] ตรวจว่า schema ปัจจุบันตรงกับ requirement และ freeze schema baseline
- [ ] สร้าง initial migration สำหรับ MySQL 8.4
- [ ] สร้าง seed จังหวัด ข้อมูลรอบตัวอย่าง และบัญชีเจ้าหน้าที่เริ่มต้น
- [ ] สร้าง Prisma client singleton
- [ ] เพิ่มคำสั่ง `db:migrate`, `db:seed`, `db:reset` สำหรับ development และ `db:migrate:deploy` สำหรับ Docker
- [ ] กำหนดรูปแบบ response และ error กลาง
- [ ] สร้าง Zod request-validation helper
- [ ] สร้าง test database bootstrap
- [ ] ส่ง baseline ให้ผู้พัฒนาคนที่ 2 ก่อนเริ่ม integration test

ผลลัพธ์ตรวจรับ:

- Container ใหม่สามารถสร้าง schema ด้วย migration ได้โดยไม่ใช้ `db push`
- Seed รันซ้ำแล้วไม่สร้างข้อมูลซ้ำ
- Prisma เชื่อมต่อฐานข้อมูล `ciwie_db` ใน Docker ได้

### ระยะ B — Authentication, Session และ RBAC

- [ ] Login ด้วย username/password
- [ ] Logout และอ่าน current session
- [ ] บังคับเปลี่ยนรหัสผ่านในการเข้าใช้ครั้งแรก
- [ ] เปลี่ยนรหัสผ่านด้วยรหัสเดิม
- [ ] เจ้าหน้าที่รีเซ็ตรหัสผ่านให้ผู้ใช้
- [ ] ตรวจ `AccountStatus` ก่อนสร้าง session
- [ ] ป้องกัน brute-force ตามจำนวนครั้งและเวลาที่ตกลงร่วมกัน
- [ ] ใช้ `sessionVersion` เพื่อยกเลิก session เดิมหลัง reset password หรือระงับบัญชี
- [ ] สร้าง middleware สำหรับ `ADMIN`, `LECTURER`, `STUDENT`
- [ ] รองรับ permission `canReviewPlacements`
- [ ] บันทึก login failure, password reset และการเปลี่ยนสถานะบัญชีลง Audit

Endpoint ขั้นต่ำ:

```text
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
POST /api/auth/first-password
POST /api/auth/change-password
POST /api/users/:id/reset-password
PATCH /api/users/:id/status
```

### ระยะ C — People Master Data และ Import/Export

- [ ] CRUD นักศึกษา
- [ ] CRUD อาจารย์
- [ ] ค้นหา กรอง role/status และแบ่งหน้า
- [ ] ตรวจ username, student code และ lecturer code ซ้ำ
- [ ] Import CSV/XLSX แบบ preview → validate → commit
- [ ] รายงานข้อผิดพลาดเป็นรายแถวโดยไม่บันทึกข้อมูลบางส่วน
- [ ] Export ตาม filter ปัจจุบัน
- [ ] ยุติการใช้งานด้วย status แทนการลบข้อมูลที่มีประวัติ
- [ ] ใช้ transaction เมื่อ import หลายรายการ

Endpoint ขั้นต่ำ:

```text
GET/POST      /api/people
GET/PATCH     /api/people/:id
POST          /api/people/import/preview
POST          /api/people/import/commit
GET           /api/people/export
```

### ระยะ D — Student Applications

- [ ] นักศึกษาดูรายการของตนเอง
- [ ] สร้าง แก้ไข และลบรายการของตนเอง
- [ ] จำกัดไม่เกิน 3 รายการต่อนักศึกษา
- [ ] เจ้าหน้าที่และอาจารย์ดูแบบ read-only ตาม filter
- [ ] ตรวจ ownership ทุก mutation ที่ Backend

Endpoint ขั้นต่ำ:

```text
GET/POST      /api/applications
GET/PATCH/DELETE /api/applications/:id
```

### ระยะ E — Placement Request Workflow

- [ ] ตกลง state machine กับผู้พัฒนาคนที่ 2 ก่อนเขียน service
- [ ] นักศึกษาสร้าง แก้ไข และส่งคำร้อง
- [ ] ป้องกันคำร้อง active ซ้ำในรอบเดียวกัน
- [ ] อาจารย์ที่มีสิทธิ์ตรวจ ยืนยัน หรือส่งกลับแก้ไข
- [ ] บันทึกทุกการเปลี่ยนสถานะลง history ใน transaction เดียวกัน
- [ ] นักศึกษาดู timeline ของคำร้องตนเอง
- [ ] ตรวจ optimistic/concurrent update ด้วย status เดิมหรือ transaction
- [ ] เมื่อยืนยันผลสุดท้าย ต้องมีข้อมูลที่ Supervision ฝั่งคนที่ 2 อ่านต่อได้

Endpoint ขั้นต่ำ:

```text
GET/POST      /api/placements
GET/PATCH     /api/placements/:id
POST          /api/placements/:id/submit
POST          /api/placements/:id/review
POST          /api/placements/:id/return
GET           /api/placements/:id/timeline
```

### ระยะ F — Letter Batch และเอกสาร

- [ ] ตรวจ compatibility ก่อนรวมคำร้อง
- [ ] สร้างชุดหนังสือและสมาชิกใน transaction
- [ ] สร้างหรือบันทึกเลขที่หนังสือ
- [ ] Publish ชุดหนังสือ
- [ ] Upload หนังสือขอความอนุเคราะห์และหนังสือตอบกลับ
- [ ] บันทึก document version, checksum และผลตรวจไฟล์
- [ ] ตรวจ extension, MIME type, magic bytes และขนาดไฟล์
- [ ] ดาวน์โหลดไฟล์ผ่าน authenticated endpoint
- [ ] ป้องกัน path traversal และไม่เปิดเอกสารเป็น public static file
- [ ] ยืนยันหรือปฏิเสธผลรายบุคคล
- [ ] เรียก notification service เมื่อเกิดเหตุการณ์ที่ต้องแจ้งผู้ใช้

Endpoint ขั้นต่ำ:

```text
GET/POST      /api/letter-batches
GET           /api/letter-batches/:id
POST          /api/letter-batches/:id/publish
POST          /api/letter-batches/:id/documents
POST          /api/letter-batches/:id/members/:memberId/confirm
POST          /api/letter-batches/:id/members/:memberId/reject
GET           /api/documents/:id/download
```

---

## 5. Shared Contract ที่ต้องส่งให้ผู้พัฒนาคนที่ 2 ก่อน

### 5.1 Auth Context

```ts
type AuthContext = {
  userId: number
  role: 'ADMIN' | 'LECTURER' | 'STUDENT'
  sessionVersion: number
  canReviewPlacements: boolean
}
```

ผู้พัฒนาคนที่ 2ใช้เฉพาะ public helper เช่น `requireUser`, `requireRole` และ `requirePermission` ไม่เข้าถึง session cookie โดยตรง

### 5.2 Audit Service

ต้องมี public function ที่ Feature อื่นเรียกได้ โดยไม่ต้องเขียน `AuditLog` เอง เช่น:

```ts
recordAudit({
  actorUserId,
  action,
  entityType,
  entityId,
  before,
  after,
})
```

### 5.3 Confirmed Placement Read Contract

ฝั่ง Supervision ต้องอ่านอย่างน้อย:

```text
placementRequestId
cycleId
studentUserId
companyId
companySiteId
confirmedAt
```

ผู้พัฒนาคนที่ 2อ่าน field เหล่านี้แบบ read-only ได้ แต่ห้ามเปลี่ยนสถานะ Placement

---

## 6. งานที่ไม่อยู่ในความรับผิดชอบ

- Company/Province/CompanySite CRUD
- Coop Cycle และ Cycle Enrollment mutation
- Supervision Group และ Appointment
- ผลการนิเทศและการประเมิน
- Notification recipient/read state
- Calendar และ Dashboard aggregate
- การแก้ UI หรือแทน mock composable เว้นแต่มีงานแยกอนุมัติ

หากพบ business rule ของส่วนเหล่านี้ ให้เปิด issue หรือแจ้งผู้พัฒนาคนที่ 2 ไม่ควรแก้ข้าม Feature โดยตรง

---

## 7. การทดสอบที่ต้องมี

### Unit tests

- State transition ที่อนุญาตและไม่อนุญาต
- Permission matrix ของแต่ละ role
- File validation
- Import validation รายแถว
- Letter-batch compatibility

### Integration tests

- Login → session → protected endpoint → logout
- Reset password แล้ว session เดิมใช้ไม่ได้
- Import สำเร็จทั้งหมดหรือ rollback ทั้งหมด
- นักศึกษาแก้คำร้องของคนอื่นไม่ได้
- อาจารย์ไม่มี permission ตรวจคำร้องไม่ได้
- ส่งคำร้องพร้อมกันแล้วไม่เกิด active request ซ้ำ
- สร้าง Letter Batch ล้มเหลวแล้วไม่เหลือ member บางส่วน
- ดาวน์โหลดเอกสารโดยผู้ไม่มีสิทธิ์ไม่ได้

### คำสั่งตรวจรับ

ก่อนส่ง PR ต้องรันคำสั่งที่มีในโครงการอย่างน้อย:

```text
pnpm prisma validate
pnpm typecheck
pnpm lint
pnpm test
pnpm build
docker compose config
```

หากคำสั่งใดยังไม่มี ให้เพิ่ม script ที่จำเป็นในงาน Backend Baseline และบันทึกไว้ใน PR

---

## 8. Definition of Done

งานแต่ละ Feature ถือว่าเสร็จเมื่อ:

- [ ] Route ตรวจ authentication และ authorization ครบ
- [ ] Request ถูก validate ด้วย Zod
- [ ] Business rule อยู่ใน service ไม่อยู่ใน route
- [ ] Prisma query ใช้ `select` หรือ bounded `include`
- [ ] Mutation หลายตารางอยู่ใน transaction
- [ ] Error ไม่เปิดเผย stack trace หรือข้อมูลลับ
- [ ] Audit/Notification ถูกเรียกตามเหตุการณ์ที่กำหนด
- [ ] มี unit หรือ integration test สำหรับ happy path และ forbidden/error path
- [ ] Migration และ seed รันได้บน Docker จากฐานข้อมูลว่าง
- [ ] Typecheck, lint, test และ build ผ่าน
- [ ] API contract ที่ผู้พัฒนาคนที่ 2ใช้งานไม่เปลี่ยนโดยไม่แจ้งล่วงหน้า

---

## 9. กติกาการทำงานร่วมกัน

1. ผู้พัฒนาคนที่ 1สร้าง baseline migration ก่อน จากนั้น freeze schema ปัจจุบัน
2. ไม่ให้ทั้งสองคนสร้าง migration พร้อมกัน หากจำเป็นต้องแก้ schema ให้จอง migration window ก่อน
3. เจ้าของ Feature เป็นผู้แก้ Zod schema, service, repository, route และ tests ของ Feature นั้นครบวงจร
4. อ่าน Model ต่าง Feature ได้แบบจำกัด field แต่การเขียนต้องผ่าน service ของเจ้าของ Feature
5. ผู้พัฒนาคนที่ 1เป็นผู้รวมการเปลี่ยน `schema.prisma`, lockfile, Nuxt config และ Docker config
6. Branch แนะนำ: `codex/backend-identity-placement` หรือชื่อทีมในรูปแบบเดียวกัน
7. PR ควรแยกตามระยะ A–F ไม่รวม Backend ทั้งหมดเป็น PR เดียว

ลำดับสำคัญที่สุดคือ Baseline → Auth/RBAC → People/Application → Placement → Letter/Document หากงาน Baseline หรือ Shared Contract ยังไม่ผ่าน ห้ามประกาศว่า Feature ที่พึ่งพาส่วนนั้นเสร็จสมบูรณ์
