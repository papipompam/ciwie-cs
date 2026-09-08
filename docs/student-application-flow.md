# Student application flow — first implementation slice

## Implemented

- Application modal collects `recipientName` (เรียน: ชื่อหรือตำแหน่งผู้รับหนังสือ)
  and `letterAddress` (ที่อยู่สำหรับออกหนังสือ). These are separate from the
  company location and coordinates; the address copy action is explicit.
- Both fields are required and trimmed by the shared Zod schema on create/edit.
  Legacy records without them remain readable and must be completed before selection.
- `accepted` means the company has accepted the student. A separate confirmation
  action selects the workplace. The existing wire value `completed` now means
  student selection, not completed internship or verified documents.
- Selection requires an accepted application with valid recipient/address/coordinates.
  Selected records cannot be edited or reset through the prototype student PATCH API.
  They continue to block new applications. Only a company rejection releases
  the existing application guard; student cancellation does not permit another application.
- The student card groups company and letter-recipient details, with dates and record ID.
  History includes recipient/address and last update; icon actions stay on one row.
  Its edit/status actions explain the lock for selected records.

## Staff UI preview

- Shortened flow: from an active application, choose “เลือกบริษัทนี้และส่งคำร้อง”
  and confirm once (two clicks). The confirmation explicitly attests company acceptance.
  The client performs existing acceptance and selection transitions, then submits the
  preview request. No separate status dialog or second send dialog is required.
  Validation runs first; partial API failures stop submission and retry resumes from
  the last successful status. These operations are not a database transaction.
- Staff final review is a direct action in request details (no nested confirmation).
  PDF upload remains choose-file then send so users can check their selection.

- `/staff/requests` is a separate staff-only prototype page for letter requests;
  `/staff/applications` still provides application history. Lecturer routes remain intact.
- A selected student application can explicitly submit a snapshot to the request preview.
  Requests and PDF data are held only in Nuxt `useState` within the current browser session.
  Switch roles without reloading (or log out/in through client navigation) to test both sides.
  Reloading loses the request and files; this is NOT database or server file storage.
- Staff attaches a courtesy-letter PDF; student downloads it and attaches the signed PDF.
  Staff can return the signed document with a required reason or confirm after review.
  These document statuses never change the application's selected-company lock.
- PDF checks cover filename, non-empty size up to 5 MB and PDF header, not malware scanning.
  UI role guards are prototype checks, NOT backend RBAC. No new unauthenticated API was added.
- Every submit/file action is labeled as a preview; no email or official submission occurs.

## Not implemented / deployment limits

- The application API is still a single-student in-memory prototype, not database
  persistence or real authentication. No Prisma migration was applied.
- Selection immediately adds the request to the staff queue in shared browser-session state.
  It does not send an external notification, persist an official request, or confirm documents.
- The old placements menu remains accessible with an explicit legacy label until
  its functionality has a working replacement. It still uses separate mock state.
- No Docker container was rebuilt or replaced as part of this UI/API slice.

## Remaining steps for the agreed flow

1. Establish real session/RBAC and cycle enrollment; store application, recipient,
   coordinates and request linkage in the database with atomic uniqueness checks.
2. Link one official request to the selected application without re-entering company
   data. Snapshot letter details on submission; define staff-controlled changes and
   cancellation, including handling previously selected legacy records.
3. Add staff issuance/attachment of PDF, authorized student download and signed-document
   upload, file validation/storage, version history, return-for-correction and final review.
4. Final confirmation is separate from student selection and does not unlock another
   company in the same cycle. Remove the duplicate menu only after connected paths work.

The owner for this new workflow is staff, superseding the old lecturer-centric prototype.
Rejection by a company, return-for-document-correction and cancellation must remain distinct.
