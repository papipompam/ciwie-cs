<script setup lang="ts">
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  FileCheck2,
  RotateCcw,
  Search,
  X,
} from "@lucide/vue";
import type { PlacementReviewRequest } from "~/composables/useLetterBatches";
import { getPageCount, paginateItems } from "~/utils/table";

definePageMeta({ title: "ตรวจคำร้อง", middleware: "letter-workflow", alias: ['/staff/letters'] });
useHead({ title: "ตรวจคำร้องและผลตอบกลับ" });

type ViewState = "data" | "loading" | "empty" | "error";
type SortKey = "studentName" | "submittedAt";

const { scenario } = useScenario();
const { requests, canIssueLetter } = useLetterBatches();
const { cycleId } = useSupervisionContext();
const search = ref("");
const status = ref("all");
const companyStatus = ref("all");
const sortKey = ref<SortKey>("submittedAt");
const sortDirection = ref<"asc" | "desc">("desc");
const page = ref(1);
const pageSize = ref("10");

const viewState = computed<ViewState>(() =>
  scenario.value.forceError ? "error" : (scenario.value.viewState as ViewState),
);
const statusOptions = [
  { value: "all", label: "ทุกสถานะ" },
  { value: "submitted", label: "รอตรวจคำร้อง" },
  { value: "returned", label: "ส่งกลับแก้ไข" },
  { value: "waiting_response", label: "รอเอกสารตอบกลับ" },
  { value: "response_uploaded", label: "รอตรวจผล" },
  { value: "confirmed", label: "ยืนยันสถานประกอบการ" },
  { value: "not_accepted", label: "ไม่ได้รับการตอบรับ" },
];
const companyOptions = [
  { value: "all", label: "ทุกสถานประกอบการ" },
  { value: "active", label: "ตรวจสอบแล้ว" },
  { value: "pending", label: "รอตรวจสอบ" },
];
const pageSizeOptions = [
  { value: "10", label: "10" },
  { value: "20", label: "20" },
  { value: "50", label: "50" },
];
const statusMeta = {
  submitted: { label: "รอตรวจคำร้อง", tone: "warning" },
  returned: { label: "ส่งกลับแก้ไข", tone: "danger" },
  waiting_response: { label: "รอเอกสารตอบกลับ", tone: "warning" },
  response_uploaded: { label: "รอตรวจผล", tone: "info" },
  confirmed: { label: "ยืนยันสถานประกอบการ", tone: "success" },
  not_accepted: { label: "ไม่ได้รับการตอบรับ", tone: "danger" },
  cancelled: { label: "ยกเลิก", tone: "neutral" },
} as const;

const filtered = computed(() => {
  if (viewState.value === "empty") return [];
  const keyword = search.value.trim().toLocaleLowerCase();
  return requests.value
    .filter((request) => request.cycleId === cycleId.value)
    .filter(
      (request) =>
        (!keyword ||
          [
            request.id,
            request.studentName,
            request.studentId,
            request.company,
            request.position,
          ].some((value) => value.toLocaleLowerCase().includes(keyword))) &&
        (status.value === "all" || request.status === status.value) &&
        (companyStatus.value === "all" ||
          request.companyStatus === companyStatus.value),
    )
    .sort((a, b) => {
      const comparison =
        sortKey.value === "studentName"
          ? a.studentName.localeCompare(b.studentName, "th")
          : a.submittedAt.localeCompare(b.submittedAt);
      return sortDirection.value === "asc" ? comparison : -comparison;
    });
});
const pageCount = computed(() =>
  getPageCount(filtered.value.length, Number(pageSize.value)),
);
const paginated = computed(() =>
  paginateItems(filtered.value, page.value, Number(pageSize.value)),
);
const hasFilters = computed(
  () =>
    Boolean(search.value) ||
    status.value !== "all" ||
    companyStatus.value !== "all",
);
const formatDate = (value: string) =>
  new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00+07:00`));
const resetFilters = () => {
  search.value = "";
  status.value = "all";
  companyStatus.value = "all";
  sortKey.value = "submittedAt";
  sortDirection.value = "desc";
  page.value = 1;
};
const retry = () => {
  scenario.value.forceError = false;
  scenario.value.viewState = "data";
};
const toggleSort = (key: SortKey) => {
  if (sortKey.value === key)
    sortDirection.value = sortDirection.value === "asc" ? "desc" : "asc";
  else {
    sortKey.value = key;
    sortDirection.value = "asc";
  }
  page.value = 1;
};
const openRequest = (id: string) => navigateTo(`${canIssueLetter.value ? '/staff/letters' : '/lecturer/placements'}/${id}`);
const requestActionLabel = (request: PlacementReviewRequest) => {
  if (request.status === "submitted") return "ตรวจคำร้อง";
  if (request.status === "returned") return "ติดตามการแก้ไข";
  if (request.status === "waiting_response") return "ติดตามหนังสือตอบกลับ";
  if (request.status === "response_uploaded") return "ตรวจหนังสือตอบกลับ";
  return "ดูผลคำร้อง";
};

watch([search, status, companyStatus, pageSize], () => {
  page.value = 1;
});
watch(pageCount, (count) => {
  if (page.value > count) page.value = count;
});
</script>

<template>
  <div>
    <header class="mb-6">
      <h2 class="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
        ตรวจคำร้องและผลตอบกลับ
      </h2>
      <p class="mt-1 text-sm leading-6 text-muted">
        {{ canIssueLetter ? 'จัดชุดและออกหนังสือขอความอนุเคราะห์จากคำร้องเดิม' : 'ตรวจคำร้องและผลตอบกลับ โดยเจ้าหน้าที่เป็นผู้ออกหนังสือเท่านั้น' }}
      </p>
    </header>

    <UiCard :padded="false">
      <div class="border-b border-divider p-5 sm:p-6">
        <div
          class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"
        >
          <label class="block w-full sm:max-w-sm lg:w-96 lg:flex-none"
            ><span class="sr-only">ค้นหาคำร้อง</span
            ><span class="relative block"
              ><Search
                :size="18"
                class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
                aria-hidden="true" /><input
                v-model="search"
                type="search"
                class="min-h-11 w-full rounded-control border border-divider bg-canvas pr-3 pl-10 text-sm placeholder:text-gray-400"
                placeholder="ค้นหารหัส ชื่อ บริษัท หรือตำแหน่ง" ></span
          ></label>
          <div
            class="flex flex-wrap items-center justify-end gap-2 lg:ml-auto lg:flex-nowrap"
          >
            <div class="w-full sm:w-52">
              <UiSelect
                v-model="status"
                :options="statusOptions"
                label="กรองตามสถานะ"
                :label-visible="false"
              />
            </div>
            <div class="w-full sm:w-52">
              <UiSelect
                v-model="companyStatus"
                :options="companyOptions"
                label="กรองสถานประกอบการ"
                :label-visible="false"
              />
            </div>
            <button
              type="button"
              class="inline-grid size-11 shrink-0 place-items-center rounded-control border border-divider bg-canvas text-ink hover:bg-surface"
              aria-label="รีเซ็ตตาราง"
              title="รีเซ็ตตาราง"
              @click="resetFilters"
            >
              <RotateCcw :size="18" />
            </button>
          </div>
        </div>
        <div
          v-if="hasFilters"
          class="mt-3 flex flex-wrap items-center gap-2 text-sm"
        >
          <span class="text-muted">ตัวกรองที่ใช้:</span
          ><span
            v-if="search"
            class="inline-flex min-h-8 items-center rounded-full bg-surface px-3 text-ink"
            >คำค้น “{{ search }}”</span
          ><span
            v-if="status !== 'all'"
            class="inline-flex min-h-8 items-center rounded-full bg-surface px-3 text-ink"
            >{{
              statusOptions.find((option) => option.value === status)?.label
            }}</span
          ><span
            v-if="companyStatus !== 'all'"
            class="inline-flex min-h-8 items-center rounded-full bg-surface px-3 text-ink"
            >{{
              companyOptions.find((option) => option.value === companyStatus)
                ?.label
            }}</span
          ><button
            type="button"
            class="inline-flex min-h-8 items-center gap-1 rounded-control px-2 font-semibold text-warning hover:bg-warning-soft"
            @click="resetFilters"
          >
            <X :size="15" />ล้างทั้งหมด
          </button>
        </div>
      </div>

      <div
        v-if="viewState === 'loading'"
        class="space-y-3 p-5 sm:p-6"
        aria-label="กำลังโหลดคำร้อง"
      >
        <UiSkeleton v-for="row in 5" :key="row" class="h-14" />
      </div>
      <div v-else-if="viewState === 'error'" class="p-5 sm:p-6">
        <AppErrorState
          title="โหลดรายการคำร้องไม่สำเร็จ"
          description="เกิดข้อผิดพลาดชั่วคราว กรุณาลองใหม่อีกครั้ง"
          @retry="retry"
        />
      </div>
      <div v-else-if="!paginated.length" class="p-5 sm:p-6">
        <AppEmptyState
          :title="hasFilters ? 'ไม่พบคำร้องที่ตรงกับตัวกรอง' : 'ยังไม่มีคำร้อง'"
          :description="
            hasFilters
              ? 'ลองเปลี่ยนคำค้นหรือล้างตัวกรอง'
              : 'เมื่อมีนักศึกษาส่งคำร้อง รายการจะปรากฏที่นี่'
          "
          ><UiButton v-if="hasFilters" variant="secondary" @click="resetFilters"
            >ล้างตัวกรอง</UiButton
          ></AppEmptyState
        >
      </div>
      <template v-else>
        <div class="hidden overflow-x-auto md:block">
          <table class="w-full min-w-[980px] border-collapse text-left text-sm">
            <caption class="sr-only">
              รายการตรวจคำร้องและหนังสือขออนุญาต
            </caption>
            <thead
              class="bg-surface text-xs font-semibold tracking-wide text-muted uppercase"
            >
              <tr>
                <th
                  scope="col"
                  class="px-5 py-3 sm:px-6"
                  :aria-sort="
                    sortKey === 'studentName'
                      ? sortDirection === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  "
                >
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 font-semibold hover:text-ink"
                    @click="toggleSort('studentName')"
                  >
                    นักศึกษา
                    <ArrowUp
                      v-if="
                        sortKey === 'studentName' && sortDirection === 'asc'
                      "
                      :size="15"
                    /><ArrowDown
                      v-else-if="sortKey === 'studentName'"
                      :size="15"
                    /><ArrowUpDown v-else :size="15" />
                  </button>
                </th>
                <th scope="col" class="px-4 py-3">สถานประกอบการ / ตำแหน่ง</th>
                <th
                  scope="col"
                  class="px-4 py-3"
                  :aria-sort="
                    sortKey === 'submittedAt'
                      ? sortDirection === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  "
                >
                  <button
                    type="button"
                    class="inline-flex items-center gap-1 font-semibold hover:text-ink"
                    @click="toggleSort('submittedAt')"
                  >
                    วันที่ยื่น
                    <ArrowUp
                      v-if="
                        sortKey === 'submittedAt' && sortDirection === 'asc'
                      "
                      :size="15"
                    /><ArrowDown
                      v-else-if="sortKey === 'submittedAt'"
                      :size="15"
                    /><ArrowUpDown v-else :size="15" />
                  </button>
                </th>
                <th scope="col" class="px-4 py-3">สถานะ</th>
                <th scope="col" class="w-16 px-4 py-3 text-right"><span class="sr-only">การดำเนินการ</span></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-divider">
              <tr
                v-for="request in paginated"
                :key="request.id"
                class="transition-colors hover:bg-surface/70"
              >
                <td class="px-5 py-4 sm:px-6">
                  <p class="font-semibold text-ink">
                    {{ request.studentName }}
                  </p>
                  <p class="mt-1 text-xs text-muted">
                    {{ request.studentId }} · {{ request.id }}
                  </p>
                </td>
                <td class="px-4 py-4">
                  <p class="font-medium text-ink">{{ request.company }}</p>
                  <p class="mt-1 text-xs text-muted">
                    {{ request.branch }} · {{ request.position }}
                  </p>
                </td>
                <td class="whitespace-nowrap px-4 py-4 text-muted">
                  {{ formatDate(request.submittedAt) }}
                </td>
                <td class="px-4 py-4">
                  <UiBadge :tone="statusMeta[request.status].tone">{{
                    statusMeta[request.status].label
                  }}</UiBadge>
                  <p v-if="request.batchId" class="mt-1 text-xs text-muted">
                    {{ request.batchId }}
                  </p>
                </td>
                <td class="px-4 py-4 text-right">
                  <button
                    type="button"
                    class="inline-grid size-9 place-items-center rounded-control border border-divider text-muted transition-colors hover:bg-surface hover:text-ink"
                    :aria-label="`${requestActionLabel(request)} ${request.id}`"
                    :title="requestActionLabel(request)"
                    @click="openRequest(request.id)"
                  ><FileCheck2 :size="16" aria-hidden="true" /></button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="divide-y divide-divider md:hidden">
          <article v-for="request in paginated" :key="request.id" class="p-5">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="font-semibold text-ink">{{ request.studentName }}</p>
                <p class="mt-1 text-xs text-muted">
                  {{ request.id }} · {{ formatDate(request.submittedAt) }}
                </p>
              </div>
              <UiBadge :tone="statusMeta[request.status].tone">{{
                statusMeta[request.status].label
              }}</UiBadge>
            </div>
            <p class="mt-4 font-medium text-ink">{{ request.company }}</p>
            <p class="mt-1 text-sm text-muted">{{ request.position }}</p>
            <button
              type="button"
              class="mt-4 inline-grid size-9 place-items-center rounded-control border border-divider text-muted transition-colors hover:bg-surface hover:text-ink"
              :aria-label="`${requestActionLabel(request)} ${request.id}`"
              :title="requestActionLabel(request)"
              @click="openRequest(request.id)"
            ><FileCheck2 :size="16" aria-hidden="true" /></button>
          </article>
        </div>
        <div
          class="flex flex-col gap-3 border-t border-divider px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6"
        >
          <div class="flex items-center gap-3">
            <p class="whitespace-nowrap text-muted">
              แสดง {{ (page - 1) * Number(pageSize) + 1 }}–{{
                Math.min(page * Number(pageSize), filtered.length)
              }}
              จาก {{ filtered.length }} รายการ
            </p>
            <div class="w-20 shrink-0">
              <UiSelect
                v-model="pageSize"
                :options="pageSizeOptions"
                label="จำนวนรายการต่อหน้า"
                :label-visible="false"
              />
            </div>
          </div>
          <nav class="flex items-center gap-2" aria-label="การแบ่งหน้าตาราง">
            <button
              type="button"
              class="inline-grid size-10 place-items-center rounded-control border border-divider text-muted disabled:opacity-45"
              :disabled="page === 1"
              aria-label="หน้าก่อนหน้า"
              @click="page--"
            >
              <ChevronLeft :size="18" /></button
            ><span class="min-w-16 text-center font-semibold text-ink"
              >{{ page }} / {{ pageCount }}</span
            ><button
              type="button"
              class="inline-grid size-10 place-items-center rounded-control border border-divider text-muted disabled:opacity-45"
              :disabled="page === pageCount"
              aria-label="หน้าถัดไป"
              @click="page++"
            >
              <ChevronRight :size="18" />
            </button>
          </nav>
        </div>
      </template>
    </UiCard>
  </div>
</template>
