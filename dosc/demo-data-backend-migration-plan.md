# รายงานตรวจสอบข้อมูล Demo และแผนย้ายไปใช้ Backend จริง

วันที่ตรวจสอบ: 12 กันยายน 2569  
Branch ที่ตรวจสอบ: `feature/student` (`91f702c`)  
ขอบเขต: ตรวจ source code, Nuxt composables/pages, Nitro endpoints, Prisma schema/migrations, seed และ tests แบบ read-only ก่อนจัดทำเอกสารนี้

> สถานะการลงมือ: เริ่มดำเนินการตาม runbook เมื่อ 12 กันยายน 2569 โดยรอบนี้เปลี่ยน cycle, calendar, placement flow, supervision grouping, evaluation, people/application/notification cache ให้เริ่มจาก server-backed state และตัด runtime demo fallback ที่เกี่ยวข้องออกแล้ว รายละเอียดผลตรวจและข้อค้างต้องดูส่วน **Implementation status** ด้านล่าง; เอกสารนี้ยังคงเป็น inventory/reference ไม่ใช่หลักฐานว่า migration ครบทุกโดเมน

> แผนนี้ผ่านการตรวจรอบสุดท้ายแล้ว สำหรับการลงมือแบบ task เดียวให้ใช้
> [`backend-real-data-agent-runbook.md`](./backend-real-data-agent-runbook.md) เป็นลำดับปฏิบัติหลัก
> และใช้เอกสารนี้เป็นหลักฐาน inventory/reference

## 1. บทสรุปสำหรับตัดสินใจ

ระบบไม่ได้เป็น UI mock ทั้งหมดแล้ว ปัจจุบัน authentication, บุคคล, บริษัท, การสมัครของนักศึกษา, คำร้อง/เอกสาร, กลุ่มและนัดนิเทศ, การประเมิน, ค่าใช้จ่าย และการแจ้งเตือนมี PostgreSQL-backed endpoints อยู่หลายส่วน แต่ client ยังเก็บ demo seed และ local mutation ปะปนกับข้อมูลจาก server ทำให้ผลที่เห็นต่างกันตามหน้า บทบาท สภาพแวดล้อม และจังหวะที่ request สำเร็จหรือผิดพลาด

สถานะที่ควรใช้สื่อสารคือ **hybrid migration ที่ยังไม่เสร็จ** ไม่ใช่ “backend จริงทั้งหมด” และไม่ใช่ “mock ทั้งหมด”

ประเด็นเร่งด่วนที่สุด:

1. `useCoopCycles` เป็น static catalog ทั้งหมด ทั้งที่มี `CoopCycle` ในฐานข้อมูล และยังไม่มี cycle endpoint
2. หน้า `/staff/supervision/groups` render `prototype.vue` โดยตรง ซึ่งเริ่มด้วยบริษัท อาจารย์ ตาราง และสูตรระยะทางจำลอง
3. lecturer applications ไม่โหลดรายการสมัครจาก server จึงใช้ `initialApplications` ใน development
4. dashboard อาจารย์ใช้ lecturer id `'L0012'` แบบ hard-code และไม่ได้โหลดข้อมูลที่ต้องใช้เอง
5. custom calendar events อยู่ใน `useState` เท่านั้น แม้ schema มี `CalendarEvent`; refresh แล้วหาย และไม่มี calendar endpoint
6. people, notification, placement preview, evaluation และ supervision group stores ยังเริ่มจาก client seed; บางแห่งตั้งใจเก็บ seed ไว้เมื่อ backend คืนค่าว่างหรือผิดพลาด
7. `useStudentPlacements` เป็น flow เก่าที่เป็น in-memory ทั้งหมด แม้หน้าหลักของ flow ถูก redirect ไป `/student/applications` แล้ว แต่ยังถูก dashboard และ composable อื่นอ้างอิง
8. `/api/mock-documents/[fileName]` สร้าง PDF จำลองและไม่ได้จำกัดเฉพาะ development

เป้าหมายที่แนะนำคือให้ **server เป็น source of truth เพียงแห่งเดียวสำหรับ domain data** ส่วน `useState` ทำหน้าที่ cache ของ response และ UI state เท่านั้น ข้อมูลตัวอย่างสำหรับทดลองระบบควรอยู่ใน `prisma/seed.mjs` และต้องเปิดใช้แบบ explicit ด้วย `ALLOW_DEMO_SEED=true`; fixture สำหรับ design system/test ต้องแยกออกจาก runtime modules

## 2. วิธีจำแนกข้อมูล

รายงานนี้แยกข้อมูลเป็น 4 ประเภทเพื่อไม่ลบ state ที่ควรอยู่ฝั่ง client โดยไม่จำเป็น:

- **Domain data**: รอบสหกิจ บุคคล บริษัท การสมัคร คำร้อง กลุ่ม นัด ประเมิน ค่าใช้จ่าย การแจ้งเตือน ปฏิทิน ต้องมาจาก server และ persist
- **Server-backed cache**: array/ref ใน composable ที่รับค่าจาก endpoint ได้ แต่ต้องเริ่มว่างและต้องไม่ fallback เป็น demo
- **UI state**: filter, pagination, dialog state, selected tab, loading state, sidebar collapse อยู่ client ได้
- **Development fixture**: scenario simulator และข้อมูลหน้า `/dev/ui` เก็บได้เฉพาะ dev/test และต้องไม่ไหลเข้าหน้าใช้งานจริง

## 3. Inventory ปัจจุบัน

| Module / flow | สถานะ | ข้อเท็จจริงที่พบ | ความเสี่ยง / งานที่ขาด |
|---|---|---|---|
| Authentication/session | Backend จริง + dev helper | `/api/auth/login`, session, password ใช้ Prisma และ encrypted `h3` session; `/api/auth/prototype` เปิดเฉพาะ `import.meta.dev` | ชื่อ `useAuthPrototype` และ middleware `*-prototype` ทำให้สถานะสับสน; `scenario.role` ซ้ำกับ session role |
| Co-op cycles | **Mock/static ทั้งหมด** | `useCoopCycles.ts` มี 5 records hard-code; Prisma มี `CoopCycle`/history/enrollment แต่ไม่มี cycle endpoint | ทุก filter, selected cycle, วันเปิดรับ และ validation ฝั่ง UI อาจไม่ตรง DB |
| People directory | Hybrid | CRUD/import/account actions และ audit ใช้ server; `usePeopleDirectory` ยังมีนักศึกษา/อาจารย์ demo จำนวนมากใน `initialPeople` เมื่อ dev | หน้าที่ไม่ได้ load API เองยังเห็น seed; หน้า import ตั้งใจไม่ reload persisted people ใน dev; application history ในหน้ารายละเอียดอาจารย์เป็น static map |
| Student applications | Hybrid | student CRUD และ staff list ใช้ Prisma endpoints | `initialApplications` ยังอยู่ใน composable; lecturer view ไม่เรียก staff endpointและไม่มี lecturer-scoped endpoint จึงเห็น mock ใน dev; local mutators ยังอยู่ร่วมกับ persisted mutators |
| Placement requests/documents | Hybrid | student/staff list, upload/download PDF และ staff review ใช้ backend/file storage | `previewRequestsSeed` ถูกสร้างทุก environment; cancel request เปลี่ยนเฉพาะ client; mock PDF route ยังเปิดได้; local sync ข้าม composable อาจทำให้ state ต่างจาก DB |
| Legacy student placement flow | **Mock/in-memory ทั้งหมด** | `useStudentPlacements.ts` มี company/request/timeline seed และ mutation local; routes `/student/placements/new` และ `[id]` redirect ไป `/student/applications` แล้ว | ยังถูก dashboard, `StudentPlacementProgress` และ placement preview เรียกใช้ ควรถอด dependency แล้วลบ module เมื่อไม่มี caller |
| Companies | Backend จริงเป็นหลัก + dev seed | list/create/update/status endpoints มีแล้ว และหน้าบริษัทเรียก load; `useSupervisionGroups` ยัง seed company/placement ใน dev | `updateCompanyStudent` แก้ client person/placement เท่านั้น; local create/update/delete company methodsยังอยู่; empty DB ถูกแทนด้วย demo ใน supervision store |
| Supervision grouping | **Hybrid ที่มี fallback หนัก** | list/create/suggest/assign lecturers มี endpoints และ transaction | main route render `prototype.vue`; prototype เริ่มด้วย 10 บริษัท, 10 อาจารย์, schedule และ distance จำลอง; `syncPersistedContext` ไม่ยอมแทน seed เมื่อ backend คืนว่างใน dev; หน้า `groups/new.vue` ใช้ `createGroup()` local ไม่ใช่ persisted create |
| Supervision appointments | Backend จริงเป็นหลัก | list/detail/create/update/result endpoints มี; store เริ่มว่าง | prototype ยังสร้าง schedule fallback; dashboard ไม่ load appointments; local creation/join/publish functions ควรถอดถ้าไม่มี caller; ต้องยืนยัน conflict rules อยู่ server ครบ |
| Evaluations | Hybrid | read/save student/company/export endpoints มี และหน้ารายละเอียด load persisted bundle | store seed evaluation ทุก environment; dashboard ใช้ seed โดยไม่ load; local save/submit methodsทำ mutation หลัง server callและอาจค้างเมื่อ refreshไม่ครบ |
| Expenses | Backend จริงเป็นหลัก | `useSupervisionExpenses` โหลด/บันทึกผ่าน endpoints และ server audit | `useExpenseRecords` เป็น in-memory module ที่ไม่มี runtime caller ควรลบหลังยืนยัน; prototype ใช้สูตร/ระยะทางจำลองก่อนส่งยอด |
| Notifications | Hybrid แต่ backend พร้อม | list/read/read-all และ event writers หลาย flow มีแล้ว | store เริ่มจาก `notificationsSeed` ทุก environment ก่อน API overwrite; role filterอิง scenario; ต้องตรวจ event coverage ของทุก business event |
| Calendar | **Local/in-memory** | นัดนิเทศถูก derive จาก persisted appointments; custom event อยู่ `useState`; Prisma มี `CalendarEvent` แต่ไม่มี endpoints | custom event หายเมื่อ refresh; non-staff เรียก `loadPersistedGroups()` ที่บังคับ staff แล้ว catch ทิ้ง ทำให้ context บริษัท/กลุ่มไม่ครบ |
| Staff dashboard | Hybrid fallback | `/api/staff/dashboard` และ placement request list มี | catch error แล้ว fallback ไป client stores/seed โดยไม่แสดง backend error จึงอาจแสดงตัวเลข demo เป็นข้อมูลจริง |
| Lecturer dashboard | **Mock/ไม่โหลดครบ** | คำนวณจาก client appointment/evaluation stores | lecturer id hard-code เป็น `L0012`; ไม่ load appointments/evaluations; ผลลัพธ์อาจเป็น seed หรือศูนย์ |
| Student dashboard | Backend จริงเป็นหลัก | โหลด `/api/student/placement-requests` ตาม session | cycle label ยัง static; UI scenario ยังแทรก empty/error/edge stateใน dev |
| Development design system | Dev fixture ที่ยอมรับได้ | `/dev/ui` และ `ScenarioPanel` ถูกซ่อนนอก dev | ต้องแยก fixture ไม่ให้ reset runtime domain stores และไม่ให้ dev fallback กลบ backend |
| Database demo seed | Persisted demo ที่ยอมรับได้เมื่อ explicit | `prisma/seed.mjs` ปฏิเสธการทำงานถ้าไม่มี `ALLOW_DEMO_SEED=true`; สร้าง users, cycle/enrollments, company/site, application/request และ notification | seed ยังไม่ครอบคลุม groups, appointments, evaluations, expenses และ calendar; default password ต้องใช้เฉพาะ local/test |

## 4. หลักฐานระดับไฟล์

### 4.1 Runtime seed/fallback ที่ต้องนำออกจากหน้าใช้งานจริง

- `app/composables/useCoopCycles.ts`
  - `cycleCatalog` hard-code ทั้งหมด
  - selected cycle ผูกกับ `scenario.value.cycle`
- `app/composables/usePeopleDirectory.ts`
  - `initialPeople`, `applicationHistory` และ generated demo users
  - store เริ่มด้วย seed เมื่อ `import.meta.dev`
  - มีทั้ง local mutations และ `persist*` mutations ใน interface เดียว ทำให้ caller เลือกผิดได้ง่าย
- `app/pages/staff/people/import.vue`
  - `onMounted` และ watcher ไม่เรียก `loadPersistedPeople` ใน development
- `app/composables/useStudentApplications.ts`
  - `initialApplications` และ `mock-student-applications`
- `app/pages/lecturer/applications/index.vue`
  - fetch `/api/staff/student-applications` เฉพาะ role staff
  - lecturer ใช้ array เดิมใน store จึงไม่ได้รับข้อมูล persisted
- `app/composables/usePlacementRequestPreview.ts`
  - `previewRequestsSeed`
  - `submit`, `syncPlacementRequest`, `cancelPlacementRequest` และ cross-store sync เป็น local mutation
- `app/composables/useStudentPlacements.ts`
  - `initialCompanies`, `initialRequests`, timeline และทุก mutation เป็น in-memory
- `app/composables/useSupervisionGroups.ts`
  - `placementsSeed`, `companyRecordsSeed`, `groupsSeed`, student prefix/section maps
  - `demoSeedEnabled = import.meta.dev`
  - เมื่อ backend คืน arrays ว่างใน dev จะ `return` โดยคง demo เดิม
  - local mutation methods ยังอยู่ข้าง persisted methods
- `app/pages/staff/supervision/groups/index.vue`
  - render `prototype.vue` โดยตรง
- `app/pages/staff/supervision/groups/prototype.vue`
  - initial companies/lecturers, grouping, schedule slots, distance และ expense preview จำลอง
  - ถ้า persisted groups มีจำนวนไม่ตรงกับ requested count จะกลับไปใช้ local suggested groups
- `app/components/domain/SupervisionGroupingAssistant.vue`
  - ใน dev จะสร้าง local suggestion เมื่อ server คืนว่างหรือ error
- `app/composables/useSupervisionEvaluations.ts`
  - student/company evaluation seeds ถูกใส่ทุก environment
- `app/composables/useNotifications.ts`
  - notification seeds ถูกใส่ทุก environmentก่อน response
- `app/composables/useRoleCalendar.ts`
  - custom events เป็น local state; error จาก supervision APIs ถูกกลืน
- `app/pages/index.vue`
  - `currentLecturerId = 'L0012'`
  - staff dashboard fallback ไป client-derived dataเมื่อ backend error
- `server/api/mock-documents/[fileName].get.ts`
  - สร้าง PDF mock โดยไม่มี dev guard หรือ session check
- `server/utils/mockStudentApplications.ts`
  - empty mock array ไม่มี caller จาก runtime ที่ตรวจพบ เป็น candidate สำหรับลบ

### 4.2 ข้อมูลที่เป็น UI state ไม่ต้องย้ายเข้าฐานข้อมูล

- `useToast`: toast queue
- `useStudentCohortContext` และ `useSupervisionContext`: filter/selection ของหน้าจอ (cycle options ต้องมาจาก backend แต่ค่าที่ผู้ใช้เลือกอาจอยู่ client)
- pagination, search, sort, dialogs และ form drafts ใน pages
- `ScenarioPanel`, `/dev/ui` และ state สำหรับจำลอง loading/empty/error ตราบใดที่ compile/run เฉพาะ development และไม่เติม domain stores

## 5. สถาปัตยกรรมเป้าหมาย

แต่ละ feature ควรเป็น module ที่มี interface เล็กและชัด เช่น `list`, `get`, `create/update/action`, `refresh` โดยซ่อน transport, Zod parsing, state replacement และ error normalization ไว้ข้างใน

```text
Page / Feature Component
  -> Feature composable (server-backed cache + UI-friendly interface)
       -> requestAwareFetch / $fetch
            -> Nitro route (auth + Zod + use-case transaction)
                 -> Prisma + file storage
```

กติกาของ seam ระหว่าง client และ server:

1. Domain invariant และ authorization ตัดสินที่ server เสมอ
2. Client mutation ต้องใช้ response จาก server แทนการคำนวณ record ซ้ำเอง
3. GET ที่คืน empty array ต้องแทน cache ด้วย empty array ไม่ใช่เก็บ demo เดิม
4. Network/server error ต้องเป็น error state ห้าม fallback เป็นข้อมูลจำลอง
5. Shared Zod schema เป็น interface ของ payload/response; ห้ามใช้ Prisma typeใน Vue components
6. Development fixture เป็น adapter สำหรับ test/design-system เท่านั้น ไม่ใช่ fallback adapter ของ production feature
7. ไม่สร้าง repository interface ทั่วทุก model โดยไม่มี implementation ที่สอง; ใช้ deep module ตาม use case และทดสอบผ่าน interface ที่ผู้เรียกใช้จริง

## 6. แผนดำเนินงานแบบเป็นลำดับ

### Phase 0 — Baseline และ safety net

เป้าหมาย: รู้ว่า behavior ใดต้องรักษาและป้องกันการปะปนกับ diff ที่มีอยู่

- เก็บผล `git status`, tests และ build baseline ก่อนแก้แต่ละชุด
- ทำ checklist ของ demo accounts และ expected flowsจาก `prisma/seed.mjs`
- เพิ่ม test ที่พิสูจน์ว่า empty response ทำให้ UI emptyจริงและไม่เห็น seed
- เพิ่ม test ที่พิสูจน์ว่า API failure แสดง error และไม่ fallback demo
- กำหนดคำศัพท์เดียว: “database demo seed” กับ “client fixture” ห้ามเรียกรวมว่า mock

เกณฑ์ผ่าน: test ปัจจุบันมี baseline และมี regression tests สำหรับ no-fallback behavior

### Phase 1 — Cycle เป็นฐานข้อมูลกลาง

เหตุผลที่ทำก่อน: people, dashboard, applications, groups, appointments, expenses และ calendar อ้าง cycle ทั้งหมด

งาน server/shared:

- เพิ่ม shared cycle schemas/DTO
- เพิ่ม `GET /api/coop-cycles` สำหรับ roles ที่ login แล้ว โดยส่งเฉพาะ fields ที่หน้าใช้
- หาก staff ต้องบริหารรอบใน scope ปัจจุบัน ให้เพิ่ม create/update/status transition endpoints พร้อม Zod, server role check, transaction และ status history
- กำหนด mapping `DRAFT/OPEN_FOR_REQUESTS/...` เพียงจุดเดียว

งาน client:

- เปลี่ยน `useCoopCycles` ให้โหลด endpoint และเก็บ selected id เป็น UI preference เท่านั้น
- เอา `scenario.cycle` ออกจาก source of truth
- ทุกหน้าต้องรับ loading/empty/error ของ cycle list
- ห้าม filter เหลือเฉพาะภาคเรียนที่ 2 แบบ hard-code เว้นแต่ requirement ยืนยัน

เกณฑ์ผ่าน: เปลี่ยน cycle ใน DB แล้วทุกหน้าที่เกี่ยวข้องเห็นค่าเดียวกันโดยไม่แก้ source

### Phase 2 — People และ application visibility

งาน people:

- ให้ store เริ่ม `[]` ทุก environment และลบ `initialPeople` จาก runtime
- ยกเลิก dev condition ที่หน้า import เพื่อโหลด persisted directory จริงเสมอ
- แยก/ลบ local mutation methods (`createPerson`, `updatePerson`, account actions, `importPeople`) หลังเปลี่ยน callersไปใช้ `persist*`
- เพิ่ม `GET /api/people/:id` หรือ endpointเฉพาะ use case เพื่อโหลดรายละเอียด+audit/application history โดยไม่ต้องดึง directory ทั้งหมด
- เปลี่ยน `getStudentApplicationHistory` จาก static map เป็น response ที่ server scope สิทธิ์ให้ lecturerเฉพาะนักศึกษาที่รับผิดชอบ
- ตรวจ pagination server-side; ปัจจุบันบางหน้าโหลดสูงสุดแล้ว paginate client

งาน applications:

- store เริ่มว่างและลบ `initialApplications`
- เพิ่ม lecturer-scoped list endpoint หรือขยาย endpointโดยกำหนด policy ชัดเจน (อาจารย์เห็นทั้งหมดหรือเฉพาะนักศึกษาที่ได้รับมอบหมาย)
- หน้า lecturer ต้อง fetch application data และรวม loading/error ของ people + applications ทุก role
- mutation status ต้องอนุญาตเฉพาะ staff ตาม server policy; lecturer viewควร read-onlyถ้า requirement ไม่ให้ตัดสิน

เกณฑ์ผ่าน: staff, lecturer และ student เปิดจาก browser ใหม่แล้วเห็นเฉพาะข้อมูล DB ตามสิทธิ์ ไม่มีชื่อ/รายการ hard-code

### Phase 3 — รวม placement workflow ให้เหลือ source เดียว

- ใช้ `StudentApplication` + `PlacementRequest` จาก DB เป็น modelหลักตาม schemaปัจจุบัน
- ให้การยืนยัน application และการสร้าง placement request เป็น transaction serverเดียว (ของเดิมทำส่วนนี้แล้ว ให้ clientใช้ responseแทน local `submit`)
- เพิ่ม server action สำหรับ cancel/resubmit/edit request หาก workflow ยังต้องรองรับ; บันทึก status history และตรวจ optimistic concurrency/status transition
- หลัง upload/review ให้ endpointคืน `PlacementRequestPreview` ล่าสุด แล้ว replace cacheจาก response
- ลบ `previewRequestsSeed` และ cross-composable local sync
- ย้าย `PlacementStatus`/metadata ที่ยังอยู่ใน `useStudentPlacements` ไป `shared`
- เปลี่ยน dashboard/`StudentPlacementProgress` ให้ใช้ persisted preview โดยตรง
- เมื่อไม่มี caller ให้ลบ `useStudentPlacements.ts` และ tests ของ behaviorเก่าที่ถูกแทนด้วย server contract tests
- ปิดหรือลบ `/api/mock-documents`; ถ้าต้องเก็บสำหรับ `/dev/ui` ให้ guard `import.meta.dev` และแยก route dev-only

เกณฑ์ผ่าน: เปิดสอง browser/session แล้ว mutation จาก sessionหนึ่งสะท้อนอีก sessionหลัง refresh; restart serverแล้วข้อมูลไม่หาย; ไม่มี runtime URL `/api/mock-documents`

### Phase 4 — Supervision groups, schedules และ expenses

- เปลี่ยน main grouping page ไม่ให้ render prototype data
- ใช้ persisted company/group/lecturer response แม้ response ว่าง
- `groups/new.vue` ต้องเรียก persisted create endpoint ไม่ใช้ `createGroup()` local
- local grouping previewทำได้เฉพาะ pure calculation ก่อน submit แต่ inputต้องมาจาก DB และผลที่ถือว่าสำเร็จต้องเป็น server response
- เอา dev fallback ใน `SupervisionGroupingAssistant` ออก; errorต้องแสดง error
- เพิ่ม mutation endpointsที่ workflowต้องใช้แต่ยังไม่มี เช่นแก้สมาชิกบริษัทในกลุ่ม/ย้ายบริษัท/ลบหรือยกเลิกกลุ่ม โดยมี confirmation และตรวจ conflict ใน transaction
- schedule date/time ต้องใช้ ISO values จาก form/backend ไม่ใช้ `scheduleSlots` ภาษาไทย hard-code
- ระยะทางต้องระบุ source: manual input หรือ routing provider; ห้ามคำนวณ `จำนวนบริษัท * 42 + 18`
- นัดนิเทศใช้ create/update endpoints และ serverตรวจ company/group/student/lecturer membership, duplicate slot และ status transition
- expense คำนวณด้วย shared pure function แต่บันทึกผ่าน backendเท่านั้น; ลบ `useExpenseRecords` เมื่อยืนยันว่าไม่มี caller
- หลังทุก mutation ให้ refresh/replace group, appointment และ expense caches จาก server response

เกณฑ์ผ่าน: DB ว่างแสดง empty state, จัดกลุ่ม→มอบหมาย→นัด→ค่าใช้จ่ายครบโดยไม่มี seed และ refresh/restartไม่เปลี่ยนผล

### Phase 5 — Evaluations และ dashboards

Evaluations:

- store เริ่มว่างและลบ evaluation seeds
- load persisted evaluation bundle ก่อน render/editทุกครั้ง
- ให้ PUT คืน saved DTO และ update cacheจาก response ไม่เรียก local save/submit เพื่อสร้างข้อมูลซ้ำ
- dashboard aggregate ต้องมาจาก server query ไม่อ่าน evaluation storeที่อาจโหลดไม่ครบ

Dashboards:

- แทน `currentLecturerId = 'L0012'` ด้วย session user idฝั่ง server
- เพิ่ม `GET /api/lecturer/dashboard?cycleId=...` ที่ scope นัดและงานประเมินตาม authenticated lecturer
- student dashboard ใช้ endpointปัจจุบันได้ แต่ cycle metadataต้องมาจาก Phase 1
- staff dashboard ห้าม fallback client seedเมื่อ request fail; เก็บ stale persisted responseได้ถ้าระบุ stale stateชัด แต่ห้ามสร้างตัวเลขจาก demo
- dashboard pageต้องมี loading/errorแยกตาม role และ refresh requestจริง

เกณฑ์ผ่าน: ตัวเลข dashboardตรวจย้อนกลับเป็น query/recordsใน DB ได้ และเปลี่ยนตาม accountจริง

### Phase 6 — Calendar และ notifications

Calendar:

- เพิ่ม shared calendar input/response schemas
- เพิ่ม `GET/POST/PATCH/DELETE /api/calendar/events` โดย scope `ownerAccountId` จาก session ไม่รับ ownerจาก client
- merge custom eventsจาก DBกับ system eventsที่ deriveจาก cycles/appointments/documents/evaluations
- แก้การโหลด contextสำหรับ lecturer/student ไม่ให้เรียก staff-only group endpoint; appointment DTOควรมี display contextเพียงพอหรือมี role-scoped context endpoint
- remove swallowed error; ถ้า system eventโหลดไม่ได้ต้องแสดง partial/error stateชัดเจน

Notifications:

- store เริ่มว่างและลบ `notificationsSeed`
- role/recipient มาจาก authenticated session ไม่ใช่ scenario role
- ทำ event coverage matrix: application accepted/rejected, placement submitted/document/reviewed, group assigned, appointment publish/change/cancel, evaluation due/submitted ตาม requirement
- กำหนด pagination/polling behavior และ cleanup timer; พิจารณา refreshเมื่อ focusเหมือนของเดิม

เกณฑ์ผ่าน: custom eventและ read statusคงอยู่หลัง refresh/relogin; accountอื่นเข้าถึงไม่ได้; notificationไม่มีรายการ seedแทรกก่อนโหลด

### Phase 7 — แยก development tooling และล้างของเก่า

- ให้ `ScenarioPanel` จำลองเฉพาะ presentation stateโดยไม่ reset/เติม domain stores
- ย้าย fixture ของ `/dev/ui` ไปไฟล์ dev/testเฉพาะถ้าต้อง reuse
- เปลี่ยนชื่อ `useAuthPrototype` และ middleware `*-prototype` หลัง behaviorจริงนิ่ง เพื่อสะท้อนหน้าที่จริง
- ลบ unused mock utilities, local mutators, stale types และ testsที่ทดสอบ implementationเก่า
- อัปเดต `README.md`, `dosc/architecture.md` และ AGENTS scope จาก UI-first/MySQL ที่ล้าสมัยให้ตรง PostgreSQL backendปัจจุบัน
- เพิ่ม CI gate: lint, typecheck, test, build และ Prisma validate

เกณฑ์ผ่าน: `rg -i "mock|demo|prototype|seed" app server` เหลือเฉพาะ test/dev toolingหรือข้อความที่ตั้งใจไว้และได้รับการ review

## 7. ลำดับ pull request ที่แนะนำ

เพื่อให้ diff ตรวจง่ายและ rollback ได้ ไม่ควรรวมทั้งหมดในครั้งเดียว:

1. Cycle endpoint + client cycle store
2. People no-seed + person detail/history + import dev fix
3. Lecturer applications + remove application seed
4. Placement request response-driven mutations + remove legacy student placements/mock PDF
5. Supervision grouping page/backend completion
6. Appointment/schedule/expense cleanup
7. Evaluation response-driven store + lecturer dashboard
8. Calendar persistence + notification seed removal
9. Dev tooling isolation + stale documentation/ชื่อ prototype cleanup

แต่ละ PR ต้องเปลี่ยน callersทั้งหมดของ interfaceเก่าภายใน featureเดียวกัน ไม่ควรเพิ่ม adapterใหม่ทับของเก่าเป็นชั้นถาวร

## 8. แผนทดสอบ

### Unit/shared contract

- Zod request/response mapping และ enum mapping
- cycle/status transition, placement transition, evaluation lock, grouping conflicts, expense calculation
- empty response replaces cache; server error never installs fixture

### Server route tests

- unauthenticated `401`, wrong role `403`, invalid payload `400`
- ownership/assignment scope: studentคนอื่น, lecturerที่ไม่ได้รับมอบหมาย, staff action
- transaction atomicity: application confirmation→request, document version, grouping assignment, appointment publish, notification/audit
- pagination limits และ deterministic ordering
- missing/deleted/inactive recordsและ concurrent status changes

### PostgreSQL integration

- รัน migrationsบนฐานว่าง
- seedเฉพาะเมื่อ `ALLOW_DEMO_SEED=true`
- ทดสอบ flowกับ DBจริงอย่างน้อย login→application→confirm→request→document→review→group→appointment→evaluation→expense
- ตรวจว่า restart appไม่ทำข้อมูลหายและ empty databaseไม่แสดง client demo

### UI/E2E

- ครบ 3 roles และทุก loading/empty/error/data state
- browser refresh/deep link หลัง mutation
- session expiration และ forbidden routes
- mobile/keyboard/focus โดยเฉพาะ dialogs, uploads และ destructive confirmations
- เปิดสอง sessionsเพื่อตรวจ stale cache/concurrency

### คำสั่งตรวจรับขั้นต่ำ

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm db:validate
pnpm build
```

สำหรับ integration environment เพิ่ม `pnpm db:deploy` และ `ALLOW_DEMO_SEED=true pnpm db:seed` เฉพาะฐานทดสอบที่ระบุชัด ห้าม seed productionโดยปริยาย

## 9. Definition of Done สำหรับ “ใช้ Backend จริงทั้งหมด”

- ไม่มี domain seedใน runtime composables/pages/components
- ทุก domain mutationเรียก authenticated server route และใช้ server response
- refresh browser/restart serverไม่ทำข้อมูลที่บันทึกแล้วหาย
- empty DBแสดง empty state ไม่แสดง demo
- API errorแสดง error/retry ไม่แสดงข้อมูลสมมติเป็น fallback
- role/owner/current userมาจาก session ไม่มี hard-coded account id
- serverตรวจ Zod, role, ownership, state transition และ transactionตามความเสี่ยง
- cycle, calendar และ person/application detailมี persisted read pathsครบ
- mock PDF routeไม่พร้อมใช้ใน production
- database demo seedเปิดใช้ด้วย flagเฉพาะ local/test และไม่มี default production credential
- testsครอบคลุม server interfaceและ happy-path end-to-endของทั้ง 3 roles
- เอกสาร architecture/READMEตรงกับ PostgreSQL backendจริง

## 10. ประเด็นที่ต้องยืนยันก่อน implementation

1. Lecturer ควรเห็น application ของนักศึกษาทั้งหมด เฉพาะกลุ่มที่รับผิดชอบ หรือเฉพาะ cycle/section ที่กำหนด
2. Staff/lecturer มีสิทธิ์แก้ข้อมูลบริษัทและชื่อนักศึกษาได้ระดับใด และการแก้ควรเปลี่ยน master dataหรือ snapshotใน placement
3. ต้องรองรับ draft placement requestเดิมหรือยืนยันใช้ flow `StudentApplication -> completed -> PlacementRequest` อย่างเดียว
4. Cycle management ต้องมี CRUDในรอบนี้หรือ read-onlyจาก seed/admin operationก่อน
5. Calendar system eventsชนิด document/deadline/evaluationต้อง deriveอัตโนมัติจาก recordใดบ้าง
6. Group edit ต้องรองรับย้ายบริษัท ลบกลุ่ม เปลี่ยนรอบ และแก้หลัง publishหรือไม่
7. Distance/expense จะรับค่าจากเจ้าหน้าที่หรือเชื่อม routing providerใด
8. Demo databaseควรครอบคลุม full workflowเพื่อสาธิตหรือเก็บเพียงข้อมูลขั้นต่ำสำหรับ login/smoke test

## 11. บันทึกการเปลี่ยนแปลงของรายงาน

- 12 กันยายน 2569: สร้างรายงาน audit ครั้งแรกจาก source ปัจจุบัน
- 12 กันยายน 2569: ตรวจแผนรอบสุดท้ายด้วยแนวทาง Ponytail และเพิ่ม runbook สำหรับให้ AI agent ลงมือจบใน task เดียว
- การเปลี่ยนแปลงยังจำกัดเฉพาะเอกสาร ไม่มี implementation, schema, migration, seed หรือ test ถูกแก้
