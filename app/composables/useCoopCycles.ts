import { coopCyclesResponseSchema, type CoopCycle, type CoopCycleStatus } from '#shared/coop-cycles'
import { requestAwareFetch } from '../utils/requestAwareFetch'

export type { CoopCycle, CoopCycleStatus } from '#shared/coop-cycles'

export type StudentWorkStatus =
  | "not_started"
  | "training"
  | "completed"
  | "terminated";

export const cycleStatusMeta: Record<
  CoopCycleStatus,
  { label: string; tone: "neutral" | "warning" | "info" | "success" }
> = {
  draft: { label: "ฉบับร่าง", tone: "neutral" },
  open: { label: "เปิดยื่นสถานประกอบการ", tone: "success" },
  closed_to_requests: { label: "ปิดรับคำร้องใหม่", tone: "warning" },
  training: { label: "กำลังฝึกงาน", tone: "info" },
  closed: { label: "ปิดรอบ", tone: "neutral" },
};

export const workStatusMeta: Record<
  StudentWorkStatus,
  { label: string; tone: "neutral" | "warning" | "info" | "success" | "danger" }
> = {
  not_started: { label: "ยังไม่เริ่มปฏิบัติงาน", tone: "warning" },
  training: { label: "กำลังปฏิบัติงาน", tone: "info" },
  completed: { label: "ปฏิบัติงานเสร็จแล้ว", tone: "success" },
  terminated: { label: "ยุติการปฏิบัติงาน", tone: "danger" },
};

export const useCoopCycles = () => {
  const cycles = useState<CoopCycle[]>('coop-cycles', () => [])
  const status = useState<'idle' | 'loading' | 'success' | 'error'>('coop-cycles-status', () => 'idle')
  const error = useState<string | null>('coop-cycles-error', () => null)
  const selectedCycleId = useState<string | null>('coop-cycles-selected-id', () => null)
  const refresh = async () => {
    status.value = 'loading'
    error.value = null
    try {
      const response = coopCyclesResponseSchema.parse(await requestAwareFetch('/api/coop-cycles'))
      cycles.value.splice(0, cycles.value.length, ...response.cycles)
      if (!cycles.value.some(cycle => cycle.id === selectedCycleId.value)) {
        selectedCycleId.value = cycles.value.find(cycle => cycle.status === 'open')?.id ?? cycles.value[0]?.id ?? null
      }
      status.value = 'success'
    }
    catch (cause) {
      cycles.value.splice(0)
      selectedCycleId.value = null
      status.value = 'error'
      error.value = cause instanceof Error ? cause.message : 'ไม่สามารถโหลดรอบสหกิจได้'
    }
  }
  if (status.value === 'idle') void refresh()
  const selectedCycle = computed(() => cycles.value.find(cycle => cycle.id === selectedCycleId.value) ?? null)

  return { cycles: cycles.value, cycleCatalog: cycles.value, selectedCycle, status, error, refresh };
};
