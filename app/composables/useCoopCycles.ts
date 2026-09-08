export type CoopCycleStatus =
  | "draft"
  | "open"
  | "closed_to_requests"
  | "training"
  | "closed";

export type StudentWorkStatus =
  | "not_started"
  | "training"
  | "completed"
  | "terminated";

export interface CoopCycle {
  id: string;
  label: string;
  academicYear: string;
  semester: string;
  cohort: string;
  requestStart: string;
  requestEnd: string;
  trainingStart: string;
  trainingEnd: string;
  status: CoopCycleStatus;
}

const cycleCatalog: CoopCycle[] = [
  {
    id: "CYCLE-2568-2",
    label: "ภาคเรียนที่ 2/2568",
    academicYear: "2568",
    semester: "ภาคเรียนที่ 2",
    cohort: "รุ่น 65",
    requestStart: "2025-08-01",
    requestEnd: "2025-09-30",
    trainingStart: "2025-11-03",
    trainingEnd: "2026-03-06",
    status: "closed",
  },
  {
    id: "CYCLE-2569-2",
    label: "ภาคเรียนที่ 2/2569",
    academicYear: "2569",
    semester: "ภาคเรียนที่ 2",
    cohort: "รุ่น 66",
    requestStart: "2026-08-01",
    requestEnd: "2026-09-30",
    trainingStart: "2026-11-02",
    trainingEnd: "2027-03-05",
    status: "open",
  },
  {
    id: "CYCLE-2569-SUMMER",
    label: "ภาคฤดูร้อน/2569",
    academicYear: "2569",
    semester: "ภาคฤดูร้อน",
    cohort: "รุ่น 66",
    requestStart: "2027-01-04",
    requestEnd: "2027-02-12",
    trainingStart: "2027-03-22",
    trainingEnd: "2027-05-28",
    status: "draft",
  },
  {
    id: "CYCLE-2570-1",
    label: "ภาคเรียนที่ 1/2570",
    academicYear: "2570",
    semester: "ภาคเรียนที่ 1",
    cohort: "รุ่น 66",
    requestStart: "2027-04-01",
    requestEnd: "2027-05-31",
    trainingStart: "2027-06-14",
    trainingEnd: "2027-10-15",
    status: "draft",
  },
  {
    id: "CYCLE-2570-2",
    label: "ภาคเรียนที่ 2/2570",
    academicYear: "2570",
    semester: "ภาคเรียนที่ 2",
    cohort: "รุ่น 67",
    requestStart: "2027-08-02",
    requestEnd: "2027-09-30",
    trainingStart: "2027-11-01",
    trainingEnd: "2028-03-03",
    status: "draft",
  },
];

export const selectableCoopSemester = "ภาคเรียนที่ 2" as const;

export const getSelectableCoopCycles = (cycleList: CoopCycle[]) => cycleList
  .filter(cycle => cycle.semester === selectableCoopSemester);

const cycles = getSelectableCoopCycles(cycleCatalog);

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
  const { scenario } = useScenario();
  const selectedCycle = computed(
    () => cycles.find((cycle) => cycle.label === scenario.value.cycle) ?? cycles[0]!,
  );

  return { cycles, cycleCatalog, selectedCycle };
};
