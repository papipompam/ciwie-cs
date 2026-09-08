# สถาปัตยกรรมระบบ CWIE BRU

เอกสารนี้กำหนดสถาปัตยกรรมเป้าหมายของระบบ โดยเริ่มพัฒนาเฉพาะส่วนติดต่อผู้ใช้
(UI-first) ก่อน และยังไม่ผูกหน้าจอกับฐานข้อมูลหรือ Backend เพื่อให้สามารถปรับ Flow
และ Requirement ได้โดยมีต้นทุนต่ำ

## 1. เป้าหมายและแนวทางหลัก

- ใช้ **Nuxt แบบ Modular Monolith** หนึ่งโปรเจกต์ ไม่แยก Microservices
- ระยะแรกทำ UI ด้วยข้อมูลจำลองที่มี Type และสถานะตรงกับ Requirement
- แยกจุดเรียกข้อมูลออกจาก Page/Component เพื่อเปลี่ยนจาก Mock เป็น API ได้ภายหลัง
- ใช้ Component และ Pattern ร่วมกันเฉพาะเมื่อมีการใช้ซ้ำจริง
- ใช้ฐานข้อมูลเป้าหมายเป็น **MySQL 8.4 LTS** ผ่าน **Prisma ORM** เมื่อเริ่ม Backend
- ใช้ Docker สำหรับทดสอบ Production build และรันระบบครบชุดในระยะ Backend

## 2. ภาพรวมสถาปัตยกรรมเป้าหมาย

```text
Browser
  → Nuxt Pages / Layouts
    → Feature Components
      → Feature Composables
        → Typed Data Functions
          ├─ ระยะ UI: Mock Data
          └─ ระยะ Backend: Nitro API
                → Application Service
                  → Prisma ORM → MySQL
                  → File Storage Adapter → PDF Storage
```

หลักสำคัญคือ Page และ Component ไม่รู้ว่าข้อมูลมาจาก Mock, API หรือฐานข้อมูล
แต่รับข้อมูลที่มี Type เดียวกัน ทำให้เปลี่ยนแหล่งข้อมูลได้โดยไม่ต้องรื้อ UI

## 3. เครื่องมือที่ใช้

### 3.1 ระยะ UI (เริ่มใช้งานทันที)

| หน้าที่ | เครื่องมือ | แนวทางใช้ |
|---|---|---|
| Framework | Nuxt 4 + Vue 3 + TypeScript | ใช้ Composition API และ `<script setup lang="ts">` |
| Styling | Tailwind CSS v4 | จัด Layout, Responsive, สี และ Design Tokens |
| Accessible primitives | Reka UI | ใช้กับ Dialog, Select, Popover, Dropdown, Tabs และ Tooltip |
| Icons | Lucide | ใช้ Icon set เดียวทั้งระบบ |
| Validation | Zod | กำหนด Form schema ตั้งแต่ UI และนำไปใช้กับ API ภายหลัง |
| Date/time | date-fns | แสดงผลและคำนวณวันที่ โดยเก็บเวลามาตรฐานเป็น UTC ในอนาคต |
| Mock data | TypeScript fixtures/functions | จำลอง loading, empty, error และ data state |

ยังไม่เพิ่ม State Management library ในระยะแรก ให้ใช้ state ภายใน Component,
Composable และ `useState` ของ Nuxt ก่อน เพิ่ม Pinia เฉพาะเมื่อพบ state ข้ามหลายหน้า
ที่ซับซ้อนจริง

### 3.2 ระยะ Backend (ยังไม่เริ่มในรอบนี้)

| หน้าที่ | เครื่องมือ | แนวทางใช้ |
|---|---|---|
| API | Nuxt Nitro Server Routes | API อยู่ในโปรเจกต์เดียวกับ Nuxt |
| Authentication | nuxt-auth-utils | ติดตั้งเมื่อเริ่ม Authentication; ใช้ Session-based authentication และตรวจ RBAC ที่ Server |
| ORM | Prisma ORM | ติดตั้งเมื่อเริ่ม Backend; Query แบบ type-safe และใช้ migration อย่างเป็นลำดับ |
| Database | MySQL 8.4 LTS | ใช้ `utf8mb4`; กำหนด timezone ของระบบให้ชัดเจน |
| Import/export | ExcelJS + PapaParse | ติดตั้งเมื่อเริ่ม Import/Export; ใช้ CSV/XLSX สำหรับข้อมูลนักศึกษาและอาจารย์ |
| PDF metadata | MySQL ผ่าน Prisma | เก็บชื่อไฟล์ รุ่น ผู้อัปโหลด และสถานะ |
| PDF binary | Storage adapter | Development ใช้ local volume; Production ใช้ object storage |

ไม่ควรเก็บไฟล์ PDF เป็น binary ลง MySQL เพราะทำให้การสำรองข้อมูลและการขยายระบบ
ยุ่งยากโดยไม่จำเป็น ให้ฐานข้อมูลเก็บเฉพาะ metadata และตำแหน่งไฟล์

### 3.3 การทดสอบและคุณภาพ

- เริ่มเพิ่ม **Vitest + Nuxt Test Utils** เมื่อมี Component/Composable ที่มี logic
- เพิ่ม **Playwright** เมื่อ Flow หลักหน้าแรกทำงานครบ เพื่อทดสอบแยกตาม 3 บทบาท
- ตรวจ UI ทุกหน้าครบ Loading, Empty, Error และ Data state
- ตรวจ keyboard navigation, focus, responsive และข้อความภาษาไทยที่ยาว
- ใช้ `pnpm build` เป็นขั้นต่ำก่อนส่งมอบ UI แต่ละชุด

## 4. Tailwind และ Reka UI ใช้ร่วมกันอย่างไร

Tailwind และ Reka UI ทำหน้าที่คนละส่วน จึงควรใช้ร่วมกัน:

- ใช้ **HTML ปกติ + Tailwind** สำหรับ Button, Input, Card, Badge และ Table พื้นฐาน
- ใช้ **Reka UI + Tailwind** เมื่อ Component ต้องจัดการ focus, keyboard, portal,
  overlay หรือ ARIA ที่ซับซ้อน
- สร้าง Wrapper ของระบบไว้ใน `app/components/ui` เช่น `AppDialog`, `AppSelect`
  และ `AppDropdown` เพื่อรวมรูปแบบหน้าตาและลดการผูก Feature กับ Reka UI โดยตรง
- Feature Component เรียก Wrapper ของระบบ ไม่ import Reka UI กระจายทุกหน้า

ไม่ใช้ `radix-vue` ต่อ เพราะแพ็กเกจรุ่นใหม่ของโครงการเดียวกันใช้ชื่อ `reka-ui`
และขณะนี้ยังไม่มี UI เดิมที่ต้องแบกรับต้นทุน Migration

### 4.1 UI contract ที่ผ่านการตรวจรับ

รูปแบบในหน้า Development Design System (`/dev/ui`) เป็น UI contract กลางของระบบ
ทุก Feature ต้อง reuse semantic tokens, app shell และ Component ใน `app/components/ui`
รวมถึงใช้รูปแบบ Form, Feedback, Data Table, Mobile Card และ Shared State เดียวกัน
การเพิ่ม pattern ใหม่ทำได้เมื่อ Component เดิมไม่รองรับงานจริง และต้องเพิ่มตัวอย่างกลับมา
ใน Design System เพื่อให้ตรวจสอบความสม่ำเสมอได้

## 5. โครงสร้างโฟลเดอร์ที่แนะนำ

```text
app/
├── assets/css/               # Tailwind และ semantic design tokens
├── components/
│   ├── ui/                   # Primitive/wrapper ที่ใช้ทั้งระบบ
│   ├── shared/               # App shell, state view และ shared pattern
│   ├── placements/           # การยื่นสถานประกอบการและชุดหนังสือ
│   ├── supervision/          # กลุ่มและตารางนิเทศ
│   ├── evaluations/          # แบบประเมิน
│   └── master-data/          # นักศึกษา อาจารย์ สถานประกอบการ
├── composables/              # Logic ของแต่ละ Feature และ shared state
├── layouts/                  # Layout ตามบทบาท
├── mocks/                    # Typed fixtures และ mock async functions
├── pages/                    # Route composition; ไม่ใส่ business logic จำนวนมาก
├── schemas/                  # Zod form schemas
├── types/                    # UI/domain contracts ที่ไม่อิง Prisma type
└── utils/                    # Pure functions

server/                       # เริ่มใช้เมื่อเข้าสู่ระยะ Backend
├── api/                      # Route handler, auth, validation
├── services/                 # Use case และ business rules
├── repositories/             # Prisma queries
└── utils/                    # Server-only utilities
```

ไม่ควร import Type จาก Prisma เข้า Component โดยตรง ให้ UI ใช้ Type contract ของตนเอง
เพื่อไม่ให้การเปลี่ยน schema บังคับให้แก้ทุกหน้าจอ

## 6. ขอบเขต Module

แบ่งตามงานธุรกิจ ไม่แบ่งตามชนิดตารางฐานข้อมูล:

1. **Authentication and Account** — Login, first login, reset password, account state
2. **Master Data** — Student, lecturer และ company
3. **Co-op Cycle** — รอบสหกิจและสถานะการฝึกของนักศึกษา
4. **Placement Submission** — คำร้อง ชุดหนังสือ PDF ตอบกลับ และการยืนยัน
5. **Supervision** — กลุ่ม ตาราง ผู้เข้าร่วม สถานะ และผลการนิเทศ
6. **Evaluation** — ประเมินนักศึกษาและสถานประกอบการรายอาจารย์
7. **Notification and Calendar** — การแจ้งเตือนและกิจกรรมที่ผู้ใช้สร้างเอง

Page สามารถประกอบหลาย Module ได้ แต่กฎของแต่ละ Module ควรอยู่ใน Composable/Service
ของ Module นั้น ไม่เขียนซ้ำในหลาย Page

## 7. แนวทางทำ UI ด้วย Mock Data

- กำหนด Type และ Zod schema จาก Requirement ก่อนสร้าง Form
- Mock function คืน `Promise` เพื่อให้ UI รองรับ loading และ error เหมือน API จริง
- ทำชุดข้อมูลอย่างน้อย: ปกติ, ว่าง, ข้อมูลยาว, สถานะผิดพลาด และไม่มีสิทธิ์
- Mutation ใน Mock ต้องสะท้อน flow จริง เช่น Draft → Submitted → Locked
- ใช้ developer-only role/scenario switcher ได้ แต่ห้ามนำไปเป็นกลไกสิทธิ์จริง
- เมื่อเริ่ม Backend ให้เปลี่ยนภายใน data function เป็น `$fetch` โดยคง contract เดิม

ยังไม่ต้องสร้าง Repository interface ให้ทุก Entity ในระยะนี้ เพราะจะเป็น abstraction
ที่ยังไม่มีประโยชน์ ให้สร้าง data function ตาม use case ของหน้าจอ เช่น
`listPlacementRequests()` และ `submitPlacementRequest()` ก่อน

## 8. ลำดับการพัฒนา UI

พัฒนาและตรวจรับแบบทีละ Checkpoint ตาม [`ui-plan.md`](./ui-plan.md) โดยเริ่มจาก
Design Foundation แล้วทำ Flow ยื่นสถานประกอบการแบบ end-to-end ก่อนงานจัดการข้อมูล
และการนิเทศ แต่ละ Checkpoint ต้องผ่านการตรวจของเจ้าของระบบก่อนเริ่มขั้นที่พึ่งพากัน
เพื่อลดจำนวนหน้าจอที่ค้างอยู่ในสภาพกึ่งสำเร็จและลดผลกระทบเมื่อ Requirement เปลี่ยน

## 9. การเปลี่ยนจาก PostgreSQL เป็น MySQL

หลัง UI flow ผ่านการสรุป ระบบเริ่มระยะออกแบบฐานข้อมูลและเปลี่ยนเป้าหมายเป็น
**MySQL 8.4 LTS** พร้อมกันทั้ง `schema.prisma`, `prisma.config.ts`, `.env.example`
และ Database service ใน `docker-compose.yml` แล้ว เพื่อลดความเสี่ยงจาก config
ครึ่งหนึ่งเป็น PostgreSQL และอีกครึ่งเป็น MySQL

สถานะปัจจุบัน:

1. Prisma datasource และ native type ใช้ MySQL
2. Compose ใช้ MySQL 8.4 พร้อม healthcheck
3. Database design อยู่ที่ [`database-design.md`](./database-design.md) และลดเหลือ
   25 ตารางสำหรับระบบภายในสาขา โดยยังคง relationship และประวัติหลักครบ
4. Import/export รุ่นแรกประมวลผล synchronous และเก็บสรุปใน AuditLog
   จึงยังไม่มี background job หรือ import-row persistence
5. Schema ผ่าน Prisma format, validate และ generate แล้ว
6. ยังไม่สร้าง migration เริ่มต้น, seed, repository, service หรือ API

เมื่อยืนยัน schema รอบสุดท้ายจึงสร้าง migration เริ่มต้นใหม่ เพราะระบบยังไม่มีข้อมูล
Production และรัน migration, build, integration test กับ smoke test ตามลำดับ
