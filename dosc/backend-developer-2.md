# แผนพัฒนา Backend — ผู้พัฒนาคนที่ 2

## บทบาท: Company, Co-op Operations, Supervision และ Evaluation

ผู้พัฒนาคนที่ 2 รับผิดชอบ Feature ตั้งแต่ข้อมูลสถานประกอบการและรอบสหกิจ ไปจนถึงการจัดกลุ่ม ตารางนิเทศ การบันทึกผล การประเมิน การแจ้งเตือน ปฏิทิน และ Dashboard แบบ End-to-End

ขอบเขตนี้อ้างอิงจาก:

- [`requirement.md`](./requirement.md) ส่วน 1.3.4, 1.3.6, 1.3.9–1.3.11 และ 1.3.13
- [`architecture.md`](./architecture.md) สำหรับ Nuxt/Nitro, Prisma และ MySQL
- [`database-design.md`](./database-design.md) และ [`../prisma/schema.prisma`](../prisma/schema.prisma)
- [`backend-developer-1.md`](./backend-developer-1.md) สำหรับ Auth, Audit และ shared infrastructure contract

ผู้พัฒนาคนที่ 2 ต้องทำ API, validation, business service, Prisma query และ tests ของ Feature ตัวเองครบวงจร ไม่รอให้ผู้พัฒนาคนที่ 1ทำ Database หรือ repository ให้

---

## 1. เป้าหมายที่ต้องส่งมอบ

1. เจ้าหน้าที่จัดการสถานประกอบการ รอบสหกิจ และการลงทะเบียนนักศึกษาในรอบได้
2. เจ้าหน้าที่จัดกลุ่มนิเทศและติดตามสถานะได้ตามขอบเขต read/write ที่ Requirement กำหนด
3. อาจารย์เข้าร่วมตารางนิเทศ บันทึกผล และประเมินได้ตามสิทธิ์
4. นักศึกษาเห็นเฉพาะตารางนิเทศของตนเอง
5. ระบบมี Notification, Calendar และ Dashboard ที่อ่านข้อมูลจริงตาม role และรอบสหกิจ
6. ทุก mutation ใช้ Auth, RBAC และ Audit contract จากผู้พัฒนาคนที่ 1

---

## 2. พื้นที่โค้ดที่เป็นเจ้าของ

### 2.1 Feature Modules

```text
server/features/companies/**
server/features/cycles/**
server/features/supervision/**
server/features/evaluations/**
server/features/notifications/**
server/features/calendar/**
server/features/dashboard/**
```

แต่ละ Feature ควรมีไฟล์เท่าที่จำเป็น:

```text
schema.ts       # Zod schema ของ Feature
repository.ts   # Prisma query
service.ts      # Business rules และ transaction
types.ts        # สร้างเมื่อมี type ที่ใช้มากกว่าหนึ่งไฟล์
*.test.ts       # Unit/integration tests ของ Feature
```

ไม่สร้าง generic event bus, repository interface หรือ abstraction ที่ยังไม่มีการใช้งานจริง ระบบนี้เป็น modular monolith สำหรับใช้ภายในสาขา

### 2.2 API Route Namespace

```text
server/api/companies/**
server/api/provinces/**
server/api/cycles/**
server/api/supervision/**
server/api/evaluations/**
server/api/notifications/**
server/api/calendar/**
server/api/dashboard/**
```

Route handler ต้องทำเพียงตรวจ request, เรียก service และแปลง response ไม่ใส่ business logic หรือ Prisma query โดยตรง

### 2.3 Shared Service ที่เป็นเจ้าของ

ผู้พัฒนาคนที่ 2เป็นเจ้าของ Notification service กลาง:

```text
server/features/notifications/service.ts
server/features/notifications/repository.ts
```

Feature ของผู้พัฒนาคนที่ 1เรียก public function ของ service นี้ได้ แต่ไม่แก้ implementation หรือเขียน `Notification`/`NotificationRecipient` โดยตรง

---

## 3. ตารางและ Model ที่รับผิดชอบ

| Model | ความรับผิดชอบ |
|---|---|
| `Province` | จังหวัดสำหรับสถานประกอบการ |
| `Company` | ข้อมูลและสถานะสถานประกอบการ |
| `CompanySite` | สถานที่ปฏิบัติงานหรือสาขาของบริษัท |
| `CoopCycle` | รอบสหกิจและสถานะปัจจุบัน |
| `CoopCycleStatusHistory` | ประวัติการเปลี่ยนสถานะรอบ |
| `CycleEnrollment` | นักศึกษาในรอบและสถานะการปฏิบัติงาน |
| `SupervisionGroup` | กลุ่มนิเทศในแต่ละรอบ |
| `SupervisionGroupLecturer` | อาจารย์ผู้รับผิดชอบกลุ่ม |
| `SupervisionGroupCompany` | บริษัทที่อยู่ในกลุ่ม |
| `SupervisionAppointment` | ตารางนิเทศแต่ละครั้ง |
| `SupervisionAppointmentLecturer` | อาจารย์ที่วางแผน/เข้าร่วมจริง |
| `SupervisionAppointmentStudent` | นักศึกษาที่อยู่ในนัดนิเทศ |
| `StudentEvaluation` | ผลประเมินนักศึกษารายบุคคล |
| `CompanyEvaluation` | ผลประเมินสถานประกอบการ |
| `Notification` | เหตุการณ์แจ้งเตือน |
| `NotificationRecipient` | ผู้รับและสถานะอ่านแล้ว |
| `CalendarEvent` | ปฏิทินตามบทบาทและรอบสหกิจ |

กติกาข้าม Model:

- สามารถอ่าน `User` และ Placement ที่ยืนยันแล้วด้วย Prisma `select` แบบจำกัด field ได้
- ห้ามแก้ `User`, Placement, Letter Batch หรือ Document โดยตรง
- ทุก mutation สำคัญต้องเรียก Audit service ของผู้พัฒนาคนที่ 1
- การตรวจสิทธิ์ต้องใช้ Auth/RBAC helper กลาง ห้ามอ่าน cookie หรือสร้าง role check ชุดใหม่เอง

จำนวน Model มากกว่าฝั่งผู้พัฒนาคนที่ 1 แต่หลาย Model เป็นตารางเชื่อม ความซับซ้อนรวมจึงใกล้เคียงกับฝั่ง Authentication, Placement และ File handling

---

## 4. แผนงานตามลำดับ

### ระยะ A — เตรียม Contract ระหว่างรอ Backend Baseline

ระหว่างที่ผู้พัฒนาคนที่ 1สร้าง initial migration สามารถทำงานเหล่านี้ได้โดยไม่แก้ shared files:

- [ ] อ่าน requirement และกำหนด Zod schema ของ Company, Cycle และ Supervision
- [ ] กำหนด supervision status transition
- [ ] กำหนด evaluation rules และ score range
- [ ] กำหนด notification event type ที่ใช้งานจริง
- [ ] เขียน unit tests ของ business rules ที่ไม่ต้องเชื่อมฐานข้อมูล
- [ ] ตกลง Confirmed Placement read contract กับผู้พัฒนาคนที่ 1

เมื่อ baseline พร้อม ให้ generate Prisma client จาก schema เดียวกันและเริ่ม repository/integration tests

### ระยะ B — Company Master Data

- [ ] API จังหวัดสำหรับ search/select
- [ ] CRUD สถานประกอบการ
- [ ] CRUD สถานที่ปฏิบัติงานของบริษัท
- [ ] ค้นหา กรองสถานะ จังหวัด และภูมิภาค
- [ ] ป้องกันการลบบริษัทหรือ site ที่มีคำร้อง/การนิเทศอ้างอิง
- [ ] ใช้สถานะ inactive แทนการลบเมื่อมีประวัติ
- [ ] รองรับการอ่านบริษัทจากทุก role ตามสิทธิ์

Endpoint ขั้นต่ำ:

```text
GET             /api/provinces
GET/POST        /api/companies
GET/PATCH       /api/companies/:id
POST            /api/companies/:id/sites
PATCH           /api/companies/:id/sites/:siteId
```

การอนุมัติหรือ merge บริษัทที่นักศึกษาเสนอใหม่ยังไม่อยู่ใน UI Prototype หาก Requirement เพิ่มภายหลัง Feature นี้เป็นเจ้าของงาน

### ระยะ C — Co-op Cycle และ Enrollment

- [ ] CRUD รอบสหกิจตามสิทธิ์เจ้าหน้าที่
- [ ] State transition ของรอบและ status history
- [ ] เลือก current cycle ตาม role/user context
- [ ] เพิ่มนักศึกษาเข้ารอบ
- [ ] เปลี่ยน enrollment status และ student work status
- [ ] การย้ายรอบใช้วิธีปิด enrollment เดิมและสร้าง enrollment ใหม่
- [ ] ไม่เพิ่ม transfer-history workflow ที่ Requirement ยังไม่รองรับ
- [ ] บันทึก Audit สำหรับการเปลี่ยนรอบและสถานะ

Endpoint ขั้นต่ำ:

```text
GET/POST        /api/cycles
GET/PATCH       /api/cycles/:id
POST            /api/cycles/:id/status
GET             /api/cycles/:id/status-history
GET/POST        /api/cycles/:id/enrollments
PATCH           /api/cycles/:id/enrollments/:enrollmentId
GET             /api/cycles/current
```

### ระยะ D — Supervision Group

- [ ] เจ้าหน้าที่สร้างและแก้ไขกลุ่มนิเทศ
- [ ] กำหนดอาจารย์ประจำกลุ่ม
- [ ] กำหนดบริษัทในกลุ่ม
- [ ] ตรวจบริษัทซ้ำในกลุ่มหรือรอบตาม unique constraint
- [ ] ตรวจว่าอาจารย์และบริษัทอยู่ในรอบเดียวกันกับข้อมูลที่เกี่ยวข้อง
- [ ] เจ้าหน้าที่ดูภาพรวมและรายละเอียดกลุ่ม
- [ ] ใช้ transaction เมื่อแก้สมาชิกกลุ่มหลายรายการ

Endpoint ขั้นต่ำ:

```text
GET/POST        /api/supervision/groups
GET/PATCH       /api/supervision/groups/:id
PUT             /api/supervision/groups/:id/lecturers
PUT             /api/supervision/groups/:id/companies
```

### ระยะ E — Supervision Appointment และผลนิเทศ

- [ ] แสดงตารางตาม role และ ownership
- [ ] แยกครั้งที่ 1 และครั้งที่ 2
- [ ] อาจารย์เข้าร่วมหรือถอนตัวตามช่วงเวลาที่อนุญาต
- [ ] ป้องกันอาจารย์เข้าร่วมตารางที่เวลาชนกัน
- [ ] บันทึกผู้เข้าร่วมจริง
- [ ] เปลี่ยนสถานะจัดตารางแล้ว, เสร็จแล้ว, เลื่อน หรือยกเลิก
- [ ] บันทึกผลและข้อเสนอแนะ
- [ ] ปิดผลและล็อกข้อมูลเมื่อเสร็จสิ้นตามกติกา
- [ ] นักศึกษาเห็นเฉพาะตารางของตนเอง
- [ ] เจ้าหน้าที่ดูตารางและสถานะตามขอบเขต read-only ใน Requirement
- [ ] อ่านเฉพาะ Placement ที่ยืนยันแล้วจาก Contract ของผู้พัฒนาคนที่ 1

Endpoint ขั้นต่ำ:

```text
GET             /api/supervision/appointments
GET             /api/supervision/appointments/:id
POST            /api/supervision/appointments/:id/join
POST            /api/supervision/appointments/:id/leave
PATCH           /api/supervision/appointments/:id/status
PUT             /api/supervision/appointments/:id/actual-participants
PUT             /api/supervision/appointments/:id/result
```

การสร้างและ publish Appointment ยังไม่ยืนยันใน UI Prototype หากอนุมัติ scope ภายหลัง Feature นี้เป็นเจ้าของงาน

### ระยะ F — Evaluation

- [ ] แบบประเมินนักศึกษา 10 ข้อ คะแนน 0–5
- [ ] แบบประเมินสถานประกอบการ 8 ข้อ คะแนน 0–5
- [ ] รองรับ draft และ submitted
- [ ] ประเมินได้หลัง Appointment เสร็จแล้วเท่านั้น
- [ ] อาจารย์ประเมินเฉพาะนัดที่ตนเข้าร่วมจริง
- [ ] ป้องกันการแก้ submitted evaluation หากไม่มี flow เปิดใหม่
- [ ] หนึ่ง Company Evaluation ต่อ Appointment
- [ ] เลือกผู้ประเมินบริษัทตามกติกาอาจารย์ผู้เข้าร่วมจริง
- [ ] คำนวณสถานะความครบถ้วนของการประเมิน
- [ ] ไม่เปิดคะแนนหรือข้อเสนอแนะภายในให้นักศึกษา

Endpoint ขั้นต่ำ:

```text
GET/PUT         /api/evaluations/students/:appointmentStudentId
POST            /api/evaluations/students/:appointmentStudentId/submit
GET/PUT         /api/evaluations/companies/:appointmentId
POST            /api/evaluations/companies/:appointmentId/submit
GET             /api/evaluations/completeness
```

### ระยะ G — Notification, Calendar และ Dashboard

- [ ] สร้าง Notification และ recipients ใน transaction
- [ ] ผู้ใช้เห็นเฉพาะ Notification ของตนเอง
- [ ] Mark read และ mark all read
- [ ] สร้าง public service ให้ Placement/Letter เรียกใช้
- [ ] Calendar filter ตาม role, cycle และช่วงวันที่
- [ ] Dashboard aggregate แยก Admin/Lecturer/Student
- [ ] ทุก aggregate ต้องใช้ query แบบรวมผล ไม่โหลดรายการทั้งหมดมานับใน application
- [ ] ใช้ current cycle เดียวกับ API ของ Cycle

Endpoint ขั้นต่ำ:

```text
GET             /api/notifications
POST            /api/notifications/:id/read
POST            /api/notifications/read-all
GET             /api/calendar
GET             /api/dashboard
```

---

## 5. Shared Contract ที่ต้องเปิดให้ผู้พัฒนาคนที่ 1

### 5.1 Notification Service

เปิด public function ที่รับข้อมูลระดับ domain โดยไม่ให้ caller เขียนตาราง recipients เอง เช่น:

```ts
createNotification({
  type,
  severity,
  title,
  message,
  recipientUserIds,
  entityType,
  entityId,
})
```

Service ต้องจัดการ deduplication ที่จำเป็นและสร้าง recipients ใน transaction เดียวกัน

### 5.2 Cycle Read Contract

Placement/Application ต้องอ่านข้อมูลอย่างน้อย:

```text
cycleId
academicYear
term
status
enrollmentId
studentWorkStatus
```

ผู้พัฒนาคนที่ 1อ่าน field เหล่านี้แบบ read-only ได้ แต่ห้ามเปลี่ยนสถานะรอบหรือ enrollment โดยตรง

### 5.3 Company Read Contract

Placement ต้องอ่านข้อมูลอย่างน้อย:

```text
companyId
companyName
companyStatus
companySiteId
siteName
provinceId
```

การเพิ่ม แก้ไข ปิดใช้งาน หรือ merge บริษัทเป็นหน้าที่ของ Feature `companies`

---

## 6. งานที่ไม่อยู่ในความรับผิดชอบ

- Authentication, session และ password
- User/People CRUD และ import/export
- Student Applications
- Placement Request state machine
- Letter Batch และ document version
- File upload/download storage implementation
- Prisma shared client, initial migration และ seed กลาง
- Shared API error/response implementation
- การแก้ UI หรือแทน mock composable เว้นแต่มีงานแยกอนุมัติ

หากพบ business rule ของส่วนเหล่านี้ ให้แจ้งผู้พัฒนาคนที่ 1 ไม่ควรแก้ข้าม Feature โดยตรง

---

## 7. การทดสอบที่ต้องมี

### Unit tests

- Cycle status transition
- Supervision appointment status transition
- Evaluation score validation และ completeness
- Notification recipient deduplication
- Permission matrix ของ Staff/Lecturer/Student

### Integration tests

- บริษัทที่มีข้อมูลอ้างอิงถูกลบจริงไม่ได้
- ย้ายรอบแล้ว enrollment เดิมปิดและ enrollment ใหม่ถูกสร้างครบใน transaction
- เพิ่มบริษัทซ้ำในกลุ่มไม่ได้
- อาจารย์เข้าร่วม Appointment เวลาชนกันไม่ได้
- อาจารย์ที่ไม่ได้เข้าร่วมจริงประเมินไม่ได้
- บันทึก completion แล้ว actual participants/result อยู่ครบหรือ rollback ทั้งหมด
- นักศึกษาดู Appointment ของคนอื่นไม่ได้
- นักศึกษาอ่านคะแนนประเมินภายในไม่ได้
- ผู้ใช้ mark read Notification ของคนอื่นไม่ได้
- Dashboard และ Calendar เปลี่ยนตาม role/current cycle อย่างถูกต้อง

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

หากพบว่าคำสั่งหรือ infrastructure ยังไม่พร้อม ให้แจ้งผู้พัฒนาคนที่ 1 ไม่แก้ shared configuration พร้อมกัน

---

## 8. Definition of Done

งานแต่ละ Feature ถือว่าเสร็จเมื่อ:

- [ ] Route ตรวจ authentication และ authorization ด้วย helper กลาง
- [ ] Request ถูก validate ด้วย Zod ของ Feature
- [ ] Business rule อยู่ใน service ไม่อยู่ใน route
- [ ] Prisma query ใช้ `select` หรือ bounded `include`
- [ ] Mutation หลายตารางอยู่ใน transaction
- [ ] ไม่มีการเขียน Model ของ Feature คนที่ 1โดยตรง
- [ ] Audit ถูกเรียกสำหรับ mutation สำคัญ
- [ ] Notification ถูกสร้างตามเหตุการณ์ที่ Requirement กำหนด
- [ ] มี unit หรือ integration test สำหรับ happy path และ forbidden/error path
- [ ] Dashboard ใช้ aggregate query ที่เหมาะสม
- [ ] Typecheck, lint, test และ build ผ่าน
- [ ] Public contract ที่ผู้พัฒนาคนที่ 1ใช้งานไม่เปลี่ยนโดยไม่แจ้งล่วงหน้า

---

## 9. กติกาการทำงานร่วมกัน

1. เริ่มจาก Zod schema และ unit tests ได้ทันที แต่รอ initial migration จากผู้พัฒนาคนที่ 1ก่อนเริ่ม DB integration
2. ไม่สร้าง migration พร้อมกับผู้พัฒนาคนที่ 1 หากต้องแก้ schema ให้จอง migration window และแจ้ง Model/constraint ที่เปลี่ยน
3. ผู้พัฒนาคนที่ 2เป็นเจ้าของ route, schema, service, repository และ tests ภายใต้ Feature ของตนทั้งหมด
4. อ่าน Model ต่าง Feature ได้แบบจำกัด field แต่การเขียนต้องผ่าน service ของเจ้าของ Feature
5. ห้ามแก้ `package.json`, lockfile, Nuxt config หรือ Docker config พร้อมกัน ให้ส่งรายการเปลี่ยนแก่ผู้พัฒนาคนที่ 1
6. Branch แนะนำ: `codex/backend-coop-operations` หรือชื่อทีมในรูปแบบเดียวกัน
7. PR ควรแยกตามระยะ B–G ไม่รวม Operations ทั้งหมดเป็น PR เดียว

ลำดับสำคัญที่สุดคือ Company/Cycle → Supervision Group → Appointment/Result → Evaluation → Notification/Calendar/Dashboard ส่วน Notification service contract ควรกำหนดตั้งแต่ต้นเพื่อให้ Placement ฝั่งผู้พัฒนาคนที่ 1เชื่อมต่อได้โดยไม่ต้องแก้โมดูลเดียวกัน
