export type PlacementReviewStatus =
  | "submitted"
  | "returned"
  | "waiting_response"
  | "response_uploaded"
  | "confirmed"
  | "not_accepted"
  | "cancelled";
export type LetterBatchStatus =
  | "waiting_response"
  | "response_uploaded"
  | "completed"
  | "cancelled";
export type IndividualResultStatus = "waiting" | "confirmed" | "not_accepted";

export interface PlacementReviewRequest {
  id: string;
  cycleId: string;
  studentId: string;
  studentName: string;
  company: string;
  branch: string;
  companyStatus: "active" | "pending";
  companyAddress: string;
  position: string;
  submittedAt: string;
  recipientName: string;
  recipientRole: string;
  letterAddress: string;
  status: PlacementReviewStatus;
  batchId: string | null;
  returnReason?: string;
}

export interface LetterDocumentVersion {
  version: number;
  fileName: string;
  uploadedAt: string;
  uploadedBy: string;
  status: "active" | "returned" | "cancelled";
  note?: string;
}

export interface LetterBatch {
  id: string;
  requestIds: string[];
  status: LetterBatchStatus;
  letterDate: string;
  outgoingDocuments: LetterDocumentVersion[];
  responseDocuments: LetterDocumentVersion[];
  results: Record<string, IndividualResultStatus>;
  createdAt: string;
  updatedAt: string;
}

export interface SaveLetterBatchPayload {
  requestIds: string[];
  letterDate: string;
  fileName: string;
}

const studentPrefixes: Record<string, 'นาย' | 'นางสาว'> = {
  '65011212001': 'นางสาว',
  '65011212024': 'นางสาว',
  '65011212008': 'นาย',
  '65011212014': 'นางสาว',
  '65011212021': 'นาย',
  '65011212023': 'นาย',
  '65011212030': 'นางสาว',
  '65011212031': 'นาย',
}

const createRequest = (
  request: Omit<PlacementReviewRequest, "cycleId" | "companyStatus" | "batchId"> &
    Partial<Pick<PlacementReviewRequest, "cycleId" | "companyStatus" | "batchId">>,
): PlacementReviewRequest => ({
  cycleId: "CYCLE-2569-2",
  companyStatus: "active",
  batchId: null,
  ...request,
  studentName: `${studentPrefixes[request.studentId] ?? 'นาย'}${request.studentName}`,
});

const requestsSeed: PlacementReviewRequest[] = [
  createRequest({
    id: "REQ-018",
    studentId: "65011212001",
    studentName: "กานต์พิชชา สุขใจ",
    company: "บริษัท บุรีรัมย์ดิจิทัล จำกัด",
    branch: "สำนักงานใหญ่",
    companyAddress:
      "88 ถนนจิระ ตำบลในเมือง อำเภอเมืองบุรีรัมย์ จังหวัดบุรีรัมย์ 31000",
    position: "Frontend Developer",
    submittedAt: "2026-08-24",
    recipientName: "คุณกิตติศักดิ์ วัฒนกุล",
    recipientRole: "ผู้จัดการฝ่ายทรัพยากรบุคคล",
    letterAddress:
      "บริษัท บุรีรัมย์ดิจิทัล จำกัด 88 ถนนจิระ ตำบลในเมือง อำเภอเมืองบุรีรัมย์ จังหวัดบุรีรัมย์ 31000",
    status: "submitted",
  }),
  createRequest({
    id: "REQ-024",
    studentId: "65011212024",
    studentName: "ชนากานต์ พูนทรัพย์",
    company: "บริษัท บุรีรัมย์ดิจิทัล จำกัด",
    branch: "สำนักงานใหญ่",
    companyAddress:
      "88 ถนนจิระ ตำบลในเมือง อำเภอเมืองบุรีรัมย์ จังหวัดบุรีรัมย์ 31000",
    position: "UX/UI Designer",
    submittedAt: "2026-08-25",
    recipientName: "คุณกิตติศักดิ์ วัฒนกุล",
    recipientRole: "ผู้จัดการฝ่ายทรัพยากรบุคคล",
    letterAddress:
      "บริษัท บุรีรัมย์ดิจิทัล จำกัด 88 ถนนจิระ ตำบลในเมือง อำเภอเมืองบุรีรัมย์ จังหวัดบุรีรัมย์ 31000",
    status: "submitted",
  }),
  createRequest({
    id: "REQ-019",
    studentId: "65011212008",
    studentName: "ธีรภัทร วัฒนะ",
    company: "โรงพยาบาลบุรีรัมย์",
    branch: "สำนักงานใหญ่",
    companyAddress:
      "10 ถนนหน้าสถานี ตำบลในเมือง อำเภอเมืองบุรีรัมย์ จังหวัดบุรีรัมย์ 31000",
    position: "IT Support",
    submittedAt: "2026-08-23",
    recipientName: "คุณสุภาวดี มีสุข",
    recipientRole: "หัวหน้าฝ่ายทรัพยากรบุคคล",
    letterAddress:
      "โรงพยาบาลบุรีรัมย์ 10 ถนนหน้าสถานี ตำบลในเมือง อำเภอเมืองบุรีรัมย์ จังหวัดบุรีรัมย์ 31000",
    status: "submitted",
  }),
  createRequest({
    id: "REQ-020",
    studentId: "65011212014",
    studentName: "ปวีณ์นุช มั่นคง",
    company: "บริษัท อีสานเทค จำกัด",
    branch: "สาขาขอนแก่น",
    companyStatus: "pending",
    companyAddress:
      "155 ถนนศรีจันทร์ ตำบลในเมือง อำเภอเมืองขอนแก่น จังหวัดขอนแก่น 40000",
    position: "UX/UI Designer",
    submittedAt: "2026-08-22",
    recipientName: "คุณศุภชัย พัฒนกิจ",
    recipientRole: "ผู้จัดการทั่วไป",
    letterAddress:
      "บริษัท อีสานเทค จำกัด สาขาขอนแก่น 155 ถนนศรีจันทร์ ตำบลในเมือง อำเภอเมืองขอนแก่น จังหวัดขอนแก่น 40000",
    status: "returned",
    returnReason: "กรุณาตรวจสอบชื่อผู้รับหนังสืออีกครั้ง",
  }),
  createRequest({
    id: "REQ-021",
    studentId: "65011212021",
    studentName: "ณัฐวุฒิ แสงทอง",
    company: "สำนักงานจังหวัดบุรีรัมย์",
    branch: "ศาลากลางจังหวัด",
    companyAddress:
      "ศาลากลางจังหวัดบุรีรัมย์ ถนนจิระ ตำบลเสม็ด อำเภอเมืองบุรีรัมย์ จังหวัดบุรีรัมย์ 31000",
    position: "Data Analyst",
    submittedAt: "2026-08-21",
    recipientName: "หัวหน้าสำนักงานจังหวัดบุรีรัมย์",
    recipientRole: "สำนักงานจังหวัดบุรีรัมย์",
    letterAddress:
      "สำนักงานจังหวัดบุรีรัมย์ ศาลากลางจังหวัดบุรีรัมย์ ถนนจิระ ตำบลเสม็ด อำเภอเมืองบุรีรัมย์ จังหวัดบุรีรัมย์ 31000",
    status: "waiting_response",
    batchId: "LB-001",
  }),
  createRequest({
    id: "REQ-023",
    studentId: "65011212023",
    studentName: "ศุภกร รุ่งเรือง",
    company: "สำนักงานจังหวัดบุรีรัมย์",
    branch: "ศาลากลางจังหวัด",
    companyAddress:
      "ศาลากลางจังหวัดบุรีรัมย์ ถนนจิระ ตำบลเสม็ด อำเภอเมืองบุรีรัมย์ จังหวัดบุรีรัมย์ 31000",
    position: "Web Developer",
    submittedAt: "2026-08-21",
    recipientName: "หัวหน้าสำนักงานจังหวัดบุรีรัมย์",
    recipientRole: "สำนักงานจังหวัดบุรีรัมย์",
    letterAddress:
      "สำนักงานจังหวัดบุรีรัมย์ ศาลากลางจังหวัดบุรีรัมย์ ถนนจิระ ตำบลเสม็ด อำเภอเมืองบุรีรัมย์ จังหวัดบุรีรัมย์ 31000",
    status: "waiting_response",
    batchId: "LB-001",
  }),
  createRequest({
    id: "REQ-030",
    studentId: "65011212030",
    studentName: "นภัสสร มีสุข",
    company: "บริษัท โคราชซอฟต์ จำกัด",
    branch: "สำนักงานใหญ่",
    companyAddress:
      "99 ถนนมิตรภาพ ตำบลในเมือง อำเภอเมืองนครราชสีมา จังหวัดนครราชสีมา 30000",
    position: "Backend Developer",
    submittedAt: "2026-08-18",
    recipientName: "คุณอรทัย พัฒนวงศ์",
    recipientRole: "ผู้จัดการฝ่ายบุคคล",
    letterAddress:
      "บริษัท โคราชซอฟต์ จำกัด 99 ถนนมิตรภาพ ตำบลในเมือง อำเภอเมืองนครราชสีมา จังหวัดนครราชสีมา 30000",
    status: "response_uploaded",
    batchId: "LB-002",
  }),
  createRequest({
    id: "REQ-031",
    studentId: "65011212031",
    studentName: "ธนภัทร ใจดี",
    company: "บริษัท โคราชซอฟต์ จำกัด",
    branch: "สำนักงานใหญ่",
    companyAddress:
      "99 ถนนมิตรภาพ ตำบลในเมือง อำเภอเมืองนครราชสีมา จังหวัดนครราชสีมา 30000",
    position: "Software Tester",
    submittedAt: "2026-08-18",
    recipientName: "คุณอรทัย พัฒนวงศ์",
    recipientRole: "ผู้จัดการฝ่ายบุคคล",
    letterAddress:
      "บริษัท โคราชซอฟต์ จำกัด 99 ถนนมิตรภาพ ตำบลในเมือง อำเภอเมืองนครราชสีมา จังหวัดนครราชสีมา 30000",
    status: "response_uploaded",
    batchId: "LB-002",
  }),
];

const batchesSeed: LetterBatch[] = [
  {
    id: "LB-001",
    requestIds: ["REQ-021", "REQ-023"],
    status: "waiting_response",
    letterDate: "2026-08-25",
    outgoingDocuments: [
      {
        version: 1,
        fileName: "หนังสือขอฝึกงาน-LB-001.pdf",
        uploadedAt: "2026-08-25T10:30:00+07:00",
        uploadedBy: "นางสาวพิมพ์ชนก ใจดี (เจ้าหน้าที่)",
        status: "active",
      },
    ],
    responseDocuments: [],
    results: { "REQ-021": "waiting", "REQ-023": "waiting" },
    createdAt: "2026-08-25T10:30:00+07:00",
    updatedAt: "2026-08-25T10:30:00+07:00",
  },
  {
    id: "LB-002",
    requestIds: ["REQ-030", "REQ-031"],
    status: "response_uploaded",
    letterDate: "2026-08-20",
    outgoingDocuments: [
      {
        version: 1,
        fileName: "หนังสือขอฝึกงาน-LB-002.pdf",
        uploadedAt: "2026-08-20T09:15:00+07:00",
        uploadedBy: "นางสาวพิมพ์ชนก ใจดี (เจ้าหน้าที่)",
        status: "active",
      },
    ],
    responseDocuments: [
      {
        version: 1,
        fileName: "หนังสือตอบกลับ-LB-002.pdf",
        uploadedAt: "2026-08-28T14:20:00+07:00",
        uploadedBy: "นางสาวนภัสสร มีสุข",
        status: "active",
      },
    ],
    results: { "REQ-030": "waiting", "REQ-031": "waiting" },
    createdAt: "2026-08-20T09:15:00+07:00",
    updatedAt: "2026-08-28T14:20:00+07:00",
  },
];

const compatibilityKey = (request: PlacementReviewRequest) =>
  [
    request.company,
    request.branch,
    request.recipientName,
    request.recipientRole,
    request.letterAddress,
  ].join("|");

export const useLetterBatches = () => {
  const { currentAccount } = useAuthPrototype();
  const canIssueLetter = computed(() => currentAccount.value?.role === "staff");
  const requests = useState<PlacementReviewRequest[]>(
    "lecturer-placement-review-workflow-v2",
    () => structuredClone(requestsSeed),
  );
  const batches = useState<LetterBatch[]>("lecturer-letter-batches", () =>
    structuredClone(batchesSeed),
  );

  const getBatch = (batchId: string | null) =>
    batchId
      ? (batches.value.find((batch) => batch.id === batchId) ?? null)
      : null;
  const getBatchRequests = (batchId: string) =>
    requests.value.filter((request) => request.batchId === batchId);
  const getCompatibleRequests = (requestId: string) => {
    const source = requests.value.find((request) => request.id === requestId);
    if (!source || source.status !== "submitted") return [];
    return requests.value.filter(
      (request) =>
        request.status === "submitted" &&
        compatibilityKey(request) === compatibilityKey(source),
    );
  };

  const returnRequest = (requestId: string, reason: string) => {
    const request = requests.value.find((item) => item.id === requestId);
    if (!request || request.status !== "submitted")
      throw new Error("คำร้องนี้ไม่อยู่ในสถานะรอตรวจ");
    request.status = "returned";
    request.returnReason = reason;
  };

  const saveLetterBatch = (payload: SaveLetterBatchPayload) => {
    if (!canIssueLetter.value) throw new Error("เฉพาะเจ้าหน้าที่เท่านั้นที่ออกหนังสือขอความอนุเคราะห์ได้");
    const selected = requests.value.filter((request) =>
      payload.requestIds.includes(request.id),
    );
    if (
      !selected.length ||
      selected.some((request) => request.status !== "submitted")
    )
      throw new Error("มีคำร้องที่ไม่พร้อมจัดชุด");
    if (new Set(selected.map(compatibilityKey)).size !== 1)
      throw new Error("คำร้องที่เลือกมีข้อมูลออกหนังสือไม่ตรงกัน");
    const now = new Date().toISOString();
    const nextNumber =
      Math.max(
        0,
        ...batches.value.map(
          (batch) => Number(batch.id.replace("LB-", "")) || 0,
        ),
      ) + 1;
    const batchId = `LB-${String(nextNumber).padStart(3, "0")}`;
    const batch: LetterBatch = {
      id: batchId,
      requestIds: selected.map((request) => request.id),
      status: "waiting_response",
      letterDate: payload.letterDate,
      outgoingDocuments: [
        {
          version: 1,
          fileName: payload.fileName,
          uploadedAt: now,
          uploadedBy: currentAccount.value!.name,
          status: "active",
        },
      ],
      responseDocuments: [],
      results: Object.fromEntries(
        selected.map((request) => [request.id, "waiting"]),
      ) as Record<string, IndividualResultStatus>,
      createdAt: now,
      updatedAt: now,
    };
    batches.value.unshift(batch);
    selected.forEach((request) => {
      request.batchId = batchId;
      request.status = "waiting_response";
    });
    return batch;
  };

  const returnResponseDocument = (batchId: string, reason: string) => {
    const batch = getBatch(batchId);
    if (!batch || batch.status !== "response_uploaded")
      throw new Error("ไม่มีเอกสารตอบกลับที่รอตรวจ");
    const document = [...batch.responseDocuments]
      .reverse()
      .find((item) => item.status === "active");
    if (document)
      Object.assign(document, { status: "returned" as const, note: reason });
    batch.status = "waiting_response";
    batch.updatedAt = new Date().toISOString();
    getBatchRequests(batchId).forEach((request) => {
      request.status = "waiting_response";
    });
  };

  const confirmBatchResults = (
    batchId: string,
    results: Record<string, Exclude<IndividualResultStatus, "waiting">>,
  ) => {
    const batch = getBatch(batchId);
    if (!batch || batch.status !== "response_uploaded")
      throw new Error("ชุดหนังสือนี้ไม่พร้อมยืนยันผล");
    batch.results = { ...batch.results, ...results };
    batch.status = "completed";
    batch.updatedAt = new Date().toISOString();
    getBatchRequests(batchId).forEach((request) => {
      request.status =
        results[request.id] === "confirmed" ? "confirmed" : "not_accepted";
    });
  };

  return {
    canIssueLetter,
    requests,
    batches,
    getBatch,
    getBatchRequests,
    getCompatibleRequests,
    returnRequest,
    saveLetterBatch,
    returnResponseDocument,
    confirmBatchResults,
  };
};
