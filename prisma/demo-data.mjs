// Deterministic records used by the opt-in development seed.
// Keep these IDs stable so `prisma db seed` remains safe to run repeatedly.
export const demoStudentApplication = {
  id: 'DEMO-APP-001',
  enrollmentId: 'ENROLLMENT-001',
  companyNameSnapshot: 'บริษัท บุรีรัมย์ดิจิทัล จำกัด',
  companyLocation: '88/8 ถนนธานี ตำบลในเมือง อำเภอเมืองบุรีรัมย์ จังหวัดบุรีรัมย์ 31000',
  recipientNameSnapshot: 'ผู้จัดการฝ่ายทรัพยากรบุคคล',
  letterAddressSnapshot: 'บริษัท บุรีรัมย์ดิจิทัล จำกัด 88/8 ถนนธานี ตำบลในเมือง อำเภอเมืองบุรีรัมย์ จังหวัดบุรีรัมย์ 31000',
  latitude: 14.993,
  longitude: 103.102,
  provinceSnapshot: 'บุรีรัมย์',
  positionTitle: 'Frontend Developer',
  appliedDate: '2026-09-10',
  status: 'COMPLETED',
  activeSlotKey: 'DEMO-ENROLLMENT-001-ACTIVE',
  companySiteId: 'DEMO-SITE-001',
}

export const demoCompany = {
  companyId: 'DEMO-COMPANY-001',
  companySiteId: 'DEMO-SITE-001',
  code: 'DEMO-COMPANY-BURIRAM-DIGITAL',
  legalName: 'บริษัท บุรีรัมย์ดิจิทัล จำกัด',
  branchName: 'สำนักงานใหญ่',
  address: '88/8 ถนนธานี ตำบลในเมือง อำเภอเมืองบุรีรัมย์ จังหวัดบุรีรัมย์ 31000',
  province: 'บุรีรัมย์',
  contactName: 'ผู้จัดการฝ่ายทรัพยากรบุคคล',
  contactPhone: '044-611-208',
  latitude: 14.993,
  longitude: 103.102,
}

export const demoPlacementRequest = {
  id: 'DEMO-REQ-001',
  requestNo: 'REQ-DEMO-0001',
  studentApplicationId: demoStudentApplication.id,
  enrollmentId: demoStudentApplication.enrollmentId,
  companyNameSnapshot: demoStudentApplication.companyNameSnapshot,
  companyLocationSnapshot: demoStudentApplication.companyLocation,
  provinceSnapshot: demoStudentApplication.provinceSnapshot,
  latitude: demoStudentApplication.latitude,
  longitude: demoStudentApplication.longitude,
  positionTitle: demoStudentApplication.positionTitle,
  recipientName: demoStudentApplication.recipientNameSnapshot,
  recipientRole: 'ผู้จัดการฝ่ายทรัพยากรบุคคล',
  letterAddress: demoStudentApplication.letterAddressSnapshot,
  status: 'SUBMITTED',
  activeSlotKey: 'DEMO-ENROLLMENT-001-REQUEST',
  submittedAt: '2026-09-10T09:00:00.000Z',
}

export const workbookDemoCompanies = [
  { id: 'WORKBOOK-COMPANY-001', siteId: 'WORKBOOK-SITE-001', code: 'WB-IBOTNOI', name: 'บริษัท ไอบอทน้อย จำกัด', contact: 'คุณจีร์กมล ธุปพงษ์', address: '30 หมู่บ้านเศรษฐสิริ ราชพฤกษ์-จรัญฯ ซอยปากน้ำฝั่งเหนือ 11 แขวงคลองชักพระ เขตตลิ่งชัน กรุงเทพ 10170', province: 'กรุงเทพมหานคร', latitude: 13.752, longitude: 100.456 },
  { id: 'WORKBOOK-COMPANY-002', siteId: 'WORKBOOK-SITE-002', code: 'WB-PEA-325', name: 'การไฟฟ้าส่วนภูมิภาค', contact: 'ผู้ช่วยผู้ว่าการการไฟฟ้าส่วนภูมิภาค เขต 3', address: 'การไฟฟ้าส่วนภูมิภาค (สาขา 325) เลขที่ 3 หมู่ที่ 2 อาคาร 3 ถนนมิตรภาพ ตำบลบ้านใหม่ อำเภอเมืองนครราชสีมา จังหวัดนครราชสีมา 30000', province: 'นครราชสีมา', latitude: 14.979, longitude: 102.097 },
  { id: 'WORKBOOK-COMPANY-003', siteId: 'WORKBOOK-SITE-003', code: 'WB-NECTEC', name: 'ศูนย์เทคโนโลยีอิเล็กทรอนิกส์และคอมพิวเตอร์แห่งชาติ', contact: 'คุณชัชวาล สังคีตตระการ', address: '112 อุทยานวิทยาศาสตร์ประเทศไทย ถนนพหลโยธิน ตำบลคลองหนึ่ง อำเภอคลองหลวง จังหวัดปทุมธานี', province: 'ปทุมธานี', latitude: 14.134, longitude: 100.617 },
  { id: 'WORKBOOK-COMPANY-004', siteId: 'WORKBOOK-SITE-004', code: 'WB-DETRUS', name: 'บริษัท ดีทรัซ จำกัด', contact: 'คุณกชพร ชารินทร์', address: '91/909 หมู่ 3 สินทรัพย์ 1 ถนนรังสิต–นครนายก ตำบลบึงยี่โถ อำเภอธัญบุรี จังหวัดปทุมธานี 12130', province: 'ปทุมธานี', latitude: 13.999, longitude: 100.734 },
  { id: 'WORKBOOK-COMPANY-005', siteId: 'WORKBOOK-SITE-005', code: 'WB-BRHOSPITAL', name: 'ศูนย์เทคโนโลยีสารสนเทศ กลุ่มงานสุขภาพดิจิทัล โรงพยาบาลบุรีรัมย์', contact: 'ผู้อำนวยการโรงพยาบาลบุรีรัมย์', address: '10/1 ถนนหน้าสถานี ตำบลในเมือง อำเภอเมืองบุรีรัมย์ จังหวัดบุรีรัมย์ 31000', province: 'บุรีรัมย์', latitude: 14.993, longitude: 103.102 },
  { id: 'WORKBOOK-COMPANY-006', siteId: 'WORKBOOK-SITE-006', code: 'WB-KHUMUANG-SCHOOL', name: 'โรงเรียนคูเมืองวิทยาคม', contact: 'ผู้อำนวยการโรงเรียนคูเมืองวิทยาคม', address: 'เลขที่ 363 ตำบลคูเมือง อำเภอคูเมือง จังหวัดบุรีรัมย์ 31190', province: 'บุรีรัมย์', latitude: 15.307, longitude: 103.0 },
  { id: 'WORKBOOK-COMPANY-007', siteId: 'WORKBOOK-SITE-007', code: 'WB-CYBERPAY', name: 'บริษัท ไซเบอร์เพย์ เทคโนโลยี จำกัด', contact: 'คุณสมเกียรติ สุภาพงษ์', address: 'เลขที่ 1 อาคารเอ็มไพร์ ทาวเวอร์ ชั้น 47 ห้อง 4703 ถนนสาทรใต้ แขวงยานนาวา เขตสาทร กรุงเทพมหานคร 10120', province: 'กรุงเทพมหานคร', latitude: 13.721, longitude: 100.531 },
  { id: 'WORKBOOK-COMPANY-008', siteId: 'WORKBOOK-SITE-008', code: 'WB-THAIBEV', name: 'บริษัท ไทยเบฟเวอเรจ จำกัด (มหาชน)', contact: 'กรรมการผู้จัดการบริษัทไทยเบฟเวอเรจ จำกัด (มหาชน)', address: '14 ถนนวิภาวดีรังสิต แขวงจอมพล เขตจตุจักร กรุงเทพมหานคร 10900', province: 'กรุงเทพมหานคร', latitude: 13.808, longitude: 100.559 },
  { id: 'WORKBOOK-COMPANY-009', siteId: 'WORKBOOK-SITE-009', code: 'WB-MINDMERGE', name: 'บริษัท มายด์เมอร์จ อินฟอร์เมชั่น เทคโนโลยี จำกัด', contact: 'คุณอนุชา ลิ้มบุพศิริพร', address: 'อาคารภูมเดชา ชั้น 2 เลขที่ 1 ซอยประดิพัทธ์ 10 ถนนประดิพัทธ์ แขวงพญาไท เขตพญาไท กรุงเทพมหานคร 10400', province: 'กรุงเทพมหานคร', latitude: 13.789, longitude: 100.544 },
  { id: 'WORKBOOK-COMPANY-010', siteId: 'WORKBOOK-SITE-010', code: 'WB-SADUAKSUAY', name: 'บริษัท สะดวกสวยไม่ จำกัด (มหาชน)', contact: 'ชลิภา ศิลาโชติ (ฝ่ายบุคคล)', address: '207 อาคารกลาสเฮ้าส์รัชดา อาคาร B ชั้น 12 ถนนรัชดาภิเษก แขวงรัชดาภิเษก เขตดินแดง กรุงเทพมหานคร 10400', province: 'กรุงเทพมหานคร', latitude: 13.768, longitude: 100.574 },
]
