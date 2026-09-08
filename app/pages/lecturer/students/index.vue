<script setup lang="ts">
import { ChevronLeft, ChevronRight, Search } from '@lucide/vue'
import { selectableCoopSemester } from '~/composables/useCoopCycles'
import { getPageCount, paginateItems } from '~/utils/table'

definePageMeta({ title: 'ข้อมูลนักศึกษา', middleware: 'lecturer-prototype' })
useHead({ title: 'ข้อมูลนักศึกษา' })

const { scenario } = useScenario()
const { people } = usePeopleDirectory()
const { cycleCatalog } = useCoopCycles()
const { placements } = useSupervisionGroups()
const { studentCohort, studentSection, studentSemester } = useStudentCohortContext()
const search = ref('')
const pageSize = ref('10')
const currentPage = ref(1)
const effectiveViewState = computed(() => scenario.value.forceError ? 'error' : scenario.value.viewState)
const pageSizeOptions = ['10', '20', '50', '100'].map(value => ({ value, label: value }))
const cycleIdFor = (cycle?: string) => cycleCatalog.find(item => item.label === cycle)?.id

const filteredStudents = computed(() => {
  if (scenario.value.viewState === 'empty') return []
  const keyword = search.value.trim().toLocaleLowerCase('th')
  return people.value
    .filter(person => person.type === 'student')
    .filter(person => studentCohort.value === 'all' || getStudentCohortYear(person.id) === studentCohort.value)
    .filter(person => getStudentSemester(person.cycle) === selectableCoopSemester)
    .filter(person => studentSection.value === 'all' || person.section === studentSection.value)
    .map((person) => {
      const cycleId = cycleIdFor(person.cycle)
      const placement = placements.value.find(item => item.studentId === person.id && item.cycleId === cycleId)
      return {
        id: person.id,
        fullName: getPersonFullName(person),
        section: person.section || 'ยังไม่กำหนด',
        cycle: person.cycle || 'ยังไม่กำหนด',
        company: placement?.company || 'ยังไม่ยืนยัน',
        position: placement?.position || 'ยังไม่ยืนยัน',
      }
    })
    .filter(row => !keyword || [row.fullName, row.section, row.cycle, row.company, row.position]
      .some(value => value.toLocaleLowerCase('th').includes(keyword)))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'th'))
})
const pageSizeNumber = computed(() => Number(pageSize.value))
const pageCount = computed(() => getPageCount(filteredStudents.value.length, pageSizeNumber.value))
const paginatedStudents = computed(() => paginateItems(filteredStudents.value, currentPage.value, pageSizeNumber.value))
const resultStart = computed(() => filteredStudents.value.length ? (currentPage.value - 1) * pageSizeNumber.value + 1 : 0)
const resultEnd = computed(() => Math.min(currentPage.value * pageSizeNumber.value, filteredStudents.value.length))
const hasFilters = computed(() => Boolean(search.value))
watch([search, pageSize, studentCohort, studentSection, studentSemester], () => { currentPage.value = 1 })
const clearFilters = () => { search.value = '' }
const retry = () => { scenario.value.forceError = false; scenario.value.viewState = 'data' }
</script>

<template>
  <div>
    <div class="mb-6"><h2 class="text-2xl font-bold tracking-tight text-ink sm:text-3xl">ข้อมูลนักศึกษา</h2></div>
    <UiCard :padded="false">
      <div class="border-b border-divider p-5 sm:p-6">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <label class="block w-full text-sm font-semibold text-ink sm:max-w-md lg:w-96 lg:flex-none"><span class="sr-only">ค้นหานักศึกษา</span><span class="relative block"><Search :size="18" class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden="true" /><input v-model="search" type="search" class="min-h-11 w-full rounded-control border border-divider bg-canvas pr-3 pl-10 font-normal placeholder:text-gray-400" placeholder="ค้นหาชื่อ สถานประกอบการ หรือตำแหน่งงาน"></span></label>
        </div>
        <div v-if="hasFilters" class="mt-3 flex flex-wrap items-center gap-2 text-sm"><span class="text-muted">ตัวกรองที่ใช้:</span><span class="inline-flex min-h-8 items-center rounded-full bg-surface px-3 text-ink">คำค้น “{{ search }}”</span><button type="button" class="inline-flex min-h-8 items-center rounded-control px-2 font-semibold text-warning hover:bg-warning-soft" @click="clearFilters">ล้างทั้งหมด</button></div>
      </div>
      <div v-if="effectiveViewState === 'loading'" class="space-y-3 p-5 sm:p-6" aria-label="กำลังโหลดข้อมูลนักศึกษา"><div v-for="row in 4" :key="row" class="grid grid-cols-[1fr_1fr_10rem_3rem] gap-4 max-md:grid-cols-[1fr_8rem]"><UiSkeleton class="h-10" /><UiSkeleton class="h-10 max-md:hidden" /><UiSkeleton class="h-10" /><UiSkeleton class="h-10 max-md:hidden" /></div></div>
      <div v-else-if="effectiveViewState === 'error'" class="p-5 sm:p-6"><AppErrorState title="โหลดข้อมูลนักศึกษาไม่สำเร็จ" description="เกิดข้อผิดพลาดชั่วคราว กรุณาลองดึงข้อมูลอีกครั้ง" @retry="retry" /></div>
      <div v-else-if="!paginatedStudents.length" class="p-5 sm:p-6"><AppEmptyState :title="hasFilters ? 'ไม่พบนักศึกษาที่ตรงกับตัวกรอง' : 'ไม่พบนักศึกษาในรุ่นและภาคเรียนที่เลือก'" :description="hasFilters ? 'ลองเปลี่ยนคำค้นหรือล้างตัวกรองที่ใช้อยู่' : 'ลองเปลี่ยนรุ่นนักศึกษาหรือภาคเรียนจากแถบบริบทด้านบน'"><UiButton v-if="hasFilters" variant="secondary" @click="clearFilters">ล้างตัวกรอง</UiButton></AppEmptyState></div>
      <template v-else>
        <div class="hidden overflow-x-auto md:block">
          <table class="w-full min-w-[920px] text-left text-sm">
            <caption class="sr-only">ข้อมูลนักศึกษาสำหรับอาจารย์</caption>
            <thead class="bg-surface text-xs font-semibold tracking-wide text-muted uppercase">
              <tr>
                <th scope="col" class="px-6 py-3">ชื่อ–นามสกุล</th>
                <th scope="col" class="px-4 py-3">หมู่เรียน</th>
                <th scope="col" class="px-4 py-3">ภาคเรียน / ปีการศึกษา</th>
                <th scope="col" class="px-4 py-3">สถานประกอบการที่ยืนยันแล้ว</th>
                <th scope="col" class="px-4 py-3">ตำแหน่งงานที่ยืนยันแล้ว</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-divider">
              <tr v-for="student in paginatedStudents" :key="student.id" class="hover:bg-surface/70">
                <td class="px-6 py-4 font-semibold text-ink">{{ student.fullName }}</td>
                <td class="whitespace-nowrap px-4 py-4 text-ink">{{ student.section }}</td>
                <td class="whitespace-nowrap px-4 py-4 text-ink">{{ student.cycle }}</td>
                <td class="max-w-sm px-4 py-4 text-ink">{{ student.company }}</td>
                <td class="max-w-xs px-4 py-4 text-ink">{{ student.position }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="divide-y divide-divider md:hidden">
          <article v-for="student in paginatedStudents" :key="student.id" class="p-5">
            <h3 class="font-semibold text-ink">{{ student.fullName }}</h3>
            <dl class="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div><dt class="text-xs text-muted">หมู่เรียน</dt><dd class="mt-1 text-ink">{{ student.section }}</dd></div>
              <div><dt class="text-xs text-muted">ภาคเรียน / ปีการศึกษา</dt><dd class="mt-1 text-ink">{{ student.cycle }}</dd></div>
              <div class="col-span-2"><dt class="text-xs text-muted">สถานประกอบการที่ยืนยันแล้ว</dt><dd class="mt-1 text-ink">{{ student.company }}</dd></div>
              <div class="col-span-2"><dt class="text-xs text-muted">ตำแหน่งงานที่ยืนยันแล้ว</dt><dd class="mt-1 text-ink">{{ student.position }}</dd></div>
            </dl>
          </article>
        </div>
        <div class="flex flex-col gap-3 border-t border-divider px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6"><div class="flex items-center gap-3"><p class="whitespace-nowrap text-muted">แสดง {{ resultStart }}–{{ resultEnd }} จาก {{ filteredStudents.length }} รายการ</p><div class="w-20 shrink-0"><UiSelect v-model="pageSize" :options="pageSizeOptions" :placeholder="pageSize" label="จำนวนรายการต่อหน้า" :label-visible="false" /></div></div><nav class="flex items-center gap-2" aria-label="การแบ่งหน้าตาราง"><button type="button" class="inline-grid size-10 place-items-center rounded-control border border-divider text-muted hover:bg-surface disabled:opacity-45" :disabled="currentPage === 1" aria-label="หน้าก่อนหน้า" @click="currentPage--"><ChevronLeft :size="18" aria-hidden="true" /></button><span class="min-w-20 text-center font-semibold text-ink">หน้า {{ currentPage }} / {{ pageCount }}</span><button type="button" class="inline-grid size-10 place-items-center rounded-control border border-divider text-muted hover:bg-surface disabled:opacity-45" :disabled="currentPage === pageCount" aria-label="หน้าถัดไป" @click="currentPage++"><ChevronRight :size="18" aria-hidden="true" /></button></nav></div>
      </template>
    </UiCard>
  </div>
</template>
