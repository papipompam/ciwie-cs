export const companyScoreColumns = [
  ['workRelevanceScore', 'ลักษณะงานมีความสอดคล้องกับสาขาวิชาและผลลัพธ์การเรียนรู้ของนักศึกษา'],
  ['workChallengeScore', 'ขอบเขต ปริมาณ และระดับความท้าทายของงานมีความเหมาะสม'],
  ['learningOpportunityScore', 'สถานประกอบการเปิดโอกาสให้นักศึกษาเรียนรู้และพัฒนาทักษะวิชาชีพ'],
  ['supervisorReadinessScore', 'ผู้ควบคุมงานมีความพร้อมในการมอบหมายงาน ให้คำแนะนำ และติดตามผล'],
  ['studentSupportScore', 'สถานประกอบการมีระบบดูแล ช่วยเหลือ และให้ข้อเสนอแนะแก่นักศึกษาอย่างเหมาะสม'],
  ['environmentScore', 'สภาพแวดล้อมและบรรยากาศในการทำงานเอื้อต่อการเรียนรู้และการปฏิบัติงาน'],
  ['safetyScore', 'มาตรการด้านความปลอดภัยและสุขอนามัยในการทำงานมีความเหมาะสม'],
  ['resourceReadinessScore', 'อุปกรณ์ เครื่องมือ ระบบงาน และทรัพยากรที่จำเป็นมีความพร้อม'],
  ['allowanceScore', 'สวัสดิการ ค่าตอบแทน หรือเบี้ยเลี้ยงที่จัดให้นักศึกษามีความเหมาะสม'],
  ['transportationScore', 'การเดินทางมายังสถานประกอบการมีความสะดวกและปลอดภัย'],
  ['publicTransportScore', 'มีบริการรถรับส่งหรือสามารถเข้าถึงระบบขนส่งสาธารณะ เช่น รถโดยสารประจำทาง รถไฟฟ้า BTS หรือ MRT ได้สะดวก'],
  ['nearbyAccommodationScore', 'มีที่พักที่ปลอดภัย เหมาะสม และอยู่ในระยะเดินทางสะดวกจากสถานประกอบการ'],
  ['universityCoordinationScore', 'การประสานงานและการสื่อสารกับมหาวิทยาลัยมีความชัดเจนและต่อเนื่อง'],
] as const

interface PersistedCompanyEvaluation {
  [key: string]: unknown
  evaluator: { namePrefix: string, firstName: string, lastName: string }
  appointment: {
    scheduledDate: Date | null
    groupCompany: { companySite: { company: { legalName: string } } }
  }
}

export type CompanyEvaluationExportRow = Record<string, string | number>

export const buildPersistedCompanyEvaluationRows = (evaluations: PersistedCompanyEvaluation[]): CompanyEvaluationExportRow[] => evaluations.map((evaluation) => {
  const scores = companyScoreColumns.map(([key]) => evaluation[key] as number | null)
  const answered = scores.filter((score): score is number => score !== null)
  const average = answered.length ? Number((answered.reduce((sum, score) => sum + score, 0) / answered.length).toFixed(2)) : ''
  const evaluator = evaluation.evaluator
  const { appointment } = evaluation
  return {
    'วันที่นิเทศ': appointment.scheduledDate?.toISOString().slice(0, 10) ?? '',
    'สถานประกอบการ': appointment.groupCompany.companySite.company.legalName,
    'ผู้ประเมิน': `${evaluator.namePrefix}${evaluator.firstName} ${evaluator.lastName}`.trim(),
    'สรุปผลคะแนน (เฉลี่ยเต็ม 5)': average,
    ...Object.fromEntries(companyScoreColumns.map(([key, label]) => [label, (evaluation[key] as number | null) ?? ''])),
  }
})
