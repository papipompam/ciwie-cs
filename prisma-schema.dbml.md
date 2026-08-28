// DBML generated from prisma/schema.prisma
Table users {
  id varchar [pk, not null]
  identifier varchar [not null]
  normalized_identifier varchar [not null]
  email varchar [not null]
  normalized_email varchar [not null]
  password_hash varchar [not null]
  role varchar [not null]
  status varchar [not null]
  session_version int [not null]
  must_change_password boolean [not null]
  last_login_at datetime [null]
  created_at datetime [not null]
  updated_at datetime [not null]
  studentProfile varchar [null]
  lecturerProfile varchar [null]
  activationCodes varchar [not null]
  passwordResetTokens varchar [not null]
  sessions varchar [not null]
  notifications varchar [not null]
}

Table activation_codes {
  id varchar [pk, not null]
  user_id varchar [not null]
  token_hash varchar [not null]
  status varchar [not null]
  expires_at datetime [not null]
  used_at datetime [null]
  revoked_at datetime [null]
  created_at datetime [not null]
  updated_at datetime [not null]
  user varchar [not null]
}

Table password_reset_tokens {
  id varchar [pk, not null]
  user_id varchar [not null]
  token_hash varchar [not null]
  status varchar [not null]
  expires_at datetime [not null]
  used_at datetime [null]
  revoked_at datetime [null]
  created_at datetime [not null]
  updated_at datetime [not null]
  user varchar [not null]
}

Table user_sessions {
  id varchar [pk, not null]
  user_id varchar [not null]
  session_hash varchar [not null]
  expires_at datetime [not null]
  revoked_at datetime [null]
  created_at datetime [not null]
  updated_at datetime [not null]
  user varchar [not null]
}

Table student_profiles {
  id varchar [pk, not null]
  user_id varchar [not null]
  student_code varchar [not null]
  first_name_th varchar [not null]
  last_name_th varchar [not null]
  phone varchar [null]
  created_at datetime [not null]
  updated_at datetime [not null]
  user varchar [not null]
  enrollments varchar [not null]
}

Table lecturer_profiles {
  id varchar [pk, not null]
  user_id varchar [not null]
  employee_code varchar [null]
  first_name_th varchar [not null]
  last_name_th varchar [not null]
  phone varchar [null]
  created_at datetime [not null]
  updated_at datetime [not null]
  user varchar [not null]
  visitAssignments varchar [not null]
}

Table coop_terms {
  id varchar [pk, not null]
  academic_year int [not null]
  semester int [not null]
  name varchar [not null]
  starts_on datetime [not null]
  ends_on datetime [not null]
  is_active boolean [not null]
  created_at datetime [not null]
  updated_at datetime [not null]
  enrollments varchar [not null]
  applications varchar [not null]
  requests varchar [not null]
  batches varchar [not null]
  visits varchar [not null]
}

Table student_term_enrollments {
  id varchar [pk, not null]
  student_id varchar [not null]
  coop_term_id varchar [not null]
  version int [not null]
  created_at datetime [not null]
  updated_at datetime [not null]
  student varchar [not null]
  coopTerm varchar [not null]
  applications varchar [not null]
  requests varchar [not null]
  batchMembers varchar [not null]
  batchSlots varchar [not null]
  placement varchar [null]
  visitStudents varchar [not null]
}

Table organizations {
  id varchar [pk, not null]
  name_th varchar [not null]
  name_en varchar [null]
  normalized_name varchar [not null]
  tax_id varchar [null]
  is_active boolean [not null]
  created_by_id varchar [not null]
  updated_by_id varchar [not null]
  created_at datetime [not null]
  updated_at datetime [not null]
  workSites varchar [not null]
  contacts varchar [not null]
  aliases varchar [not null]
  mergeSources varchar [not null]
  mergeTargets varchar [not null]
}

Table work_sites {
  id varchar [pk, not null]
  organization_id varchar [not null]
  name varchar [not null]
  normalized_name varchar [not null]
  address_line varchar [not null]
  province varchar [not null]
  region varchar [not null]
  postal_code varchar [null]
  is_active boolean [not null]
  created_at datetime [not null]
  updated_at datetime [not null]
  organization varchar [not null]
  contacts varchar [not null]
  applications varchar [not null]
  requests varchar [not null]
  batches varchar [not null]
  placements varchar [not null]
  visits varchar [not null]
}

Table organization_contacts {
  id varchar [pk, not null]
  organization_id varchar [not null]
  work_site_id varchar [not null]
  name varchar [not null]
  position varchar [null]
  email varchar [null]
  phone varchar [null]
  is_active boolean [not null]
  created_at datetime [not null]
  updated_at datetime [not null]
  organization varchar [not null]
  workSite varchar [null]
  applications varchar [not null]
}

Table organization_aliases {
  id varchar [pk, not null]
  organization_id varchar [not null]
  normalized_alias varchar [not null]
  display_alias varchar [not null]
  created_at datetime [not null]
  updated_at datetime [not null]
  organization varchar [not null]
}

Table organization_merge_history {
  id varchar [pk, not null]
  source_organization_id varchar [not null]
  target_organization_id varchar [not null]
  actor_id varchar [not null]
  reason varchar [not null]
  source_snapshot json [not null]
  created_at datetime [not null]
  updated_at datetime [not null]
  sourceOrganization varchar [not null]
  targetOrganization varchar [not null]
}

Table applications {
  id varchar [pk, not null]
  student_term_id varchar [not null]
  coop_term_id varchar [not null]
  work_site_id varchar [not null]
  contact_id varchar [not null]
  contact_snapshot json [null]
  status varchar [not null]
  position_title varchar [null]
  applied_at datetime [not null]
  version int [not null]
  created_by_id varchar [not null]
  updated_by_id varchar [not null]
  created_at datetime [not null]
  updated_at datetime [not null]
  studentTerm varchar [not null]
  coopTerm varchar [not null]
  workSite varchar [not null]
  contact varchar [null]
  histories varchar [not null]
  evidenceFiles varchar [not null]
  documentRequests varchar [not null]
}

Table application_status_history {
  id varchar [pk, not null]
  application_id varchar [not null]
  from_status varchar [null]
  to_status varchar [not null]
  actor_id varchar [not null]
  reason varchar [null]
  snapshot json [null]
  created_at datetime [not null]
  updated_at datetime [not null]
  application varchar [not null]
}

Table files {
  id varchar [pk, not null]
  original_filename varchar [not null]
  created_by_id varchar [not null]
  visibility varchar [not null]
  created_at datetime [not null]
  updated_at datetime [not null]
  versions varchar [not null]
}

Table file_versions {
  id varchar [pk, not null]
  file_id varchar [not null]
  revision int [not null]
  object_key varchar [not null]
  checksum_sha256 varchar [not null]
  mime_type varchar [not null]
  extension varchar [not null]
  size_bytes bigint [not null]
  scan_status varchar [not null]
  scan_reason varchar [null]
  created_by_id varchar [not null]
  created_at datetime [not null]
  updated_at datetime [not null]
  file varchar [not null]
  applicationEvidence varchar [not null]
  documentVersions varchar [not null]
  deliveryEvidence varchar [not null]
  responseForms varchar [not null]
  importJobs varchar [not null]
  exportJobs varchar [not null]
}

Table application_evidence_files {
  id varchar [pk, not null]
  application_id varchar [not null]
  file_version_id varchar [not null]
  visibility varchar [not null]
  created_at datetime [not null]
  updated_at datetime [not null]
  application varchar [not null]
  fileVersion varchar [not null]
}

Table document_requests {
  id varchar [pk, not null]
  student_term_id varchar [not null]
  application_id varchar [not null]
  coop_term_id varchar [not null]
  work_site_id varchar [not null]
  status varchar [not null]
  requested_at datetime [not null]
  created_by_id varchar [not null]
  updated_by_id varchar [not null]
  created_at datetime [not null]
  updated_at datetime [not null]
  studentTerm varchar [not null]
  application varchar [not null]
  coopTerm varchar [not null]
  workSite varchar [not null]
  batchMember varchar [null]
}

Table document_batches {
  id varchar [pk, not null]
  coop_term_id varchar [not null]
  work_site_id varchar [not null]
  status varchar [not null]
  document_type varchar [not null]
  document_no varchar [null]
  document_year int [null]
  document_date datetime [null]
  lock_version int [not null]
  created_by_id varchar [not null]
  updated_by_id varchar [not null]
  created_at datetime [not null]
  updated_at datetime [not null]
  coopTerm varchar [not null]
  workSite varchar [not null]
  members varchar [not null]
  studentSlots varchar [not null]
  versions varchar [not null]
  deliveries varchar [not null]
  responseForms varchar [not null]
  responseResults varchar [not null]
}

Table document_batch_members {
  id varchar [pk, not null]
  batch_id varchar [not null]
  request_id varchar [not null]
  student_term_id varchar [not null]
  coop_term_id varchar [not null]
  work_site_id varchar [not null]
  snapshot json [not null]
  created_at datetime [not null]
  updated_at datetime [not null]
  batch varchar [not null]
  request varchar [not null]
  studentTerm varchar [not null]
  responseResults varchar [not null]
  activeSlot varchar [null]
}

Table document_batch_student_slots {
  id varchar [pk, not null]
  batch_member_id varchar [not null]
  batch_id varchar [not null]
  student_term_id varchar [not null]
  coop_term_id varchar [not null]
  work_site_id varchar [not null]
  created_at datetime [not null]
  updated_at datetime [not null]
  batchMember varchar [not null]
  batch varchar [not null]
  studentTerm varchar [not null]
}

Table document_versions {
  id varchar [pk, not null]
  batch_id varchar [not null]
  revision int [not null]
  kind varchar [not null]
  file_version_id varchar [not null]
  created_by_id varchar [not null]
  created_at datetime [not null]
  updated_at datetime [not null]
  batch varchar [not null]
  fileVersion varchar [not null]
}

Table deliveries {
  id varchar [pk, not null]
  batch_id varchar [not null]
  status varchar [not null]
  owner_type varchar [not null]
  owner_user_id varchar [not null]
  channel varchar [null]
  recipient varchar [null]
  sent_at datetime [null]
  acknowledged_at datetime [null]
  note varchar [null]
  created_by_id varchar [not null]
  updated_by_id varchar [not null]
  created_at datetime [not null]
  updated_at datetime [not null]
  batch varchar [not null]
  histories varchar [not null]
  evidenceFiles varchar [not null]
}

Table delivery_history {
  id varchar [pk, not null]
  delivery_id varchar [not null]
  from_status varchar [null]
  to_status varchar [not null]
  actor_id varchar [not null]
  reason varchar [null]
  snapshot json [null]
  created_at datetime [not null]
  updated_at datetime [not null]
  delivery varchar [not null]
}

Table delivery_evidence_files {
  id varchar [pk, not null]
  delivery_id varchar [not null]
  file_version_id varchar [not null]
  created_at datetime [not null]
  updated_at datetime [not null]
  delivery varchar [not null]
  fileVersion varchar [not null]
}

Table response_forms {
  id varchar [pk, not null]
  batch_id varchar [not null]
  revision int [not null]
  file_version_id varchar [not null]
  status varchar [not null]
  uploaded_by_id varchar [not null]
  submitted_at datetime [null]
  confirmed_at datetime [null]
  confirmed_by_id varchar [null]
  lock_version int [not null]
  created_at datetime [not null]
  updated_at datetime [not null]
  batch varchar [not null]
  fileVersion varchar [not null]
  results varchar [not null]
}

Table response_student_results {
  id varchar [pk, not null]
  response_form_id varchar [not null]
  batch_member_id varchar [not null]
  batch_id varchar [not null]
  result varchar [not null]
  note varchar [null]
  confirmed_by_id varchar [null]
  confirmed_at datetime [null]
  created_at datetime [not null]
  updated_at datetime [not null]
  responseForm varchar [not null]
  batchMember varchar [not null]
  batch varchar [not null]
  placement varchar [null]
}

Table placements {
  id varchar [pk, not null]
  student_term_id varchar [not null]
  current_work_site_id varchar [not null]
  source_response_result_id varchar [not null]
  status varchar [not null]
  version int [not null]
  confirmed_by_id varchar [not null]
  confirmed_at datetime [not null]
  created_at datetime [not null]
  updated_at datetime [not null]
  studentTerm varchar [not null]
  currentWorkSite varchar [not null]
  sourceResponseResult varchar [not null]
  versions varchar [not null]
  requirements varchar [not null]
}

Table placement_versions {
  id varchar [pk, not null]
  placement_id varchar [not null]
  version int [not null]
  snapshot json [not null]
  reason varchar [not null]
  actor_id varchar [not null]
  created_at datetime [not null]
  updated_at datetime [not null]
  placement varchar [not null]
}

Table supervision_visits {
  id varchar [pk, not null]
  coop_term_id varchar [not null]
  work_site_id varchar [not null]
  round varchar [not null]
  visit_date datetime [not null]
  period varchar [not null]
  status varchar [not null]
  lock_version int [not null]
  created_by_id varchar [not null]
  updated_by_id varchar [not null]
  created_at datetime [not null]
  updated_at datetime [not null]
  coopTerm varchar [not null]
  workSite varchar [not null]
  students varchar [not null]
  lecturers varchar [not null]
  studentSlots varchar [not null]
  lecturerSlots varchar [not null]
  workSiteSlot varchar [null]
  histories varchar [not null]
  organizationEvaluations varchar [not null]
  internalNotes varchar [not null]
  requirements varchar [not null]
  expenses varchar [not null]
}

Table visit_students {
  id varchar [pk, not null]
  visit_id varchar [not null]
  student_term_id varchar [not null]
  coop_term_id varchar [not null]
  acknowledgement_status varchar [not null]
  acknowledged_at datetime [null]
  created_at datetime [not null]
  updated_at datetime [not null]
  visit varchar [not null]
  studentTerm varchar [not null]
  result varchar [null]
  evaluations varchar [not null]
}

Table visit_lecturers {
  id varchar [pk, not null]
  visit_id varchar [not null]
  lecturer_id varchar [not null]
  acknowledgement_status varchar [not null]
  acknowledged_at datetime [null]
  created_at datetime [not null]
  updated_at datetime [not null]
  visit varchar [not null]
  lecturer varchar [not null]
}

Table visit_student_slots {
  id varchar [pk, not null]
  visit_id varchar [not null]
  student_term_id varchar [not null]
  round varchar [not null]
  visit_date datetime [not null]
  period varchar [not null]
  created_at datetime [not null]
  updated_at datetime [not null]
  visit varchar [not null]
}

Table visit_lecturer_slots {
  id varchar [pk, not null]
  visit_id varchar [not null]
  lecturer_id varchar [not null]
  visit_date datetime [not null]
  period varchar [not null]
  created_at datetime [not null]
  updated_at datetime [not null]
  visit varchar [not null]
}

Table visit_work_site_slots {
  id varchar [pk, not null]
  visit_id varchar [not null]
  work_site_id varchar [not null]
  visit_date datetime [not null]
  period varchar [not null]
  created_at datetime [not null]
  updated_at datetime [not null]
  visit varchar [not null]
}

Table supervision_results {
  id varchar [pk, not null]
  visit_student_id varchar [not null]
  outcome varchar [not null]
  summary varchar [null]
  version int [not null]
  submitted_by_id varchar [not null]
  submitted_at datetime [not null]
  created_at datetime [not null]
  updated_at datetime [not null]
  visitStudent varchar [not null]
  versions varchar [not null]
}

Table supervision_result_versions {
  id varchar [pk, not null]
  supervision_result_id varchar [not null]
  version int [not null]
  snapshot json [not null]
  reason varchar [not null]
  actor_id varchar [not null]
  created_at datetime [not null]
  updated_at datetime [not null]
  supervisionResult varchar [not null]
}

Table supervision_visit_history {
  id varchar [pk, not null]
  visit_id varchar [not null]
  action varchar [not null]
  snapshot json [not null]
  actor_id varchar [not null]
  reason varchar [null]
  created_at datetime [not null]
  updated_at datetime [not null]
  visit varchar [not null]
}

Table internal_notes {
  id varchar [pk, not null]
  visit_id varchar [not null]
  author_id varchar [not null]
  visibility varchar [not null]
  content varchar [not null]
  created_at datetime [not null]
  updated_at datetime [not null]
  visit varchar [not null]
}

Table company_requirements {
  id varchar [pk, not null]
  visit_id varchar [not null]
  placement_id varchar [not null]
  category varchar [not null]
  technology varchar [null]
  detail varchar [not null]
  author_id varchar [not null]
  created_at datetime [not null]
  updated_at datetime [not null]
  visit varchar [not null]
  placement varchar [null]
}

Table evaluation_templates {
  id varchar [pk, not null]
  code varchar [not null]
  subject varchar [not null]
  name varchar [not null]
  is_active boolean [not null]
  created_by_id varchar [not null]
  updated_by_id varchar [not null]
  created_at datetime [not null]
  updated_at datetime [not null]
  versions varchar [not null]
  studentEvaluations varchar [not null]
  organizationEvaluations varchar [not null]
}

Table evaluation_template_versions {
  id varchar [pk, not null]
  template_id varchar [not null]
  version int [not null]
  status varchar [not null]
  content_hash varchar [not null]
  published_at datetime [null]
  published_by_id varchar [null]
  created_at datetime [not null]
  updated_at datetime [not null]
  template varchar [not null]
  items varchar [not null]
  studentEvaluations varchar [not null]
  organizationEvaluations varchar [not null]
}

Table evaluation_items {
  id varchar [pk, not null]
  template_version_id varchar [not null]
  code varchar [not null]
  label varchar [not null]
  answer_type varchar [not null]
  required boolean [not null]
  max_score decimal [null]
  weight decimal [null]
  sort_order int [not null]
  created_at datetime [not null]
  updated_at datetime [not null]
  templateVersion varchar [not null]
  studentAnswers varchar [not null]
  organizationAnswers varchar [not null]
}

Table student_evaluations {
  id varchar [pk, not null]
  visit_student_id varchar [not null]
  template_version_id varchar [not null]
  template_id varchar [not null]
  status varchar [not null]
  version int [not null]
  submitted_at datetime [null]
  submitted_by_id varchar [null]
  created_by_id varchar [not null]
  updated_by_id varchar [not null]
  created_at datetime [not null]
  updated_at datetime [not null]
  visitStudent varchar [not null]
  templateVersion varchar [not null]
  template varchar [not null]
  answers varchar [not null]
  versions varchar [not null]
}

Table student_evaluation_answers {
  id varchar [pk, not null]
  evaluation_id varchar [not null]
  item_id varchar [not null]
  item_snapshot json [not null]
  score_value decimal [null]
  text_value varchar [null]
  boolean_value boolean [null]
  created_at datetime [not null]
  updated_at datetime [not null]
  evaluation varchar [not null]
  item varchar [not null]
}

Table student_evaluation_versions {
  id varchar [pk, not null]
  evaluation_id varchar [not null]
  version int [not null]
  snapshot json [not null]
  reason varchar [not null]
  actor_id varchar [not null]
  created_at datetime [not null]
  updated_at datetime [not null]
  evaluation varchar [not null]
}

Table organization_evaluations {
  id varchar [pk, not null]
  visit_id varchar [not null]
  template_version_id varchar [not null]
  template_id varchar [not null]
  status varchar [not null]
  version int [not null]
  submitted_at datetime [null]
  submitted_by_id varchar [null]
  created_by_id varchar [not null]
  updated_by_id varchar [not null]
  created_at datetime [not null]
  updated_at datetime [not null]
  visit varchar [not null]
  templateVersion varchar [not null]
  template varchar [not null]
  answers varchar [not null]
  versions varchar [not null]
}

Table organization_evaluation_answers {
  id varchar [pk, not null]
  evaluation_id varchar [not null]
  item_id varchar [not null]
  item_snapshot json [not null]
  score_value decimal [null]
  text_value varchar [null]
  boolean_value boolean [null]
  created_at datetime [not null]
  updated_at datetime [not null]
  evaluation varchar [not null]
  item varchar [not null]
}

Table organization_evaluation_versions {
  id varchar [pk, not null]
  evaluation_id varchar [not null]
  version int [not null]
  snapshot json [not null]
  reason varchar [not null]
  actor_id varchar [not null]
  created_at datetime [not null]
  updated_at datetime [not null]
  evaluation varchar [not null]
}

Table import_jobs {
  id varchar [pk, not null]
  requested_by_id varchar [not null]
  source_file_version_id varchar [not null]
  kind varchar [not null]
  source_checksum varchar [not null]
  status varchar [not null]
  total_rows int [not null]
  processed_rows int [not null]
  failure_reason varchar [null]
  confirmed_at datetime [null]
  created_at datetime [not null]
  updated_at datetime [not null]
  sourceFileVersion varchar [not null]
  rows varchar [not null]
}

Table import_rows {
  id varchar [pk, not null]
  import_job_id varchar [not null]
  row_no int [not null]
  status varchar [not null]
  normalized_hash varchar [not null]
  normalized_data json [not null]
  observed_version int [null]
  errors json [null]
  imported_entity_id varchar [null]
  created_at datetime [not null]
  updated_at datetime [not null]
  importJob varchar [not null]
}

Table export_jobs {
  id varchar [pk, not null]
  requested_by_id varchar [not null]
  kind varchar [not null]
  format varchar [not null]
  filter_snapshot json [not null]
  status varchar [not null]
  file_version_id varchar [not null]
  expires_at datetime [null]
  failure_reason varchar [null]
  created_at datetime [not null]
  updated_at datetime [not null]
  fileVersion varchar [null]
}

Table notifications {
  id varchar [pk, not null]
  recipient_id varchar [not null]
  event_type varchar [not null]
  title varchar [not null]
  body varchar [not null]
  entity_type varchar [null]
  entity_id varchar [null]
  status varchar [not null]
  read_at datetime [null]
  created_at datetime [not null]
  updated_at datetime [not null]
  recipient varchar [not null]
}

Table outbox_messages {
  id varchar [pk, not null]
  event_type varchar [not null]
  aggregate_type varchar [not null]
  aggregate_id varchar [not null]
  dedupe_key varchar [not null]
  payload json [not null]
  status varchar [not null]
  attempts int [not null]
  next_attempt_at datetime [not null]
  processed_at datetime [null]
  last_error varchar [null]
  created_at datetime [not null]
  updated_at datetime [not null]
}

Table idempotency_records {
  id varchar [pk, not null]
  actor_id varchar [not null]
  operation varchar [not null]
  idempotency_key varchar [not null]
  request_hash varchar [not null]
  status varchar [not null]
  response_status int [null]
  response_body json [null]
  expires_at datetime [not null]
  created_at datetime [not null]
  updated_at datetime [not null]
}

Table expenses {
  id varchar [pk, not null]
  visit_id varchar [not null]
  round varchar [not null]
  travel_days int [not null]
  travel_amount decimal [not null]
  lodging_amount decimal [not null]
  meal_amount decimal [not null]
  total_amount decimal [not null]
  note varchar [null]
  version int [not null]
  created_by_id varchar [not null]
  updated_by_id varchar [not null]
  created_at datetime [not null]
  updated_at datetime [not null]
  visit varchar [not null]
  versions varchar [not null]
}

Table expense_versions {
  id varchar [pk, not null]
  expense_id varchar [not null]
  version int [not null]
  snapshot json [not null]
  reason varchar [not null]
  actor_id varchar [not null]
  created_at datetime [not null]
  updated_at datetime [not null]
  expense varchar [not null]
}

Table audit_logs {
  id varchar [pk, not null]
  actor_id varchar [null]
  action varchar [not null]
  entity_type varchar [not null]
  entity_id varchar [not null]
  request_id varchar [not null]
  reason varchar [null]
  before_data json [null]
  after_data json [null]
  ip_address varchar [null]
  created_at datetime [not null]
}

Ref: activation_codes.user_id > users.id
Ref: password_reset_tokens.user_id > users.id
Ref: user_sessions.user_id > users.id
Ref: student_profiles.user_id > users.id
Ref: lecturer_profiles.user_id > users.id
Ref: student_term_enrollments.student_id > student_profiles.id
Ref: student_term_enrollments.coop_term_id > coop_terms.id
Ref: work_sites.organization_id > organizations.id
Ref: organization_contacts.organization_id > organizations.id
Ref: organization_contacts.work_site_id > work_sites.id
Ref: organization_aliases.organization_id > organizations.id
Ref: organization_merge_history.source_organization_id > organizations.id
Ref: organization_merge_history.target_organization_id > organizations.id
Ref: applications.student_term_id > student_term_enrollments.id
Ref: applications.coop_term_id > coop_terms.id
Ref: applications.work_site_id > work_sites.id
Ref: applications.contact_id > organization_contacts.id
Ref: application_status_history.application_id > applications.id
Ref: file_versions.file_id > files.id
Ref: application_evidence_files.application_id > applications.id
Ref: application_evidence_files.file_version_id > file_versions.id
Ref: document_requests.student_term_id > student_term_enrollments.id
Ref: document_requests.application_id > applications.id
Ref: document_requests.coop_term_id > coop_terms.id
Ref: document_requests.work_site_id > work_sites.id
Ref: document_batches.coop_term_id > coop_terms.id
Ref: document_batches.work_site_id > work_sites.id
Ref: document_batch_members.batch_id > document_batches.id
Ref: document_batch_members.request_id > document_requests.id
Ref: document_batch_members.student_term_id > student_term_enrollments.id
Ref: document_batch_student_slots.batch_member_id > document_batch_members.id
Ref: document_batch_student_slots.batch_id > document_batches.id
Ref: document_batch_student_slots.student_term_id > student_term_enrollments.id
Ref: document_versions.batch_id > document_batches.id
Ref: document_versions.file_version_id > file_versions.id
Ref: deliveries.batch_id > document_batches.id
Ref: delivery_history.delivery_id > deliveries.id
Ref: delivery_evidence_files.delivery_id > deliveries.id
Ref: delivery_evidence_files.file_version_id > file_versions.id
Ref: response_forms.batch_id > document_batches.id
Ref: response_forms.file_version_id > file_versions.id
Ref: response_student_results.response_form_id > response_forms.id
Ref: response_student_results.batch_member_id > document_batch_members.id
Ref: response_student_results.batch_id > document_batches.id
Ref: placements.student_term_id > student_term_enrollments.id
Ref: placements.current_work_site_id > work_sites.id
Ref: placements.source_response_result_id > response_student_results.id
Ref: placement_versions.placement_id > placements.id
Ref: supervision_visits.coop_term_id > coop_terms.id
Ref: supervision_visits.work_site_id > work_sites.id
Ref: visit_students.visit_id > supervision_visits.id
Ref: visit_students.student_term_id > student_term_enrollments.id
Ref: visit_lecturers.visit_id > supervision_visits.id
Ref: visit_lecturers.lecturer_id > lecturer_profiles.id
Ref: visit_student_slots.visit_id > supervision_visits.id
Ref: visit_lecturer_slots.visit_id > supervision_visits.id
Ref: visit_work_site_slots.visit_id > supervision_visits.id
Ref: supervision_results.visit_student_id > visit_students.id
Ref: supervision_result_versions.supervision_result_id > supervision_results.id
Ref: supervision_visit_history.visit_id > supervision_visits.id
Ref: internal_notes.visit_id > supervision_visits.id
Ref: company_requirements.visit_id > supervision_visits.id
Ref: company_requirements.placement_id > placements.id
Ref: evaluation_template_versions.template_id > evaluation_templates.id
Ref: evaluation_items.template_version_id > evaluation_template_versions.id
Ref: student_evaluations.visit_student_id > visit_students.id
Ref: student_evaluations.template_version_id > evaluation_template_versions.id
Ref: student_evaluations.template_id > evaluation_templates.id
Ref: student_evaluation_answers.evaluation_id > student_evaluations.id
Ref: student_evaluation_answers.item_id > evaluation_items.id
Ref: student_evaluation_versions.evaluation_id > student_evaluations.id
Ref: organization_evaluations.visit_id > supervision_visits.id
Ref: organization_evaluations.template_version_id > evaluation_template_versions.id
Ref: organization_evaluations.template_id > evaluation_templates.id
Ref: organization_evaluation_answers.evaluation_id > organization_evaluations.id
Ref: organization_evaluation_answers.item_id > evaluation_items.id
Ref: organization_evaluation_versions.evaluation_id > organization_evaluations.id
Ref: import_jobs.source_file_version_id > file_versions.id
Ref: import_rows.import_job_id > import_jobs.id
Ref: export_jobs.file_version_id > file_versions.id
Ref: notifications.recipient_id > users.id
Ref: expenses.visit_id > supervision_visits.id
Ref: expense_versions.expense_id > expenses.id
