# การทดสอบฐานข้อมูล

## Model ที่พบ
User, AuditLog, CoopCycle, CoopCycleStatusHistory, CycleEnrollment, Province, Company, CompanySite, StudentApplication, PlacementRequest, LetterDocumentVersion, SupervisionGroup, SupervisionGroupLecturer, SupervisionGroupCompany, SupervisionAppointment, SupervisionAppointmentLecturer, SupervisionAppointmentStudent, StudentEvaluation, CompanyEvaluation, Notification, NotificationRecipient และ CalendarEvent

## จุดที่มีอยู่
- ทุก Model มี Primary Key
- มี Foreign Key และ Restrictive Delete สำหรับข้อมูลสำคัญส่วนใหญ่
- มี Unique Constraint สำหรับ Username, Enrollment, Company, Branch, Active Application, Participant, Evaluator และ Document Version
- หลาย Flow ใช้ Serializable Transaction
- pnpm db:validate ผ่าน

## ความเสี่ยง
- ต้องทดสอบ activeSlotKey ด้วย Concurrent Insert บน PostgreSQL จริง
- ยังไม่พบ Constraint หรือ Query ตรวจ Resource Conflict ของตารางนิเทศ
- CalendarEvent.owner ใช้ Cascade Delete ต้องยืนยันนโยบายเก็บข้อมูล
- ต้องทดสอบ Invalid Status, Concurrent Update, Orphan Record และ Foreign Key
