# CWIE BRU — Agent Guide

## Scope

ระบบ Nuxt 4 สำหรับบริหารและนิเทศสหกิจศึกษา (เจ้าหน้าที่ อาจารย์ นักศึกษา)
ปัจจุบัน UI และ workflow ส่วนใหญ่ใช้ mock/in-memory data; Prisma/MySQL และ session auth เป็นโครงสร้างสำหรับระยะ backend

## Project map

- `app/pages` — file-based routes และ page orchestration
- `app/components` — reusable UI/presentational components
- `app/composables` — feature logic และ shared state
- `app/middleware` — prototype route access checks
- `server/api` — Nitro endpoints (บาง flow ยังเป็น mock)
- `shared` — types และ Zod schemas ที่ใช้ร่วม client/server
- `prisma/schema.prisma` — target data model; อย่าสมมติว่า runtime เชื่อม DB แล้ว
- `app/pages/dev/ui.vue` — visual reference สำหรับ UI ที่มีอยู่

## Working rules

1. สำรวจโค้ดและสถานะ Git ก่อนแก้; เปลี่ยนเฉพาะไฟล์ที่เกี่ยวข้อง และรักษา user changes
2. ใช้ Composition API + TypeScript; ย้าย business logic ไป composables และใช้ shared types/schemas
3. สำหรับ UI ที่มีข้อมูล แสดง loading, empty, error และ data state; รองรับ mobile และ keyboard accessibility
4. ใช้ existing components/tokens ใน `app/components/ui` และ pattern จาก `/dev/ui` ก่อนสร้างของใหม่
5. ตรวจ input/API ด้วย Zod; destructive actions ต้องมี confirmation และ feedback ที่เหมาะสม
6. หากแตะ backend ให้ตรวจสิทธิ์ที่ server, จำกัด query/include และใช้ transaction เมื่อแก้หลาย entity
7. เสร็จงานแล้วรัน checks ที่เกี่ยวข้องจาก `package.json` (อย่างน้อย lint/typecheck/test หรือ build ตามขอบเขต) และรายงานผล

## Skills

เรียกใช้ skill เฉพาะเมื่อเข้าเงื่อนไข: `grill-with-docs`/`to-spec` ก่อนงานที่ requirement ยังไม่ชัด, `codebase-design`/`domain-modeling` เมื่อต้องออกแบบ boundary หรือศัพท์โดเมน, `tdd` เมื่อต้องเพิ่ม logic/แก้ bug, `code-review` ก่อนส่งมอบ diff, `docker-deployment-standards` เมื่องานแตะ Docker, และ `diagnosing-bugs` เมื่อต้องวิเคราะห์ failure

## Guardrails

- เก็บ secrets ใน `.env` ที่ไม่ track; ใช้ `.env.example` เป็น template
- อย่าลบ volume/database หรือรันคำสั่ง destructive หาก scope ยังไม่ชัดเจน
- อย่าอ้างว่า feature เป็น production-ready จนกว่าจะมี server auth, persistence และ tests รองรับจริง
