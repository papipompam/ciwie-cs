# AI Agent Runbook: ตัด Runtime Demo และใช้ Backend จริงให้จบในรอบเดียว

สถานะ: แผนส่งมอบสำหรับ implementation  
อ้างอิงข้อเท็จจริง: [`demo-data-backend-migration-plan.md`](./demo-data-backend-migration-plan.md)  
แนวทาง: Ponytail full — reuse ก่อน, ลบก่อนเพิ่ม, เพิ่ม interface เฉพาะที่ runtime ต้องใช้จริง

## Objective

ทำให้ domain data ทุกหน้ามาจาก authenticated Nitro endpoints และ PostgreSQL เท่านั้น โดย `useState` เป็น cache/UI state, empty response แสดง empty state, error แสดง error state และไม่มี runtime demo fallback จากนั้นตรวจ lint, typecheck, tests, Prisma และ production build พร้อมหลักฐานส่งมอบ

งานนี้ต้องเสร็จใน task เดียว ใช้ checkpoint ภายใน task แทนการแยก PR และห้ามจบเพียงเพราะ checkpoint หนึ่งผ่าน

## Definition of Done

ครบทุกข้อจึงถือว่างานเสร็จ:

- ไม่มี domain seed/fallback ใน runtime pages, components หรือ composables
- cycle, people, applications, requests/documents, companies, groups, appointments, evaluations, expenses, notifications และ calendar อ่าน/เขียนผ่าน server ตาม UI ที่มีอยู่
- current user/role มาจาก session ไม่มี hard-coded account id
- server error ไม่ fallback เป็น demo และ empty response ล้าง cache เดิม
- refresh/relogin/app restart ไม่ทำข้อมูลที่บันทึกสำเร็จหาย
- `/api/mock-documents` และ legacy in-memory placement flow ไม่มี runtime caller
- database demo seed ยังใช้ได้เฉพาะเมื่อ `ALLOW_DEMO_SEED=true`
- targeted tests และ full gates ผ่าน หรือมี blocker จาก external environment พร้อมคำสั่ง/output ที่พิสูจน์ชัด
- diff ไม่มี generated artifacts, secrets หรือการแก้ user changes ที่ไม่เกี่ยวข้อง

## Scope defaults — ใช้ทันที ไม่รอถาม

ค่าเหล่านี้ปิดคำถามจาก audit เพื่อให้ agent ทำต่อได้ในรอบเดียว:

1. Cycle รอบนี้เป็น read-only: เพิ่ม list endpoint เท่านั้น เพราะยังไม่มีหน้า CRUD รอบสหกิจ
2. Staff เห็น applications ทั้งหมด; lecturer เห็นแบบ read-only ทั้งหมดตามพฤติกรรม UI ปัจจุบัน; student เห็นของตนเอง
3. ใช้ flow เดียวคือ `StudentApplication -> COMPLETED -> PlacementRequest`; ลบ legacy draft placement flow ที่ routes redirect ทิ้งแล้ว
4. Custom calendar รองรับ list/create เท่าที่ UI ปัจจุบันใช้; ยังไม่เพิ่ม edit/delete UI
5. การจัดกลุ่มใช้ endpoints ปัจจุบัน; ตัด controls/fallback ที่บันทึกจริงไม่ได้ แทนการสร้าง speculative group-edit endpoints
6. ระยะทางเป็น manual input จนกว่าจะมี routing provider requirement; ตัดสูตรระยะทางจำลอง
7. Database demo seed คงไว้ขั้นต่ำสำหรับ login/smoke test; ไม่ขยาย full showcase dataset
8. ชื่อไฟล์ `*Prototype*` เปลี่ยนเฉพาะเมื่อจำเป็นต่อการลบ runtime demo; ไม่ทำ rename-only cleanup
9. ไม่เพิ่ม dependency, state library, repository abstraction หรือ factory

## Guardrails

- อ่าน `AGENTS.md` และรายงาน audit ทั้งไฟล์ก่อนแก้
- ตรวจ `git status --short --branch` และ `git diff -- <ทุกไฟล์ที่จะสัมผัส>`; working tree ปัจจุบันมี user changes จำนวนมาก ให้แก้แบบ surgical และรักษาเนื้อหาเหล่านั้น
- ใช้ Composition API + TypeScript, shared Zod schemas และ existing `requestAwareFetch`
- ใช้ Prisma transaction เมื่อ mutation เปลี่ยนหลาย records และสร้าง audit/notification
- destructive UI action ต้องมี confirmation; destructive database commandใช้เฉพาะฐานทดสอบที่ agent สร้างและตรวจชื่อเอง
- ห้ามอ่าน/พิมพ์ค่า `.env.local` หรือไฟล์ secret; ใช้ `.env.example` เป็น contract
- ห้ามใช้ `docker compose down -v`, volume prune หรือ reset database ที่มีอยู่
- ใช้ `apply_patch` แก้ไฟล์ และอย่า format/rewrite ไฟล์ที่ไม่เกี่ยวข้อง

## Work order

### 0. Baseline

1. บันทึก branch/status และรายการไฟล์ dirty
2. รัน baseline:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm db:validate
```

3. ถ้ามี failure เดิม ให้เก็บ command + failure signature แล้วทำงานต่อเมื่อไม่กีดขวาง scope; ห้ามแก้ unrelated failure
4. ค้น runtime demo baseline:

```bash
rg -n -i "mock|demo|fixture|prototype|initial[A-Z]|Seed|import\.meta\.dev|L0012|CYCLE-2569" app server shared
```

Completion criterion: รู้รายการ dirty files, baseline failures และ runtime demo occurrences ทุกจุดก่อน edit แรก

### 1. ทำ cycle ให้เป็น persisted source

ใช้ model `CoopCycle` ที่มีอยู่ ไม่แก้ Prisma schema

- เพิ่ม shared response schema/type สำหรับ fields ที่ `useCoopCycles` และ filters ใช้
- เพิ่ม `GET /api/coop-cycles` สำหรับ authenticated roles ทั้งสาม
- จำกัด query, sort แบบ deterministic และ map Prisma enum ที่ serverจุดเดียว
- เปลี่ยน `useCoopCycles` ให้มี `cycles`, `cycleCatalog`, `selectedCycle`, `status`, `error`, `refresh`; array เริ่มว่าง
- selected cycle id เป็น UI stateได้ แต่ต้อง validateกับ response และเลือก active/latest recordเมื่อค่าเดิมไม่มี
- ลบ hard-coded catalog และ semester restrictionที่ไม่มี server requirement
- Pages ที่ใช้ cycle ต้องรอ loading/empty/errorก่อน dereference; ไม่มี non-null assertion บน array ว่าง

Tests first:

- route rejects no session
- mapping/sort ถูกต้อง
- empty responseทำ storeว่าง
- selected cycle fallback deterministic

Completion criterion: `rg 'CYCLE-256|cycleCatalog: CoopCycle\[\]' app` ไม่พบ domain fixture และทุก cycle selectorใช้ response เดียวกัน

### 2. ตัด people/application seeds และเติม read path ที่ขาด

People:

- ให้ `usePeopleDirectory` เริ่ม `[]`; ลบ `initialPeople`, `applicationHistory`, clone/reset/local CRUD/account/import implementations
- คง interfaceที่มี runtime callerจริง: load, find, persisted create/import/update/account action และ lecturer name update
- หน้า import โหลด persisted people ใน dev และ productionเหมือนกัน
- ทุกหน้าที่ใช้ `findPerson` ต้อง load dataเองหรือรับ dataจาก page-level loader; ห้ามอาศัย storeถูกเติมจากหน้าอื่น

Applications:

- ให้ `useStudentApplications` เริ่ม `[]`; ลบ `initialApplications` และ reset/local-only behavior
- ย้าย staff list routeจาก namespace staffไป shared list route หรือ reuse implementationเดียว โดยอนุญาต staff+lecturer; lecturer read-only, staff mutation policyเดิม
- เปลี่ยน staff/lecturer pageให้ fetch listทุก role และแสดง combined loading/error state
- หน้ารายละเอียดนักศึกษาของ lecturerใช้ persisted applicationsที่ filterด้วย student id แทน static history
- ใช้ responseจาก mutation update cache; errorแล้ว refreshจาก server

Tests first:

- staff/lecturer list authorization และ studentถูกปฏิเสธจาก aggregate list
- lecturerไม่มี mutation controlและ serverไม่ให้ mutationถ้า policyไม่อนุญาต
- empty people/application responsesไม่คืน seed
- person detail/historyมาจาก persisted records

Completion criterion: ไม่มีชื่อบุคคล, application id หรือ `example.ac.th` fixtureใน runtime modules; lecturer view refreshแล้วข้อมูลยังเหมือน DB

### 3. รวม placement workflow และเอกสาร

- ให้ `usePlacementRequestPreview` เริ่ม `[]`; ลบ `previewRequestsSeed`
- confirmation ใช้ persisted responseจาก application status endpoint/placement GET ไม่สร้าง request objectใน client
- upload/review endpointsต้องคืน latest `PlacementRequestPreview`; ถ้าปัจจุบันไม่คืน ให้ปรับ response schema/handler แล้ว replace cache
- ถ้า UI ยังมี cancel request ให้เพิ่ม actionบน existing placement request route, ตรวจ owner/statusที่ server, เขียน status historyใน transaction และคืน DTO; ถ้า UI ไม่มี caller ให้ลบ local cancel method
- ลบ cross-store callsไป `useStudentPlacements` และ `registerConfirmedPlacement`; transaction serverปัจจุบันเป็นผู้สร้าง placement/company links
- ย้าย type/status metadataที่ยังมี callerจาก `useStudentPlacements` ไป `shared/placement-requests.ts`
- เปลี่ยน dashboardและ `StudentPlacementProgress` ให้ใช้ persisted preview
- ลบ `useStudentPlacements.ts` เมื่อ `rg` ยืนยันไม่มี runtime caller; ปรับ/ลบ testsเก่าที่ถูกแทนด้วย server behavior tests
- ลบ `server/utils/mockStudentApplications.ts`
- ลบ mock document routeและทุก URLที่อ้างถึง; document downloadใช้ routeที่ตรวจ session/ownershipและ `readStoredFile`

Tests first:

- confirm applicationสร้าง placement requestครั้งเดียวแม้ retry
- upload/review/cancel transition, ownership, invalid PDF และ concurrent status
- responseหลัง mutationตรงกับ GET
- document downloadตรวจ role/owner

Completion criterion: `rg -n 'useStudentPlacements|mock-documents|previewRequestsSeed|mockStudentApplications' app server` ไม่พบ runtime reference

### 4. ทำ supervision grouping/schedule/expense เป็น backend-only

ใช้ endpoints/schema ปัจจุบันก่อนเพิ่ม routeใหม่

- main `/staff/supervision/groups` ใช้ข้อมูลจาก `loadPersistedGroups`; initial arraysว่าง
- ลบ company/group/student seeds, `demoSeedEnabled` และเงื่อนไขคง seedเมื่อ responseว่าง
- `groups/new.vue` เรียก `persistSuggestedGroups` สำหรับ one-group payload แทน `createGroup()` local
- grouping assistantแสดง empty/errorจาก server; ลบ local fallbackบน error/empty
- ใน `prototype.vue` หรือหน้าที่แทน:
  - ลบ initial companies/lecturers/schedule slots
  - render persisted groups/companies/lecturersเท่านั้น
  - `runGrouping` ใช้ suggest + persist endpointsเดิม
  - scheduleใช้ ISO date + existing period enum
  - ระยะทางรับ manual value; ไม่มีสูตร `count * 42 + 18`
  - controlที่แก้ company membershipแต่ไม่มี endpointต้องถูกถอดจาก UI
- local methodsใน `useSupervisionGroups` เหลือเฉพาะ pure selectors; mutationsใช้ `persist*` และ server response
- company student edit: ใช้ existing lecturer name endpointสำหรับชื่อ; หากตำแหน่งยังแก้ไม่ได้อย่างถูกต้อง ให้ถอด field/actionนั้นจาก UIในรอบนี้ตาม scope defaultแทนการเพิ่ม routeใหม่
- appointmentsใช้ existing create/update endpoints; หลัง mutation refresh/replace cacheจาก response
- ลบ local appointment mutation methodsที่ไม่มี runtime caller
- expensesใช้ `useSupervisionExpenses` เท่านั้น; ลบ unused `useExpenseRecords`

Tests first:

- empty group responseล้าง seed/cache
- suggest/create/lecturer assignment duplicate/conflict และ role checks
- create/update appointment membership, duplicate slot และ status transition
- expense calculation + transaction/audit

Completion criterion: DBว่างทำให้หน้ากลุ่มเป็น empty state; group→lecturer→appointment→expenseยังอยู่หลัง refresh; ไม่มีชื่อบริษัท/อาจารย์/schedule demoใน runtime page

### 5. ตัด evaluation/notification seeds และทำ dashboards จาก session

Evaluations:

- storesเริ่ม `[]`; ลบ student/company evaluation seeds
- ทุก evaluation pageโหลด persisted bundleก่อน render
- PUT endpointsคืน saved DTO; cacheใช้ DTOนั้น ไม่เรียก local writeซ้ำ
- local save/submit functionsที่ไม่มี callerถูกลบ

Notifications:

- storeเริ่ม `[]`; responseว่างแทนด้วย `[]`
- filter recipient/roleจาก session-backed response ไม่ใช้ scenario roleเป็น security/data source
- คง polling/focus refreshถ้ายังมี caller; ไม่สร้าง polling abstractionใหม่

Dashboards:

- staff dashboard errorแสดง error state; ลบ client-derived demo fallback
- student dashboardใช้ persisted requests + persisted cycle
- เพิ่ม `GET /api/lecturer/dashboard?cycleId=...` เฉพาะ aggregateที่หน้าใช้ โดย derive lecturer idจาก session; reuse query/mappingจาก appointment/evaluation modules
- ลบ `currentLecturerId = 'L0012'`; page fetchตาม current session
- dashboardทุก roleมี loading/empty/error/dataชัดเจน

Tests first:

- evaluation read/save/submit lockและ response mapping
- empty notification listไม่มี seed; read ownership
- lecturer A ไม่เห็น/count งานของ lecturer B
- dashboard failureไม่แสดง fallback counts

Completion criterion: dashboard valuesตรวจย้อนกลับถึง DB queryได้และเปลี่ยนตาม logged-in account

### 6. Persist custom calendar และแยก dev tooling

ใช้ `CalendarEvent` modelที่มีอยู่ ไม่เพิ่ม schema

- เพิ่ม shared input/response schemas
- เพิ่ม `GET /api/calendar/events` และ `POST /api/calendar/events`; ownerมาจาก session
- `useRoleCalendar` โหลด custom eventsจาก serverและเพิ่ม eventด้วย server response
- system supervision eventsใช้ appointment `display` payload; ไม่เรียก staff-only group endpointจาก lecturer/student
- errorจาก calendar/appointment loadต้องปรากฏเป็น errorหรือ partial warning ไม่ catch ทิ้ง
- `useScenario` และ `ScenarioPanel` ใช้เพื่อ presentation testingใน devเท่านั้น; ไม่ resetหรือเติม domain stores
- `/dev/ui` เก็บ fixtureได้เพราะ routeมี dev guard
- ไม่ทำ rename `Prototype` ที่ไม่เปลี่ยน behavior

Tests first:

- event owner scope, validation และ ordering
- refresh/reloginยังเห็น custom event
- lecturer/student calendarไม่เรียก staff endpoint
- production buildไม่มี dev-only scenario controls

Completion criterion: custom eventอยู่หลัง refreshและ accountอื่นอ่านไม่ได้; runtime pagesไม่มี domain fallbackจาก scenario

### 7. Dead-code pass และ documentation truth

- ใช้ `rg` หา exports/callersก่อนลบทุก symbol
- ลบ local mutators, clone/reset helpers, stale types และ testsที่ไม่มี runtime interfaceแล้ว
- อัปเดต `README.md` และ `dosc/architecture.md` เฉพาะข้อความที่ยังบอกว่า backendไม่เริ่มหรือใช้ MySQL
- คง database demo seed และ guardเดิม; ตรวจว่า productionไม่มี implicit seed path/default demo login
- ไม่เปลี่ยน formattingทั้งไฟล์เพื่อหลีกเลี่ยง CRLF noise

Completion criterion: source searchเหลือคำว่า demo/mock/prototypeเฉพาะ DB seed, tests, `/dev/ui`, `ScenarioPanel` หรือ commentที่อธิบายสิ่งเหล่านั้นอย่างถูกต้อง

## Verification ladder

รันจากแคบไปกว้างและแก้ root causeก่อนขยับขั้น:

### A. หลังแต่ละ work-order section

```bash
pnpm vitest run <targeted-test-files>
pnpm typecheck
```

เลือก targeted filesตาม moduleที่แก้ ไม่สร้าง test suiteซ้ำเมื่อ existing route testเพิ่ม caseได้

### B. หลังเปลี่ยน shared schema/server route

```bash
pnpm db:validate
pnpm db:generate
pnpm typecheck
```

`db:generate` ใช้เมื่อ Prisma client/schemaเกี่ยวข้องเท่านั้น; งานนี้ไม่ควรต้องแก้ schemaสำหรับ cycle/calendarเพราะ modelsมีแล้ว

### C. Full static/test gate

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm db:validate
pnpm build
docker compose config --quiet
```

ทุกคำสั่งต้อง exit 0 จึงผ่าน ถ้ามี baseline failureเดิมให้แสดง before/after signatureว่าไม่ได้เพิ่ม failure

### D. PostgreSQL integration smoke

ใช้ฐานทดสอบแยกชื่อชัดเจน ห้ามใช้ production/local data databaseเดิม:

1. ตรวจ Docker/PostgreSQL availabilityแบบ read-only
2. สร้าง databaseชั่วคราวชื่อที่มี prefix `ciwie_agent_test_` และ suffixสุ่ม
3. ตรวจชื่อ databaseที่ resolveแล้วขึ้นต้นด้วย prefixนี้ก่อน migrate/seed/drop
4. ตั้ง `DATABASE_URL` และ `DIRECT_URL` เฉพาะ processของคำสั่ง
5. รัน:

```bash
pnpm db:deploy
```

จาก PowerShell ให้เปิด flag เฉพาะ process ปัจจุบันแล้วล้างทันทีหลัง seed:

```powershell
$env:ALLOW_DEMO_SEED = 'true'
pnpm db:seed
Remove-Item Env:ALLOW_DEMO_SEED
```

6. start production buildบน portว่างและ smokeอย่างน้อย:
   - login staff/lecturer/student
   - cycle list
   - people/application listsตาม role
   - placement request/document metadata flowที่ไม่ต้องใช้ข้อมูลจริงของบุคคลภายนอก
   - grouping/appointment/evaluation/expense endpointsตาม seeded recordsที่มี
   - notification read และ calendar create/read
   - unauthorized/wrong-role request
7. หยุด processที่ agentสร้างและ dropเฉพาะ databaseชั่วคราวหลังตรวจชื่อซ้ำ

ถ้า Docker/PostgreSQLใช้ไม่ได้ ให้รายงาน integration smokeว่า `NOT RUN` พร้อม command/errorจริง งานยังส่งได้เมื่อ static/test/build gatesผ่าน แต่ห้ามอ้างว่า integrationผ่าน

### E. Runtime demo audit

```bash
rg -n -i "mock|demo|fixture|prototype|initial[A-Z]|Seed|import\.meta\.dev|L0012|CYCLE-2569|REQ-0269|SA-006" app server shared
rg -n "useState<.*\[\].*>.*structuredClone|mock-|demoSeedEnabled|localDemoPreview" app
```

ตรวจผลทุกรายการด้วยตา: อนุญาตเฉพาะ dev/test toolingที่ถูก guardและไม่มี callerจาก runtime feature

## Stop conditions

หยุดและถามผู้ใช้เฉพาะเมื่อพบข้อใดข้อหนึ่ง:

- ต้องทำ destructive operationกับ database/volumeที่ agentไม่ได้สร้าง
- schema migrationจำเป็นและมี production data compatibilityที่ตัดสินจาก codeไม่ได้
- user changesใน dirty fileขัดกับเป้าหมายโดยตรงจน mergeเชิงความหมายไม่ได้
- credential/serviceภายนอกจำเป็นต่อการผ่าน featureและไม่มี local fallbackที่ถูกต้อง

Failure ของ test, typecheck, lint หรือ build ไม่ใช่ stop condition: วินิจฉัยและแก้ต่อภายใน scope

## Final handoff format

ส่งมอบครั้งเดียวเมื่อ Definition of Doneครบ โดยรายงาน:

1. Outcome: feature domainsที่เปลี่ยนเป็น backend source of truth
2. Files: กลุ่มไฟล์สำคัญและเหตุผล ไม่ dumpทุกชื่อถ้าเป็น mechanical cleanup
3. Removed: runtime seeds/fallback/dead modules/routesที่ลบ
4. Data/schema: migration/seed impact และยืนยันว่า secrets/volumesไม่ถูกแตะ
5. Verification: commandทุกคำสั่ง + PASS/FAIL/NOT RUN และ integration DBชื่อชั่วคราว
6. Residual risk: เฉพาะข้อที่มีหลักฐานและอยู่นอก scope
7. Git: สรุป diffของงาน agentแยกจาก pre-existing user changes

ห้ามสรุปว่า production-ready; ให้ใช้คำว่า “runtime domain data ใช้ backend เป็น source of truth” เมื่อเกณฑ์ข้างต้นผ่าน
