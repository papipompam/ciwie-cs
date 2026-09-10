# 🎓 CWIE BRU — Co-op Supervision System

> **ระบบบริหารจัดการและนิเทศงานสหกิจศึกษา (Cooperative Education Management & Supervision System)**  
> ระบบสำหรับบริหารจัดการและติดตามการฝึกงานสหกิจศึกษาของนักศึกษา ตั้งแต่การเลือกสถานประกอบการ การจัดสรรอาจารย์นิเทศ การวางแผนตารางนิเทศ การบันทึกผลและประเมินผล ไปจนถึงการคำนวณค่าใช้จ่ายในการนิเทศ

> **สถานะปัจจุบัน:** เริ่มพัฒนาเฉพาะ UI ด้วย Mock Data ก่อน โดยยังไม่เชื่อม Backend
> หรือฐานข้อมูล ดูแนวทางที่ [`dosc/architecture.md`](./dosc/architecture.md)

---

## ✨ ฟีเจอร์หลักของระบบ (Key Features)

ระบบถูกออกแบบมาเพื่อรองรับ 3 บทบาทหลักตามกระบวนการสหกิจศึกษา:

### 1. 🏢 ส่วนสำหรับเจ้าหน้าที่ (Admin / Staff)
- **จัดการข้อมูล Master Data:** เพิ่ม ลบ แก้ไข และสืบค้นข้อมูลนักศึกษา อาจารย์ และสถานประกอบการ
- **นำเข้าและส่งออกข้อมูล:** นำเข้า-ส่งออกข้อมูลนักศึกษาด้วยไฟล์ CSV และ Excel (`.xlsx`) พร้อมระบบตรวจสอบความถูกต้อง
- **จัดการรอบสหกิจศึกษา:** จัดการข้อมูลปีการศึกษา ภาคเรียน และเปิด-ปิดสถานะรอบสหกิจ
- **จัดสรรพื้นที่และความรับผิดชอบ:** กำหนดพื้นที่รับผิดชอบให้อาจารย์ตามภูมิภาค จังหวัด หรือสถานประกอบการ
- **วางแผนและจัดตารางนิเทศ:** คัดกรองนักศึกษาเพื่อสร้างและแก้ไขตารางนิเทศ (แบ่งเป็นการนิเทศครั้งที่ 1 และ 2)
- **ระบบตรวจสอบเวลาชนกัน (Conflict Detection):** ตรวจสอบตารางเวลาที่ซ้ำหรือชนกันของอาจารย์ นักศึกษา และสถานประกอบการ
- **คำนวณค่าใช้จ่าย:** บันทึกค่าเดินทาง ค่าที่พัก ค่าเบี้ยเลี้ยง/อาหาร และคำนวณสรุปยอดรวมค่าใช้จ่าย

### 2. 👨‍🏫 ส่วนสำหรับอาจารย์นิเทศ (Lecturer / Supervisor)
- **เข้าสู่ระบบ / ยืนยันตัวตน:** ระบบเข้าสู่ระบบตามสิทธิ์อาจารย์
- **ดูตารางนิเทศ:** ดูตารางนิเทศที่ตนเองได้รับมอบหมาย แยกตามครั้งที่ 1 และ 2
- **ดูข้อมูลนักศึกษาและสถานประกอบการ:** ค้นหาและดูรายละเอียดนักศึกษาและสถานประกอบการที่ได้รับมอบหมาย
- **อัปเดตสถานะการนิเทศ:** บันทึกสถานะ (จัดตารางแล้ว, นิเทศเสร็จแล้ว, เลื่อน, ยกเลิก)
- **บันทึกผลและข้อเสนอแนะ:** บันทึกผลการนิเทศ ความก้าวหน้า และข้อเสนอแนะ
- **ประเมินผล:** ประเมินสมรรถนะนักศึกษา และประเมินสถานประกอบการหลังการนิเทศ

### 3. 🎓 ส่วนสำหรับนักศึกษา (Student)
- **เข้าสู่ระบบ / ยืนยันตัวตน:** ระบบเข้าสู่ระบบสำหรับนักศึกษา
- **ค้นหาและเลือกสถานประกอบการ:** ค้นหา ดูข้อมูล และเลือกสถานประกอบการที่ต้องการไปปฏิบัติงาน
- **ตรวจสอบผลการยืนยัน:** ดูสถานประกอบการที่ได้รับการยืนยันเป็นสถานที่ฝึกงานของตนเอง
- **ดูตารางนิเทศ:** ดูตารางนิเทศของตนเอง (ครั้งที่นิเทศ วันที่ เวลา สถานประกอบการ และอาจารย์ผู้รับผิดชอบ)

---

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)

| ส่วนของระบบ | เทคโนโลยีที่เลือกใช้ |
|---|---|
| **App Framework** | [Nuxt 4](https://nuxt.com/) (Vue 3 Composition API + Nitro Engine) |
| **Styling & UI** | [Tailwind CSS v4](https://tailwindcss.com/) + [Reka UI](https://reka-ui.com/) (Headless Primitives) |
| **Icons** | [Lucide Icons](https://lucide.dev/) (`@lucide/vue`) |
| **Date & Time** | [date-fns](https://date-fns.org/) |
| **Schema Validation** | [Zod](https://zod.dev/) |
| **Database & ORM (ระยะ Backend)** | PostgreSQL (Supabase ใน Cloud) + [Prisma ORM](https://www.prisma.io/) |
| **Authentication** | [nuxt-auth-utils](https://github.com/atinux/nuxt-auth-utils) (Session-based RBAC) |
| **Data Processing** | [exceljs](https://github.com/exceljs/exceljs) + [papaparse](https://www.papaparse.com/) |
| **DevOps & Deploy** | Docker (Multi-stage build) + Docker Compose |

---

## 📁 โครงสร้างโปรเจกต์ (Project Structure)

```text
ciwie-comsci/
├── app/
│   ├── assets/
│   │   └── css/main.css          # Tailwind CSS configuration
│   ├── components/               # UI Presentational Components
│   ├── composables/              # Business Logic & Shared State
│   ├── layouts/                  # Layouts (default, admin, student, etc.)
│   ├── pages/                    # File-based Routing
│   └── app.vue                   # Root Application Component
├── server/
│   ├── api/                      # Nitro API Endpoints
│   ├── middleware/               # Server-side Auth & RBAC Middleware
│   └── utils/                    # Server Utilities
├── prisma/
│   ├── schema.prisma             # PostgreSQL data model
│   └── migrations/                # PostgreSQL migrations
├── dosc/
│   ├── requirement.md            # Requirement Documentation
│   ├── architecture.md           # UI-first Architecture
│   └── ui-plan.md                # UI Checkpoints and Acceptance Plan
├── Dockerfile                    # Multi-stage Production Dockerfile
├── docker-compose.yml            # Local PostgreSQL + migration + app
├── nuxt.config.ts                # Nuxt Configuration
├── package.json
└── AGENTS.md                     # Coding Guidelines for AI & Developers
```

---

## 🚀 การติดตั้งและเริ่มใช้งาน (Getting Started)

### ความต้องการของระบบ (Prerequisites)
- **Node.js**: `v20` หรือ `v22+`
- **Package Manager**: `pnpm` (แนะนำเวอร์ชัน 10 ขึ้นไป)
- หากต้องการใช้ login และข้อมูลตัวอย่าง ให้เปิด PostgreSQL ด้วย Docker หรือกำหนด `DATABASE_URL`/`DIRECT_URL` ของ Supabase

### 1. โคลนโปรเจกต์และติดตั้ง Dependencies
```bash
git clone https://github.com/jirayu-ct-dev/ciwie-comsci.git
cd ciwie-comsci
pnpm install
```

### 2. รัน Development Server
```bash
pnpm dev
```
เปิดเบราว์เซอร์และเข้าไปที่ `http://localhost:3000`

Prisma ใช้ PostgreSQL แล้ว ส่วนการ login มหาวิทยาลัยจะเชื่อม SSO/LDAP ในระยะถัดไป

---

## 🐳 Docker และฐานข้อมูล

ระยะ UI ให้รันด้วย `pnpm dev` เป็นหลัก หากใช้ Docker ให้ใช้ Compose project
`cowier-demo` เพียงชุดเดียว: `cowier-app` ที่พอร์ต 3000 และ `cowier-postgres`
ที่พอร์ต 5432 โดยฐานข้อมูลอยู่ใน volume `cowier-demo_postgres_data`
อย่าเปิด dev server และ Docker app บนพอร์ต 3000 พร้อมกัน

```bash
docker compose config --quiet
docker compose up -d --build
docker compose ps
docker compose logs --tail 100 app
docker compose stop
```

ตั้งค่า `POSTGRES_PASSWORD` ใน `.env` ก่อนเริ่ม Compose;
การเปลี่ยน environment ไม่ได้เปลี่ยนรหัสผ่านใน volume ที่สร้างแล้ว
ห้ามใช้ `down -v` หรือ `volume prune` หากต้องการเก็บข้อมูล
API บางส่วนยังเป็น mock แม้ database container จะทำงาน

ข้อมูล MySQL เดิมไม่ได้ถูกลบ และยังอยู่นอก Compose ชุด PostgreSQL นี้เพื่อป้องกันข้อมูลหาย
แอปพอร์ต 3000 เดิมยังทำงานโดยมี Compose label เก่า `ciwie-comsci`;
การ deploy ครั้งถัดไปต้องหยุดและลบเฉพาะ `cowier-app` เดิมก่อน `compose up`
เพื่อให้ Compose สร้าง label ที่ถูกต้อง (ข้อมูล mock ใน memory จะหายเมื่อ restart)
ไม่ต้องลบ volume ใด ๆ หากต้องการเก็บข้อมูลเดิม

### Supabase / Vercel

ใน Supabase ให้คัดลอก connection string สองแบบจากหน้า Connect:

- `DATABASE_URL`: pooled connection สำหรับ runtime ของ Vercel (มักใช้พอร์ต 6543 และ `pgbouncer=true`)
- `DIRECT_URL`: direct connection สำหรับ Prisma migration (`pnpm db:deploy`)

เพิ่มทั้งสองค่าเป็นตัวแปรลับใน Vercel โดยเลือก Environment ให้ตรงกับ deployment แล้ว deploy ใหม่ จากนั้นตรวจสอบด้วย `pnpm db:deploy` และ seed เฉพาะฐานข้อมูลทดสอบด้วย `ALLOW_DEMO_SEED=true pnpm db:seed`

---

## 📜 คำสั่งสำหรับพัฒนา (Available Scripts)

```bash
# รัน Dev Server พร้อม Hot Module Replacement
pnpm dev

# ตรวจสอบและสร้าง Types
pnpm postinstall

# Build โปรเจกต์สำหรับ Production
pnpm build

# พรีวิว Production Build
pnpm preview

# Prisma validation/migration จะเริ่มใช้ในระยะ Backend
```

---

## 📄 ใบอนุญาต (License)

โปรเจกต์นี้พัฒนาขึ้นสำหรับระบบบริหารจัดการสหกิจศึกษา สงวนลิขสิทธิ์ตามข้อตกลงของสถาบัน/องค์กร
