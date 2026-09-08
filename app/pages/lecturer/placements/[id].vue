<script setup lang="ts">
import {
  ArrowLeft,
  Check,
  Download,
  Eye,
  FileCheck2,
  Upload,
} from "@lucide/vue";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuTrigger,
} from "reka-ui";
import { z } from "zod";
import type { PlacementReviewRequest } from "~/composables/useLetterBatches";

definePageMeta({ title: "ดำเนินการคำร้อง", middleware: "letter-workflow", alias: ['/staff/letters/:id'] });

type FormErrorKey = "requestIds" | "letterDate" | "fileName";

interface LetterForm {
  requestIds: string[];
  letterDate: string;
  fileName: string;
  fileSize: number;
}

const publishSchema = z.object({
  requestIds: z.array(z.string()).min(1, "เลือกคำร้องอย่างน้อย 1 รายการ"),
  letterDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "เลือกวันที่ออกหนังสือ"),
  fileName: z
    .string()
    .trim()
    .regex(/\.pdf$/i, "รองรับเฉพาะไฟล์ PDF"),
  fileSize: z
    .number()
    .positive("เลือกไฟล์ PDF")
    .max(10 * 1024 * 1024, "ไฟล์ต้องมีขนาดไม่เกิน 10 MB"),
});

const route = useRoute();
const { scenario, recordEvent } = useScenario();
const { showToast } = useToast();
const {
  requests,
  canIssueLetter,
  getBatch,
  getBatchRequests,
  getCompatibleRequests,
  returnRequest,
  saveLetterBatch,
  returnResponseDocument,
  confirmBatchResults,
} = useLetterBatches();

const requestId = computed(() => String(route.params.id));
const request = computed(
  () => requests.value.find((item) => item.id === requestId.value) ?? null,
);
const batch = computed(() => getBatch(request.value?.batchId ?? null));
const batchRequests = computed(() =>
  batch.value ? getBatchRequests(batch.value.id) : [],
);
const compatibleRequests = computed(() =>
  request.value ? getCompatibleRequests(request.value.id) : [],
);
const previewRequest = ref<PlacementReviewRequest | null>(null);
const previewOpen = computed({
  get: () => previewRequest.value !== null,
  set: (value: boolean) => {
    if (!value) previewRequest.value = null;
  },
});
const returnReason = ref("");
const returnReasonError = ref("");
const responseReason = ref("");
const responseReasonError = ref("");
const resultChoices = ref<Record<string, string>>({});
const resultError = ref("");
const isSubmitting = ref(false);
const letterErrors = ref<Partial<Record<FormErrorKey, string>>>({});
const letterForm = reactive<LetterForm>({
  requestIds: [],
  letterDate: "",
  fileName: "",
  fileSize: 0,
});

const statusMeta = {
  submitted: { label: "รอตรวจคำร้อง", tone: "warning" },
  returned: { label: "ส่งกลับแก้ไข", tone: "danger" },
  waiting_response: { label: "รอเอกสารตอบกลับ", tone: "warning" },
  response_uploaded: { label: "รอตรวจผล", tone: "info" },
  confirmed: { label: "ยืนยันสถานประกอบการ", tone: "success" },
  not_accepted: { label: "ไม่ได้รับการตอบรับ", tone: "danger" },
  cancelled: { label: "ยกเลิก", tone: "neutral" },
} as const;
const companyStatusMeta = {
  active: { label: "ใช้งานอยู่", tone: "success" },
  pending: { label: "รอตรวจสอบข้อมูล", tone: "warning" },
} as const;
const documentStatusMeta = {
  active: { label: "ใช้งานอยู่", tone: "success" },
  returned: { label: "ส่งกลับแก้ไข", tone: "danger" },
  cancelled: { label: "ยกเลิก", tone: "neutral" },
} as const;
const resultOptions = [
  { value: "confirmed", label: "ยืนยันสถานประกอบการ" },
  { value: "not_accepted", label: "ไม่ได้รับการตอบรับ" },
];
const steps = ["ตรวจคำร้อง", "ออกหนังสือ", "รอเอกสารตอบกลับ", "ยืนยันผล"];
const currentStep = computed(() => {
  if (!request.value) return 1;
  if (
    request.value.status === "submitted" ||
    request.value.status === "returned"
  )
    return 1;
  if (request.value.status === "waiting_response") return 3;
  return 4;
});
const relatedRequests = computed<PlacementReviewRequest[]>(() => {
  if (!request.value) return [];
  if (batch.value) return batchRequests.value;
  if (request.value.status === "submitted" && compatibleRequests.value.length)
    return compatibleRequests.value;
  return [request.value];
});
const outgoingDocuments = computed(() =>
  batch.value
    ? [...batch.value.outgoingDocuments].toSorted((a, b) => b.version - a.version)
    : [],
);
const responseDocuments = computed(() =>
  batch.value
    ? [...batch.value.responseDocuments].toSorted((a, b) => b.version - a.version)
    : [],
);
const latestOutgoingDocument = computed(() => outgoingDocuments.value[0]);
const latestResponseDocument = computed(() => responseDocuments.value[0]);

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value.includes("T") ? value : `${value}T00:00:00+07:00`));
const getDocumentDownloadUrl = (fileName: string) =>
  `/api/mock-documents/${encodeURIComponent(fileName)}`;
const recordDocumentDownload = (fileName: string) => {
  showToast({ title: "เริ่มดาวน์โหลดเอกสารแล้ว", description: fileName });
  recordEvent(`ดาวน์โหลดเอกสาร: ${fileName}`);
};
const resetLetterForm = () => {
  const currentBatch = batch.value;
  const candidates = currentBatch
    ? batchRequests.value
    : compatibleRequests.value;
  Object.assign(letterForm, {
    requestIds: candidates.map((item) => item.id),
    letterDate: currentBatch?.letterDate ?? "",
    fileName: "",
    fileSize: 0,
  });
  letterErrors.value = {};
};
const toggleCandidate = (id: string, checked: boolean | "indeterminate") => {
  if (batch.value) return;
  letterForm.requestIds =
    checked === true
      ? [...new Set([...letterForm.requestIds, id])]
      : letterForm.requestIds.filter((item) => item !== id);
  letterErrors.value.requestIds = undefined;
};
const handleFile = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  letterForm.fileName = file?.name ?? "";
  letterForm.fileSize = file?.size ?? 0;
  letterErrors.value.fileName = undefined;
};
const setLetterValidation = (issues: z.core.$ZodIssue[]) => {
  const next: Partial<Record<FormErrorKey, string>> = {};
  issues.forEach((issue) => {
    const key = String(issue.path[0]);
    if (key === "fileSize") next.fileName ??= issue.message;
    else if (
      key === "requestIds" ||
      key === "letterDate" ||
      key === "fileName"
    )
      next[key] ??= issue.message;
  });
  letterErrors.value = next;
};
const waitForMockNetwork = async () => {
  if (scenario.value.networkDelay === "slow")
    await new Promise((resolve) => setTimeout(resolve, 500));
};

const sendBackRequest = () => {
  if (!request.value) return;
  if (!returnReason.value.trim()) {
    returnReasonError.value = "ระบุเหตุผลที่ต้องให้นักศึกษาแก้ไขก่อนส่งกลับ";
    showToast({
      title: "ยังส่งกลับไม่ได้",
      description: "กรุณาระบุเหตุผลที่ต้องให้นักศึกษาแก้ไขก่อน",
    });
    return;
  }
  returnReasonError.value = "";
  try {
    returnRequest(request.value.id, returnReason.value.trim());
    showToast({
      title: "ส่งคำร้องกลับแก้ไขแล้ว",
      description: request.value.studentName,
    });
    recordEvent(`ส่งคำร้องกลับแก้ไข: ${request.value.id}`);
  } catch (error) {
    showToast({
      title: "ดำเนินการไม่สำเร็จ",
      description: error instanceof Error ? error.message : "กรุณาลองใหม่",
    });
  }
};
const submitLetter = async () => {
  if (isSubmitting.value || !canIssueLetter.value) return;
  const result = publishSchema.safeParse(letterForm);
  if (!result.success) {
    setLetterValidation(result.error.issues);
    return;
  }
  isSubmitting.value = true;
  try {
    await waitForMockNetwork();
    const saved = saveLetterBatch({
      requestIds: letterForm.requestIds,
      letterDate: letterForm.letterDate,
      fileName: letterForm.fileName,
    });
    const title = "เผยแพร่หนังสือและยืนยันคำร้องแล้ว";
    showToast({
      title,
      description: `${saved.id} · ${saved.requestIds.length} คำร้อง`,
    });
    recordEvent(`${title}: ${saved.id}`);
  } catch (error) {
    showToast({
      title: "ดำเนินการไม่สำเร็จ",
      description: error instanceof Error ? error.message : "กรุณาลองใหม่",
    });
  } finally {
    isSubmitting.value = false;
  }
};
const sendBackResponse = () => {
  if (!batch.value) return;
  if (!responseReason.value.trim()) {
    responseReasonError.value = "ระบุเหตุผลที่ต้องแก้ไขเอกสารก่อนส่งกลับ";
    showToast({
      title: "ยังส่งเอกสารกลับไม่ได้",
      description: "กรุณาระบุเหตุผลที่ต้องแก้ไขเอกสารก่อน",
    });
    return;
  }
  responseReasonError.value = "";
  try {
    returnResponseDocument(batch.value.id, responseReason.value.trim());
    showToast({
      title: "ส่งเอกสารตอบกลับให้แก้ไขแล้ว",
      description: batch.value.id,
    });
    recordEvent(`ส่งเอกสารตอบกลับให้แก้ไข: ${batch.value.id}`);
  } catch (error) {
    showToast({
      title: "ดำเนินการไม่สำเร็จ",
      description: error instanceof Error ? error.message : "กรุณาลองใหม่",
    });
  }
};
const confirmResults = () => {
  if (!batch.value) return;
  if (batchRequests.value.some((item) => !resultChoices.value[item.id])) {
    resultError.value = "เลือกผลตอบรับของนักศึกษาทุกคน";
    return;
  }
  try {
    confirmBatchResults(
      batch.value.id,
      resultChoices.value as Record<string, "confirmed" | "not_accepted">,
    );
    showToast({ title: "ยืนยันผลรายบุคคลแล้ว", description: batch.value.id });
    recordEvent(`ยืนยันผลคำร้อง: ${batch.value.id}`);
  } catch (error) {
    showToast({
      title: "ดำเนินการไม่สำเร็จ",
      description: error instanceof Error ? error.message : "กรุณาลองใหม่",
    });
  }
};

watch(
  request,
  (value) => {
    if (!value) return;
    useHead({ title: `${value.id} · ดำเนินการคำร้อง` });
    if (value.status === "submitted") resetLetterForm();
    const currentBatch = getBatch(value.batchId);
    resultChoices.value = currentBatch
      ? (Object.fromEntries(
          getBatchRequests(currentBatch.id).map((item) => {
            const result = currentBatch.results[item.id];
            return [item.id, !result || result === "waiting" ? "" : result];
          }),
        ) as Record<string, string>)
      : {};
  },
  { immediate: true },
);
watch(returnReason, () => {
  returnReasonError.value = "";
});
watch(responseReason, () => {
  responseReasonError.value = "";
});
</script>

<template>
  <div>
    <button
      type="button"
      class="mb-4 inline-flex min-h-10 items-center gap-2 rounded-control px-2 text-sm font-semibold text-muted hover:bg-surface hover:text-ink"
      @click="navigateTo(canIssueLetter ? '/staff/letters' : '/lecturer/placements')"
    >
      <ArrowLeft :size="18" />กลับไปรายการคำร้อง
    </button>

    <AppEmptyState
      v-if="!request"
      title="ไม่พบคำร้อง"
      description="คำร้องนี้อาจถูกย้ายหรือไม่มีอยู่ในข้อมูลตัวอย่าง"
      ><UiButton variant="secondary" @click="navigateTo(canIssueLetter ? '/staff/letters' : '/lecturer/placements')"
        >กลับไปรายการ</UiButton
      ></AppEmptyState
    >
    <template v-else>
      <header
        class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div>
          <p class="text-sm font-medium text-warning">{{ request.id }}</p>
          <h2
            class="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl"
          >
            {{ request.studentName }}
          </h2>
          <p class="mt-1 text-sm text-muted">
            {{ request.studentId }} · {{ request.company }}
          </p>
        </div>
        <UiBadge :tone="statusMeta[request.status].tone">{{
          statusMeta[request.status].label
        }}</UiBadge>
      </header>

      <div class="mb-10 overflow-x-auto pb-3">
        <ol
          class="grid min-w-[54rem] grid-cols-4 px-2"
          aria-label="ขั้นตอนดำเนินการคำร้อง"
        >
          <li
            v-for="(step, index) in steps"
            :key="step"
            class="relative flex min-w-0 flex-col items-center text-center"
            :aria-current="index + 1 === currentStep ? 'step' : undefined"
          >
            <span
              v-if="index < steps.length - 1"
              class="absolute top-[18px] left-1/2 h-1 w-full rounded-full"
              :class="index + 1 < currentStep ? 'bg-primary' : 'bg-divider'"
              aria-hidden="true"
            />
            <span
              class="relative z-10 grid size-10 place-items-center rounded-full border-2 text-sm font-bold"
              :class="
                index + 1 === currentStep
                  ? 'border-primary bg-primary text-white'
                  : index + 1 < currentStep
                    ? 'border-primary bg-primary text-white'
                    : 'border-divider bg-canvas text-muted'
              "
            >
              <Check
                v-if="index + 1 < currentStep"
                :size="18"
                aria-hidden="true"
              />
              <span v-else>{{ index + 1 }}</span>
            </span>
            <span
              class="mt-3 whitespace-nowrap text-sm font-semibold"
              :class="
                index + 1 === currentStep
                  ? 'text-ink'
                  : index + 1 < currentStep
                    ? 'text-primary'
                    : 'text-muted'
              "
              >{{ step }}</span
            >
          </li>
        </ol>
      </div>

      <div class="mb-6 grid gap-6 xl:grid-cols-2">
        <UiCard>
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 class="text-lg font-bold text-ink">ข้อมูลคำร้องและสถานประกอบการ</h3>
              <p class="mt-1 text-sm text-muted">ข้อมูลหลักของนักศึกษาและสถานที่ปฏิบัติงาน</p>
            </div>
            <UiBadge :tone="companyStatusMeta[request.companyStatus].tone">
              {{ companyStatusMeta[request.companyStatus].label }}
            </UiBadge>
          </div>
          <dl class="mt-5 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt class="text-xs text-muted">นักศึกษา</dt>
              <dd class="mt-1 font-semibold text-ink">{{ request.studentName }}</dd>
              <dd class="mt-0.5 text-xs text-muted">{{ request.studentId }}</dd>
            </div>
            <div>
              <dt class="text-xs text-muted">ตำแหน่งฝึกงาน</dt>
              <dd class="mt-1 font-semibold text-ink">{{ request.position }}</dd>
            </div>
            <div>
              <dt class="text-xs text-muted">วันที่ยื่นคำร้อง</dt>
              <dd class="mt-1 text-ink">{{ formatDate(request.submittedAt) }}</dd>
            </div>
            <div>
              <dt class="text-xs text-muted">สาขา</dt>
              <dd class="mt-1 text-ink">{{ request.branch }}</dd>
            </div>
            <div class="sm:col-span-2">
              <dt class="text-xs text-muted">สถานประกอบการ</dt>
              <dd class="mt-1 font-semibold text-ink">{{ request.company }}</dd>
            </div>
            <div class="sm:col-span-2">
              <dt class="text-xs text-muted">ที่อยู่สถานประกอบการ</dt>
              <dd class="mt-1 leading-6 text-ink">{{ request.companyAddress }}</dd>
            </div>
          </dl>
        </UiCard>

        <UiCard>
          <h3 class="text-lg font-bold text-ink">ข้อมูลสำหรับออกหนังสือ</h3>
          <p class="mt-1 text-sm text-muted">ข้อมูลผู้รับและที่อยู่ที่ใช้ในหนังสือขอฝึกงาน</p>
          <dl class="mt-5 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt class="text-xs text-muted">เรียน / ผู้รับหนังสือ</dt>
              <dd class="mt-1 font-semibold text-ink">{{ request.recipientName }}</dd>
            </div>
            <div>
              <dt class="text-xs text-muted">ตำแหน่งหรือหน่วยงาน</dt>
              <dd class="mt-1 text-ink">{{ request.recipientRole }}</dd>
            </div>
            <div class="sm:col-span-2">
              <dt class="text-xs text-muted">ที่อยู่สำหรับออกหนังสือ</dt>
              <dd class="mt-1 leading-6 text-ink">{{ request.letterAddress }}</dd>
            </div>
          </dl>
        </UiCard>
      </div>

      <UiCard class="mb-6">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 class="text-lg font-bold text-ink">
              {{ request.status === "submitted" ? "ผู้ร่วมชุดหนังสือที่ข้อมูลตรงกัน" : batch ? "รายชื่อนักศึกษาในชุดหนังสือ" : "นักศึกษาในคำร้องนี้" }}
            </h3>
            <p class="mt-1 text-sm leading-6 text-muted">
              {{ request.status === "submitted" ? "ระบบเลือกรายชื่อที่สถานประกอบการ สาขา ผู้รับ และที่อยู่ออกหนังสือตรงกันไว้ให้แล้ว" : "แสดงรายชื่อทุกคนรวมนักศึกษาของคำร้องที่กำลังเปิดอยู่" }}
            </p>
          </div>
          <UiBadge tone="info">
            {{ request.status === "submitted" ? `เลือกแล้ว ${letterForm.requestIds.length} คน` : `ทั้งหมด ${relatedRequests.length} คน` }}
          </UiBadge>
        </div>
        <div class="mt-5 overflow-x-auto rounded-control border border-divider">
          <table class="w-full min-w-[1180px] border-collapse text-left text-sm">
            <caption class="sr-only">รายชื่อนักศึกษาที่เกี่ยวข้องกับคำร้องและชุดหนังสือ</caption>
            <thead class="bg-surface text-xs font-semibold tracking-wide text-muted uppercase">
              <tr>
                <th v-if="request.status === 'submitted'" scope="col" class="w-14 px-4 py-3">เลือก</th>
                <th scope="col" class="px-4 py-3">นักศึกษา</th>
                <th scope="col" class="px-4 py-3">ตำแหน่งฝึกงาน</th>
                <th scope="col" class="px-4 py-3">รหัสคำร้อง</th>
                <th scope="col" class="px-4 py-3">สถานะคำร้อง</th>
                <th scope="col" class="w-52 px-4 py-3">หนังสือขอฝึกงาน</th>
                <th scope="col" class="w-52 px-4 py-3">หนังสือตอบกลับ</th>
                <th scope="col" class="w-16 px-4 py-3 text-right"><span class="sr-only">ดูรายละเอียด</span></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-divider">
              <tr v-for="item in relatedRequests" :key="item.id" class="transition-colors hover:bg-surface/70">
                <td v-if="request.status === 'submitted'" class="px-4 py-3">
                  <UiCheckbox
                    :model-value="letterForm.requestIds.includes(item.id)"
                    :label="`เลือก ${item.studentName}`"
                    @update:model-value="toggleCandidate(item.id, $event)"
                  />
                </td>
                <td class="px-4 py-3">
                  <p class="font-semibold text-ink">
                    {{ item.studentName }}
                    <span v-if="item.id === request.id" class="ml-1 text-xs font-medium text-primary">(คำร้องนี้)</span>
                  </p>
                  <p class="mt-0.5 text-xs text-muted">{{ item.studentId }}</p>
                </td>
                <td class="px-4 py-3 text-ink">{{ item.position }}</td>
                <td class="whitespace-nowrap px-4 py-3 text-muted">{{ item.id }}</td>
                <td class="px-4 py-3"><UiBadge :tone="statusMeta[item.status].tone">{{ statusMeta[item.status].label }}</UiBadge></td>
                <td class="px-4 py-3 align-top">
                  <div v-if="latestOutgoingDocument" class="flex items-center gap-2.5">
                    <DropdownMenuRoot v-if="outgoingDocuments.length > 1">
                      <DropdownMenuTrigger
                        class="inline-grid size-9 shrink-0 place-items-center rounded-control border border-divider bg-canvas text-ink transition-colors hover:border-primary hover:text-primary"
                        aria-label="เลือกเวอร์ชันหนังสือขอฝึกงานเพื่อดาวน์โหลด"
                        title="เลือกเวอร์ชันเพื่อดาวน์โหลด"
                      >
                        <Download :size="16" aria-hidden="true" />
                      </DropdownMenuTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuContent
                          :side-offset="6"
                          align="end"
                          class="z-50 min-w-64 rounded-panel border border-divider bg-canvas p-2 shadow-xl"
                        >
                          <DropdownMenuLabel class="px-3 py-2 text-xs font-semibold text-muted">
                            หนังสือขอฝึกงาน
                          </DropdownMenuLabel>
                          <DropdownMenuItem
                            v-for="file in outgoingDocuments"
                            :key="`outgoing-menu-${file.version}`"
                            as-child
                          >
                            <a
                              :href="getDocumentDownloadUrl(file.fileName)"
                              :download="file.fileName"
                              class="flex cursor-pointer items-center justify-between gap-4 rounded-control px-3 py-2 text-sm text-ink outline-none data-[highlighted]:bg-surface"
                              @click="recordDocumentDownload(file.fileName)"
                            >
                              <span>เวอร์ชัน {{ file.version }}</span>
                              <span class="text-xs text-muted">{{ documentStatusMeta[file.status].label }}</span>
                            </a>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenuPortal>
                    </DropdownMenuRoot>
                    <a
                      v-else
                      :href="getDocumentDownloadUrl(latestOutgoingDocument.fileName)"
                      :download="latestOutgoingDocument.fileName"
                      class="inline-grid size-9 shrink-0 place-items-center rounded-control border border-divider bg-canvas text-ink transition-colors hover:border-primary hover:text-primary"
                      :aria-label="`ดาวน์โหลด ${latestOutgoingDocument.fileName}`"
                      :title="latestOutgoingDocument.fileName"
                      @click="recordDocumentDownload(latestOutgoingDocument.fileName)"
                    >
                      <Download :size="16" aria-hidden="true" />
                    </a>
                    <div class="min-w-0">
                      <p class="truncate font-semibold text-ink">
                        {{ documentStatusMeta[latestOutgoingDocument.status].label }}
                      </p>
                      <p class="mt-0.5 whitespace-nowrap text-xs text-muted">
                        v{{ latestOutgoingDocument.version }}
                        <span v-if="outgoingDocuments.length > 1"> · อีก {{ outgoingDocuments.length - 1 }} เวอร์ชัน</span>
                      </p>
                    </div>
                  </div>
                  <span v-else class="text-sm text-muted">ยังไม่มีเอกสาร</span>
                </td>
                <td class="px-4 py-3 align-top">
                  <div v-if="latestResponseDocument" class="flex items-start gap-2.5">
                    <DropdownMenuRoot v-if="responseDocuments.length > 1">
                      <DropdownMenuTrigger
                        class="inline-grid size-9 shrink-0 place-items-center rounded-control border border-divider bg-canvas text-ink transition-colors hover:border-primary hover:text-primary"
                        aria-label="เลือกเวอร์ชันหนังสือตอบกลับเพื่อดาวน์โหลด"
                        title="เลือกเวอร์ชันเพื่อดาวน์โหลด"
                      >
                        <Download :size="16" aria-hidden="true" />
                      </DropdownMenuTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuContent
                          :side-offset="6"
                          align="end"
                          class="z-50 min-w-64 rounded-panel border border-divider bg-canvas p-2 shadow-xl"
                        >
                          <DropdownMenuLabel class="px-3 py-2 text-xs font-semibold text-muted">
                            หนังสือตอบกลับ
                          </DropdownMenuLabel>
                          <DropdownMenuItem
                            v-for="file in responseDocuments"
                            :key="`response-menu-${file.version}`"
                            as-child
                          >
                            <a
                              :href="getDocumentDownloadUrl(file.fileName)"
                              :download="file.fileName"
                              class="flex cursor-pointer items-center justify-between gap-4 rounded-control px-3 py-2 text-sm text-ink outline-none data-[highlighted]:bg-surface"
                              @click="recordDocumentDownload(file.fileName)"
                            >
                              <span>เวอร์ชัน {{ file.version }}</span>
                              <span class="text-xs text-muted">{{ documentStatusMeta[file.status].label }}</span>
                            </a>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenuPortal>
                    </DropdownMenuRoot>
                    <a
                      v-else
                      :href="getDocumentDownloadUrl(latestResponseDocument.fileName)"
                      :download="latestResponseDocument.fileName"
                      class="inline-grid size-9 shrink-0 place-items-center rounded-control border border-divider bg-canvas text-ink transition-colors hover:border-primary hover:text-primary"
                      :aria-label="`ดาวน์โหลด ${latestResponseDocument.fileName}`"
                      :title="latestResponseDocument.fileName"
                      @click="recordDocumentDownload(latestResponseDocument.fileName)"
                    >
                      <Download :size="16" aria-hidden="true" />
                    </a>
                    <div class="min-w-0">
                      <p class="truncate font-semibold text-ink">
                        {{ documentStatusMeta[latestResponseDocument.status].label }}
                      </p>
                      <p class="mt-0.5 whitespace-nowrap text-xs text-muted">
                        v{{ latestResponseDocument.version }}
                        <span v-if="responseDocuments.length > 1"> · อีก {{ responseDocuments.length - 1 }} เวอร์ชัน</span>
                      </p>
                    </div>
                  </div>
                  <span v-else class="text-sm text-muted">ยังไม่มีเอกสาร</span>
                </td>
                <td class="px-4 py-3 text-right">
                  <button
                    type="button"
                    class="inline-grid size-8 place-items-center rounded-md text-muted transition-colors hover:bg-surface hover:text-ink"
                    :aria-label="`ดูรายละเอียดคำร้องของ ${item.studentName}`"
                    title="ดูรายละเอียด"
                    @click="previewRequest = item"
                  >
                    <Eye :size="16" aria-hidden="true" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="letterErrors.requestIds" class="mt-2 text-xs font-medium text-danger">{{ letterErrors.requestIds }}</p>
      </UiCard>

      <template v-if="request.status === 'submitted'">
        <div class="space-y-6">
          <UiAlert v-if="!canIssueLetter" tone="info" title="รอเจ้าหน้าที่ออกหนังสือ">เฉพาะเจ้าหน้าที่เท่านั้นที่จัดชุดและเผยแพร่หนังสือขอความอนุเคราะห์ได้</UiAlert>
          <UiCard v-if="canIssueLetter" class="min-w-0 self-start">
              <h3 class="text-lg font-bold text-ink">แนบหนังสือและยืนยันคำร้อง</h3>
              <p class="mt-1 text-sm leading-6 text-muted">
                เมื่อเผยแพร่ PDF คำร้องที่เลือกจะได้รับการยืนยันและเข้าสู่ขั้นรอเอกสารตอบกลับ
              </p>
              <div class="mt-5 space-y-5">
                <div class="min-w-0 [&>p]:break-words">
                  <UiInput
                    v-model="letterForm.letterDate"
                    type="date"
                    label="วันที่ออกหนังสือ"
                    input-class="min-w-0"
                    :error="letterErrors.letterDate"
                  />
                </div>
                <div>
                  <label
                    for="placement-letter-pdf"
                    class="block text-sm font-semibold text-ink"
                    >ไฟล์หนังสือขอฝึกงาน PDF</label
                  >
                  <label
                    for="placement-letter-pdf"
                    class="mt-1.5 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-control border bg-canvas px-4 text-sm font-semibold text-ink transition-colors hover:bg-surface"
                    :class="
                      letterErrors.fileName ? 'border-danger' : 'border-divider'
                    "
                  >
                    <Upload :size="17" aria-hidden="true" />
                    เลือกไฟล์ PDF
                  </label>
                  <p class="mt-2 break-all text-sm text-muted">
                    {{ letterForm.fileName || "ยังไม่ได้เลือกไฟล์" }} · ขนาดไม่เกิน 10 MB
                  </p>
                  <input
                    id="placement-letter-pdf"
                    type="file"
                    accept="application/pdf,.pdf"
                    class="sr-only"
                    @change="handleFile"
                  >
                  <p
                    v-if="letterErrors.fileName"
                    class="mt-1.5 text-xs font-medium text-danger"
                  >
                    {{ letterErrors.fileName }}
                  </p>
                </div>
              </div>
          </UiCard>

          <UiCard v-if="request.status === 'submitted'">
            <UiTextarea
              v-model="returnReason"
              label="เหตุผลส่งกลับแก้ไข"
              placeholder="ระบุเมื่อข้อมูลคำร้องไม่ถูกต้อง"
              :error="returnReasonError"
            />
          </UiCard>

          <div
            class="flex flex-col-reverse gap-2 rounded-panel border border-divider bg-canvas/95 p-3 shadow-xl backdrop-blur sm:sticky sm:bottom-3 sm:z-10 sm:flex-row sm:items-center sm:justify-end"
          >
            <UiButton
              v-if="request.status === 'submitted'"
              variant="ghost"
              :disabled="isSubmitting"
              @click="sendBackRequest"
              >ส่งกลับแก้ไข</UiButton
            >
            <UiButton
              v-if="canIssueLetter"
              :icon="FileCheck2"
              :loading="isSubmitting"
              @click="submitLetter"
              >เผยแพร่ PDF และยืนยันคำร้องที่เลือก</UiButton
            >
          </div>
        </div>
      </template>

      <template v-else-if="request.status === 'waiting_response' && batch">
        <div class="space-y-6">
          <UiAlert tone="info" title="กำลังรอเอกสารตอบกลับ"
              >นักศึกษาในชุดสามารถดาวน์โหลดหนังสือและอัปโหลด PDF
              ตอบกลับจากสถานประกอบการได้</UiAlert
            >
        </div>
      </template>

      <template v-else-if="request.status === 'response_uploaded' && batch">
        <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div class="space-y-6">
            <UiCard
              ><h3 class="text-lg font-bold text-ink">ผลตอบรับรายบุคคล</h3>
              <div class="mt-5 space-y-4">
                <div
                  v-for="item in batchRequests"
                  :key="item.id"
                  class="grid gap-2 rounded-control border border-divider p-4 sm:grid-cols-[1fr_14rem] sm:items-center"
                >
                  <div>
                    <p class="text-sm font-semibold text-ink">
                      {{ item.studentName }}
                    </p>
                    <p class="text-xs text-muted">
                      {{ item.studentId }} · {{ item.position }}
                    </p>
                  </div>
                  <UiSelect
                    :model-value="resultChoices[item.id] ?? ''"
                    :options="resultOptions"
                    :label="`ผลตอบรับของ ${item.studentName}`"
                    :label-visible="false"
                    placeholder="เลือกผลตอบรับ"
                    @update:model-value="resultChoices[item.id] = $event"
                  />
                </div>
              </div>
              <p
                v-if="resultError"
                class="mt-2 text-xs font-medium text-danger"
              >
                {{ resultError }}
              </p></UiCard
            ><UiCard
              ><UiTextarea
                v-model="responseReason"
                label="เหตุผลส่งเอกสารกลับแก้ไข"
                placeholder="ระบุเมื่อ PDF ตอบกลับไม่ถูกต้อง"
                :error="responseReasonError"
              />
              <div class="mt-4 flex justify-end">
                <UiButton
                  variant="secondary"
                  @click="sendBackResponse"
                  >ส่งเอกสารกลับแก้ไข</UiButton
                >
              </div></UiCard
            >
          </div>
          <aside class="xl:sticky xl:top-6 xl:self-start">
            <UiCard
              ><h3 class="text-lg font-bold text-ink">
                ยืนยันผลชุด {{ batch.id }}
              </h3>
              <p class="mt-2 text-sm leading-6 text-muted">
                เลือกผลของสมาชิกทุกคนก่อนยืนยัน ผลของแต่ละคนสามารถแตกต่างกันได้
              </p>
              <UiButton
                class="mt-5 w-full"
                :icon="Check"
                @click="confirmResults"
                >ยืนยันผลรายบุคคล</UiButton
              ></UiCard
            >
          </aside>
        </div>
      </template>

      <template v-else>
        <UiAlert v-if="request.returnReason" tone="danger" title="เหตุผลที่ส่งคำร้องกลับแก้ไข">
          {{ request.returnReason }}
        </UiAlert>
      </template>

      <UiDialog
        v-model:open="previewOpen"
        title="รายละเอียดคำร้องในชุด"
        :description="
          previewRequest
            ? `${previewRequest.id} · ${previewRequest.studentName}`
            : undefined
        "
      >
        <dl v-if="previewRequest" class="space-y-5 text-sm">
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <dt class="text-xs text-muted">รหัสนักศึกษา</dt>
              <dd class="mt-1 font-semibold text-ink">
                {{ previewRequest.studentId }}
              </dd>
            </div>
            <div>
              <dt class="text-xs text-muted">ตำแหน่งฝึกงาน</dt>
              <dd class="mt-1 text-ink">{{ previewRequest.position }}</dd>
            </div>
          </div>
          <div class="rounded-control border border-divider p-4">
            <dt class="text-xs text-muted">สถานประกอบการและสาขา</dt>
            <dd class="mt-1 font-semibold text-ink">
              {{ previewRequest.company }} · {{ previewRequest.branch }}
            </dd>
            <dt class="mt-4 text-xs text-muted">ที่อยู่สถานประกอบการ</dt>
            <dd class="mt-1 leading-6 text-ink">
              {{ previewRequest.companyAddress }}
            </dd>
          </div>
          <div class="rounded-control border border-divider p-4">
            <dt class="text-xs text-muted">เรียน / ผู้รับหนังสือ</dt>
            <dd class="mt-1 font-semibold text-ink">
              {{ previewRequest.recipientName }}
            </dd>
            <dt class="mt-4 text-xs text-muted">ตำแหน่งหรือหน่วยงาน</dt>
            <dd class="mt-1 text-ink">{{ previewRequest.recipientRole }}</dd>
            <dt class="mt-4 text-xs text-muted">ที่อยู่สำหรับออกหนังสือ</dt>
            <dd class="mt-1 leading-6 text-ink">
              {{ previewRequest.letterAddress }}
            </dd>
          </div>
        </dl>
        <template #cancel><UiButton variant="secondary">ปิด</UiButton></template>
      </UiDialog>
    </template>
  </div>
</template>
