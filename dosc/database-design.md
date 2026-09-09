# การออกแบบฐานข้อมูล CWIE BRU ฉบับเรียบง่าย

เอกสารนี้อธิบาย schema เป้าหมายใน [`prisma/schema.prisma`](../prisma/schema.prisma)
หลังปรับตาม [`requirement.md`](./requirement.md) ฉบับวันที่ 1 กันยายน 2569
ระบบใช้ภายในสาขา จึงเลือกโครงสร้างที่ตรงกับ flow ปัจจุบัน ดูแลง่าย และไม่สร้าง
ตารางสำหรับความสามารถที่ยังอยู่นอกขอบเขต

## 1. หลักการออกแบบ

- ใช้ MySQL 8.4 LTS และ Prisma ORM
- ใช้ `User` ตารางเดียว เพราะหนึ่งบัญชีมีหนึ่งบทบาท
- เก็บความสัมพันธ์ many-to-many ใน junction table เพื่อรักษา Foreign Key และ uniqueness
- เก็บ timeline คำร้องและรอบที่ผู้ใช้ต้องเปิดดูเป็น typed history table
- ใช้ `AuditLog` กลางสำหรับ login, logout, การแก้ master data และ mutation สำคัญ
- ใช้ encrypted session cookie และ `User.sessionVersion` แทน session table
- เก็บค่าใช้จ่ายตามสายการนิเทศหนึ่งรายการต่อกลุ่ม โดย snapshot จำนวนอาจารย์และการแยกห้องพักตามเพศ
- แบบประเมินมีหัวข้อคงที่ จึงเก็บคะแนนเป็น column ใน evaluation โดยตรง
- PDF binary อยู่นอก MySQL; ฐานข้อมูลเก็บเฉพาะ metadata และ storage key

Schema ปัจจุบันมี **24 ตาราง และ 24 enum** (ไม่รวม `_prisma_migrations`)

## 2. ตารางทั้งหมด

### 2.1 ผู้ใช้และ Audit — 2 ตาราง

| ตาราง | หน้าที่ |
|---|---|
| `User` | ข้อมูลบัญชี บุคคล บทบาท สถานะ lockout และ `sessionVersion` |
| `AuditLog` | เหตุการณ์บัญชี การนำเข้า/ส่งออก การแก้ข้อมูล และ mutation สำคัญ |

`username` ใช้เป็นรหัสนักศึกษา รหัสอาจารย์ หรือชื่อผู้ใช้เจ้าหน้าที่ตามบทบาท
`cohortYear` และ `section` ใช้เฉพาะนักศึกษา กฎตามบทบาทต้องตรวจด้วย Zod/service และ integration test

การออกจากระบบปัจจุบันทำโดยลบ cookie ส่วนการรีเซ็ตรหัสผ่าน ระงับ หรือยุติบัญชี
ให้เพิ่ม `sessionVersion` เพื่อทำให้ cookie เดิมทั้งหมดใช้ต่อไม่ได้

### 2.2 รอบสหกิจ — 3 ตาราง

| ตาราง | หน้าที่ |
|---|---|
| `CoopCycle` | ปี ภาคเรียน รุ่น ช่วงยื่น ช่วงฝึก และสถานะรอบ |
| `CoopCycleStatusHistory` | Timeline สถานะรอบพร้อมผู้เปลี่ยนและเหตุผล |
| `CycleEnrollment` | นักศึกษาในแต่ละรอบ snapshot รุ่น/หมู่ และสถานะการปฏิบัติงาน |

การแก้รอบของนักศึกษาใช้ transaction ปิด enrollment เดิมและสร้าง enrollment ใหม่
โดยเก็บรายละเอียดใน `AuditLog` ไม่ใช้ตาราง transfer แยก

### 2.3 สถานประกอบการ — 3 ตาราง

| ตาราง | หน้าที่ |
|---|---|
| `Province` | จังหวัดและภูมิภาคซึ่งเป็น source of truth ของพื้นที่ |
| `Company` | ข้อมูลระดับนิติบุคคลและสถานะรอตรวจ/ใช้งาน/ยุติ |
| `CompanySite` | สาขา ที่อยู่ จังหวัด และผู้ติดต่อ |

ยังแยก Company กับ CompanySite เพื่อไม่ให้ชื่อและเลขภาษีซ้ำเมื่อบริษัทหนึ่งแห่งมีหลายสาขา
คำร้องและการนิเทศอ้าง `CompanySite`

### 2.4 รายการสมัครส่วนตัว — 1 ตาราง

`StudentApplication` เป็น tracker ที่นักศึกษาจัดการเองหลายรายการ ไม่ใช่คำร้องทางการ
และไม่เปลี่ยนสถานที่ฝึกหรือสถานะการปฏิบัติงาน

### 2.5 คำร้อง หนังสือ และเอกสาร — 3 ตาราง

| ตาราง | หน้าที่ |
|---|---|
| `PlacementRequest` | คำร้องทางการ สถานะ ผลตอบรับ และสถานที่ฝึกที่ยืนยันแล้ว |
| `PlacementRequestStatusHistory` | Timeline คำร้องสำหรับนักศึกษาและอาจารย์ |
| `LetterDocumentVersion` | PDF แต่ละประเภทและ version พร้อม metadata/validation |

`PlacementRequest` เป็น source of truth ของข้อมูลออกหนังสือ ผลรายบุคคล และสถานที่ฝึกที่ยืนยัน
เอกสารแต่ละ version จึงอ้างคำร้องโดยตรงและไม่มีชุดหนังสือกลาง
ชื่อและข้อมูลชุดหนังสือที่ยังอยู่ใน prototype UI เป็น mock เดิมและไม่ใช่ persisted workflow

`activeSlotKey` มีค่าเท่ากับ enrollment id เฉพาะคำร้องที่ยังดำเนินการ และ
`confirmedSlotKey` มีค่าเท่ากับ enrollment id เฉพาะคำร้องที่ยืนยันแล้ว เพื่อบังคับ
หนึ่ง active request และหนึ่ง confirmed placement ต่อ enrollment ผ่าน unique index

### 2.6 กลุ่ม รายการนิเทศ และค่าใช้จ่าย — 7 ตาราง

| ตาราง | หน้าที่ |
|---|---|
| `SupervisionGroup` | กลุ่มภายใต้รอบและครั้งที่นิเทศ |
| `SupervisionGroupLecturer` | อาจารย์ประจำกลุ่ม |
| `SupervisionGroupCompany` | สาขาบริษัทที่กลุ่มรับผิดชอบ |
| `SupervisionAppointment` | นัด สถานะ และผลการนิเทศร่วม |
| `SupervisionAppointmentLecturer` | อาจารย์ตามแผนและผู้เข้าร่วมจริง |
| `SupervisionAppointmentStudent` | คำร้องที่ยืนยันแล้วซึ่งอยู่ในนัด |
| `SupervisionExpense` | ค่าเดินทาง ที่พัก และเบี้ยเลี้ยงหนึ่งรายการต่อสายการนิเทศ |

ตาราง junction ยังจำเป็นเพื่อบังคับสมาชิกไม่ซ้ำและตรวจ ownership/RBAC

### 2.7 แบบประเมิน — 2 ตาราง

| ตาราง | หน้าที่ |
|---|---|
| `StudentEvaluation` | คะแนน 7 หัวข้อและข้อความประเมินนักศึกษาโดยอาจารย์แต่ละคน |
| `CompanyEvaluation` | คะแนน 7 หัวข้อและผลสรุปบริษัทหนึ่งชุดต่อรายการนิเทศ |

โดเมนคะแนนคือ `NULL` = ยังไม่ตอบ, `0` = ไม่สามารถประเมินได้ และ `1..5` = คะแนน
หัวข้อเป็นค่าคงที่ของระบบและเก็บ `rubricVersion` เพื่อระบุรุ่นของแบบประเมิน
หากอนาคตต้องให้ผู้ดูแลแก้ rubric ผ่าน UI จึงค่อยแยก template/criterion/score tables

### 2.8 การแจ้งเตือนและปฏิทิน — 3 ตาราง

| ตาราง | หน้าที่ |
|---|---|
| `Notification` | ข้อความและลิงก์ไปคำร้องหรือนัด |
| `NotificationRecipient` | ผู้รับและเวลาอ่าน รองรับข้อความเดียวหลายผู้รับ |
| `CalendarEvent` | กิจกรรมส่วนตัวที่ผู้ใช้สร้างเอง |

กิจกรรมระบบ เช่นนัดนิเทศและ deadline อ่านจากตารางต้นทาง ไม่บันทึกซ้ำใน Calendar

## 3. Source of truth

| ข้อมูล | Source of truth |
|---|---|
| บัญชีและข้อมูลบุคคล | `User` |
| จังหวัดและภูมิภาค | `Province` |
| บริษัท/สาขาปัจจุบัน | `Company` + `CompanySite` |
| ข้อความที่ใช้สำหรับออกหนังสือ | snapshot ใน `PlacementRequest` |
| สถานะและผลคำร้อง | `PlacementRequest` |
| Timeline คำร้อง | `PlacementRequestStatusHistory` |
| สถานที่ฝึกที่ยืนยันแล้ว | `PlacementRequest` ที่ status = `CONFIRMED` |
| นักศึกษาในนัด | `SupervisionAppointmentStudent` |
| ผลนิเทศ/ความต้องการบริษัท | `SupervisionAppointment` |
| คะแนน | score columns ใน evaluation |
| Dashboard | aggregate จากตารางธุรกรรม |

## 4. Constraint ที่ service ต้องบังคับ

- `User` role STUDENT ต้องมี `cohortYear`; role อื่นต้องไม่มีข้อมูลนักศึกษา
- การตรวจคำร้องและเอกสารอนุญาตเฉพาะ role STAFF
- Foreign Key ที่ชื่อ `studentId` และ `lecturerId` ต้องตรวจ role ก่อนบันทึก
- นักศึกษามี enrollment ที่กำลังดำเนินการได้หนึ่งรายการ
- คำร้อง active และคำร้องยืนยันมีได้อย่างละหนึ่งรายการต่อ enrollment
- Appointment student ต้องอ้างคำร้อง status `CONFIRMED` ใน cycle/site เดียวกับนัด
- อาจารย์จริงทุกคนต้องส่งแบบประเมินนักศึกษาทุกคน
- Appointment หนึ่งรายการมี company evaluation หนึ่งชุด
- คะแนนทุกช่องต้องเป็น `NULL`, `0` หรือ `1..5`; submitted evaluation ห้ามแก้
- Calendar event เป็นของ owner เพียงคนเดียว

## 5. Transaction boundary

1. เพิ่ม/นำเข้าผู้ใช้: user + audit
2. เปลี่ยนรอบ: ปิด enrollment เดิม + สร้างใหม่ + audit
3. เปลี่ยนสถานะคำร้อง: request + history + notification
4. จัดการเอกสารรายบุคคล: document version + request history
5. ยืนยันรายบุคคล: request result + confirmed key + enrollment work status
6. บันทึกผลนิเทศ: appointment + actual lecturers + evaluations
7. บันทึกค่าใช้จ่าย: group + lecturer snapshot + expense + audit

## 6. สิ่งที่ยังไม่สร้าง

- Initial migration และ Production seed
- Backend repository/service/API และ authentication จริง
- ตารางงบประมาณและเบิกจ่าย
- Workflow คำขอยกเลิกหลังออกหนังสือ
- ตารางประวัติการย้ายรอบเฉพาะทาง
- ระบบแบบประเมินที่ผู้ดูแลแก้หัวข้อเอง
- Background import/export job และ reporting warehouse

ให้สร้าง initial migration หลังยืนยันชื่อ field และ state machine ของคำร้องรอบสุดท้าย
จากนั้นเพิ่ม integration test สำหรับกฎที่ Foreign Key หรือ unique index บังคับไม่ได้
