-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STAFF', 'LECTURER', 'STUDENT');

-- CreateEnum
CREATE TYPE "UserGender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('FIRST_LOGIN', 'ACTIVE', 'SUSPENDED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "AcademicTerm" AS ENUM ('FIRST', 'SECOND', 'SUMMER', 'OTHER');

-- CreateEnum
CREATE TYPE "CoopCycleStatus" AS ENUM ('DRAFT', 'OPEN_FOR_REQUESTS', 'CLOSED_TO_REQUESTS', 'TRAINING', 'CLOSED');

-- CreateEnum
CREATE TYPE "CycleEnrollmentStatus" AS ENUM ('ACTIVE', 'TRANSFERRED_OUT', 'COMPLETED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "StudentWorkStatus" AS ENUM ('NOT_STARTED', 'TRAINING', 'COMPLETED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "RegionCode" AS ENUM ('NORTH', 'NORTHEAST', 'CENTRAL', 'EAST', 'WEST', 'SOUTH');

-- CreateEnum
CREATE TYPE "TrackedApplicationStatus" AS ENUM ('SUBMITTED', 'WAITING_RESPONSE', 'RESPONDED', 'WAITING_INTERVIEW', 'ACCEPTED', 'REJECTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PlacementRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'RETURNED', 'BATCHED', 'WAITING_RESPONSE', 'WAITING_REVIEW', 'CONFIRMED', 'NOT_ACCEPTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LetterDocumentType" AS ENUM ('OUTGOING_REQUEST', 'COMPANY_RESPONSE');

-- CreateEnum
CREATE TYPE "DocumentVersionStatus" AS ENUM ('ACTIVE', 'RETURNED', 'SUPERSEDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FileValidationStatus" AS ENUM ('PENDING', 'VALID', 'INVALID');

-- CreateEnum
CREATE TYPE "SupervisionRound" AS ENUM ('ROUND_1', 'ROUND_2');

-- CreateEnum
CREATE TYPE "SupervisionPeriod" AS ENUM ('MORNING', 'AFTERNOON');

-- CreateEnum
CREATE TYPE "SupervisionAppointmentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'POSTPONED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SupervisionParticipantSource" AS ENUM ('GROUP', 'MANUAL');

-- CreateEnum
CREATE TYPE "SupervisionParticipantRole" AS ENUM ('LEAD', 'PARTICIPANT');

-- CreateEnum
CREATE TYPE "EvaluationStatus" AS ENUM ('DRAFT', 'SUBMITTED');

-- CreateEnum
CREATE TYPE "CompanyRecommendation" AS ENUM ('RECOMMENDED', 'CONDITIONAL', 'FOLLOW_UP', 'NOT_RECOMMENDED', 'SAFETY_RISK');

-- CreateEnum
CREATE TYPE "NotificationSeverity" AS ENUM ('INFO', 'WARNING', 'SUCCESS', 'ERROR');

-- CreateEnum
CREATE TYPE "CalendarEventType" AS ENUM ('SUPERVISION', 'DOCUMENT', 'DEADLINE', 'EVALUATION', 'GENERAL');

-- CreateTable
CREATE TABLE "users" (
    "id" VARCHAR(30) NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL,
    "status" "AccountStatus" NOT NULL DEFAULT 'FIRST_LOGIN',
    "recordStatus" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "namePrefix" VARCHAR(50) NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    "gender" "UserGender",
    "cohortYear" INTEGER,
    "section" VARCHAR(50),
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "failedWindowAt" TIMESTAMP(3),
    "lockedUntil" TIMESTAMP(3),
    "sessionVersion" INTEGER NOT NULL DEFAULT 1,
    "passwordChangedAt" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "terminatedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdById" VARCHAR(30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" BIGSERIAL NOT NULL,
    "actorAccountId" VARCHAR(30),
    "action" VARCHAR(100) NOT NULL,
    "entityType" VARCHAR(100) NOT NULL,
    "entityId" VARCHAR(100) NOT NULL,
    "reason" TEXT,
    "beforeData" JSONB,
    "afterData" JSONB,
    "metadata" JSONB,
    "correlationId" VARCHAR(100),
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coop_cycles" (
    "id" VARCHAR(30) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "label" VARCHAR(150) NOT NULL,
    "academicYear" INTEGER NOT NULL,
    "term" "AcademicTerm" NOT NULL,
    "termLabel" VARCHAR(100) NOT NULL,
    "targetCohortYear" INTEGER NOT NULL,
    "requestStartDate" DATE NOT NULL,
    "requestEndDate" DATE NOT NULL,
    "trainingStartDate" DATE NOT NULL,
    "trainingEndDate" DATE NOT NULL,
    "status" "CoopCycleStatus" NOT NULL DEFAULT 'DRAFT',
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coop_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coop_cycle_status_history" (
    "id" BIGSERIAL NOT NULL,
    "cycleId" VARCHAR(30) NOT NULL,
    "fromStatus" "CoopCycleStatus",
    "toStatus" "CoopCycleStatus" NOT NULL,
    "reason" TEXT NOT NULL,
    "changedById" VARCHAR(30) NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coop_cycle_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cycle_enrollments" (
    "id" VARCHAR(30) NOT NULL,
    "cycleId" VARCHAR(30) NOT NULL,
    "studentId" VARCHAR(30) NOT NULL,
    "cohortYearSnapshot" INTEGER NOT NULL,
    "sectionSnapshot" VARCHAR(50),
    "enrollmentStatus" "CycleEnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "workStatus" "StudentWorkStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "currentStudentKey" VARCHAR(30),
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exitedAt" TIMESTAMP(3),
    "exitReason" TEXT,
    "createdById" VARCHAR(30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cycle_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provinces" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "nameTh" VARCHAR(100) NOT NULL,
    "region" "RegionCode",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provinces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" VARCHAR(30) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "legalName" VARCHAR(255) NOT NULL,
    "taxId" VARCHAR(20),
    "status" "CompanyStatus" NOT NULL DEFAULT 'PENDING',
    "createdById" VARCHAR(30) NOT NULL,
    "deactivatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_sites" (
    "id" VARCHAR(30) NOT NULL,
    "companyId" VARCHAR(30) NOT NULL,
    "branchName" VARCHAR(150) NOT NULL DEFAULT 'สำนักงานใหญ่',
    "address" TEXT NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "provinceId" INTEGER NOT NULL,
    "postalCode" VARCHAR(10),
    "contactName" VARCHAR(150),
    "contactRole" VARCHAR(150),
    "contactPhone" VARCHAR(50),
    "contactEmail" VARCHAR(255),
    "recordStatus" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_applications" (
    "id" VARCHAR(30) NOT NULL,
    "enrollmentId" VARCHAR(30) NOT NULL,
    "companySiteId" VARCHAR(30),
    "companyNameSnapshot" VARCHAR(255) NOT NULL,
    "companyLocation" VARCHAR(500),
    "recipientNameSnapshot" VARCHAR(255) NOT NULL,
    "letterAddressSnapshot" TEXT NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "provinceSnapshot" VARCHAR(100) NOT NULL,
    "positionTitle" VARCHAR(150) NOT NULL,
    "appliedDate" DATE NOT NULL,
    "status" "TrackedApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "activeSlotKey" VARCHAR(30),
    "details" TEXT,
    "responseDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "placement_requests" (
    "id" VARCHAR(30) NOT NULL,
    "requestNo" VARCHAR(50) NOT NULL,
    "studentApplicationId" VARCHAR(30) NOT NULL,
    "enrollmentId" VARCHAR(30) NOT NULL,
    "companySiteId" VARCHAR(30),
    "companyNameSnapshot" VARCHAR(255) NOT NULL,
    "companyLocationSnapshot" TEXT NOT NULL,
    "provinceSnapshot" VARCHAR(100) NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "positionTitle" VARCHAR(150) NOT NULL,
    "details" TEXT,
    "recipientName" VARCHAR(255) NOT NULL,
    "recipientRole" VARCHAR(150) NOT NULL,
    "letterAddress" TEXT NOT NULL,
    "status" "PlacementRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "activeSlotKey" VARCHAR(30),
    "confirmedSlotKey" VARCHAR(30),
    "submittedAt" TIMESTAMP(3),
    "returnedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "confirmedPosition" VARCHAR(150),
    "resultNote" TEXT,
    "confirmedById" VARCHAR(30),
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "placement_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "placement_request_status_history" (
    "id" BIGSERIAL NOT NULL,
    "requestId" VARCHAR(30) NOT NULL,
    "fromStatus" "PlacementRequestStatus",
    "toStatus" "PlacementRequestStatus" NOT NULL,
    "reason" TEXT,
    "changedById" VARCHAR(30) NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "placement_request_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "letter_document_versions" (
    "id" VARCHAR(30) NOT NULL,
    "placementRequestId" VARCHAR(30) NOT NULL,
    "documentType" "LetterDocumentType" NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" "DocumentVersionStatus" NOT NULL DEFAULT 'ACTIVE',
    "storageKey" VARCHAR(500) NOT NULL,
    "originalFileName" VARCHAR(255) NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "detectedMimeType" VARCHAR(100),
    "sizeBytes" BIGINT NOT NULL,
    "sha256" CHAR(64) NOT NULL,
    "validationStatus" "FileValidationStatus" NOT NULL DEFAULT 'PENDING',
    "validationError" TEXT,
    "validatedAt" TIMESTAMP(3),
    "uploadedById" VARCHAR(30) NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "replacementReason" TEXT,
    "reviewedById" VARCHAR(30),
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,

    CONSTRAINT "letter_document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supervision_groups" (
    "id" VARCHAR(30) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "cycleId" VARCHAR(30) NOT NULL,
    "round" "SupervisionRound" NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "createdById" VARCHAR(30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supervision_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supervision_expenses" (
    "id" VARCHAR(30) NOT NULL,
    "groupId" VARCHAR(30) NOT NULL,
    "fuelAmount" DECIMAL(12,2) NOT NULL,
    "roomRate" DECIMAL(12,2) NOT NULL,
    "nights" INTEGER NOT NULL,
    "allowanceRate" DECIMAL(12,2) NOT NULL,
    "allowanceDays" INTEGER NOT NULL,
    "roomCapacity" INTEGER NOT NULL,
    "lecturerCount" INTEGER NOT NULL,
    "maleLecturerCount" INTEGER NOT NULL,
    "femaleLecturerCount" INTEGER NOT NULL,
    "maleRoomCount" INTEGER NOT NULL,
    "femaleRoomCount" INTEGER NOT NULL,
    "accommodationAmount" DECIMAL(12,2) NOT NULL,
    "allowanceAmount" DECIMAL(12,2) NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "lecturerSnapshot" JSONB NOT NULL,
    "createdById" VARCHAR(30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supervision_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supervision_group_lecturers" (
    "id" VARCHAR(30) NOT NULL,
    "groupId" VARCHAR(30) NOT NULL,
    "cycleId" VARCHAR(30) NOT NULL,
    "round" "SupervisionRound" NOT NULL,
    "lecturerId" VARCHAR(30) NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supervision_group_lecturers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supervision_group_companies" (
    "id" VARCHAR(30) NOT NULL,
    "groupId" VARCHAR(30) NOT NULL,
    "cycleId" VARCHAR(30) NOT NULL,
    "round" "SupervisionRound" NOT NULL,
    "companySiteId" VARCHAR(30) NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supervision_group_companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supervision_appointments" (
    "id" VARCHAR(30) NOT NULL,
    "appointmentNo" VARCHAR(50) NOT NULL,
    "groupCompanyId" VARCHAR(30) NOT NULL,
    "scheduledDate" DATE,
    "period" "SupervisionPeriod",
    "status" "SupervisionAppointmentStatus" NOT NULL DEFAULT 'DRAFT',
    "splitReason" TEXT,
    "postponementReason" TEXT,
    "cancellationReason" TEXT,
    "publishedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "resultSummary" TEXT,
    "resultIssues" TEXT,
    "resultSuggestions" TEXT,
    "companyRequirements" TEXT,
    "resultRecordedById" VARCHAR(30),
    "resultRecordedAt" TIMESTAMP(3),
    "createdById" VARCHAR(30) NOT NULL,
    "publishedById" VARCHAR(30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supervision_appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supervision_appointment_lecturers" (
    "id" VARCHAR(30) NOT NULL,
    "appointmentId" VARCHAR(30) NOT NULL,
    "lecturerId" VARCHAR(30) NOT NULL,
    "source" "SupervisionParticipantSource" NOT NULL,
    "role" "SupervisionParticipantRole" NOT NULL DEFAULT 'PARTICIPANT',
    "isActual" BOOLEAN NOT NULL DEFAULT false,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "supervision_appointment_lecturers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supervision_appointment_students" (
    "id" VARCHAR(30) NOT NULL,
    "appointmentId" VARCHAR(30) NOT NULL,
    "placementRequestId" VARCHAR(30) NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supervision_appointment_students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_evaluations" (
    "id" VARCHAR(30) NOT NULL,
    "appointmentStudentId" VARCHAR(30) NOT NULL,
    "evaluatorLecturerId" VARCHAR(30) NOT NULL,
    "rubricVersion" INTEGER NOT NULL DEFAULT 1,
    "status" "EvaluationStatus" NOT NULL DEFAULT 'DRAFT',
    "responsibilityScore" SMALLINT,
    "disciplineScore" SMALLINT,
    "communicationScore" SMALLINT,
    "knowledgeScore" SMALLINT,
    "workQualityScore" SMALLINT,
    "problemSolvingScore" SMALLINT,
    "strengths" TEXT,
    "issues" TEXT,
    "suggestions" TEXT,
    "nextFollowUp" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_evaluations" (
    "id" VARCHAR(30) NOT NULL,
    "appointmentId" VARCHAR(30) NOT NULL,
    "evaluatorId" VARCHAR(30) NOT NULL,
    "rubricVersion" INTEGER NOT NULL DEFAULT 1,
    "status" "EvaluationStatus" NOT NULL DEFAULT 'DRAFT',
    "workRelevanceScore" SMALLINT,
    "workChallengeScore" SMALLINT,
    "learningOpportunityScore" SMALLINT,
    "supervisorReadinessScore" SMALLINT,
    "studentSupportScore" SMALLINT,
    "environmentScore" SMALLINT,
    "safetyScore" SMALLINT,
    "resourceReadinessScore" SMALLINT,
    "allowanceScore" SMALLINT,
    "transportationScore" SMALLINT,
    "publicTransportScore" SMALLINT,
    "nearbyAccommodationScore" SMALLINT,
    "universityCoordinationScore" SMALLINT,
    "recommendation" "CompanyRecommendation",
    "observations" TEXT,
    "companyRequirements" TEXT,
    "issues" TEXT,
    "suggestions" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" VARCHAR(30) NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "severity" "NotificationSeverity" NOT NULL DEFAULT 'INFO',
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT NOT NULL,
    "deepLink" VARCHAR(500),
    "placementRequestId" VARCHAR(30),
    "appointmentId" VARCHAR(30),
    "createdById" VARCHAR(30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_recipients" (
    "id" VARCHAR(30) NOT NULL,
    "notificationId" VARCHAR(30) NOT NULL,
    "accountId" VARCHAR(30) NOT NULL,
    "deliveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "notification_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_events" (
    "id" VARCHAR(30) NOT NULL,
    "eventType" "CalendarEventType" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "isAllDay" BOOLEAN NOT NULL DEFAULT false,
    "ownerAccountId" VARCHAR(30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_role_status_idx" ON "users"("role", "status");

-- CreateIndex
CREATE INDEX "users_recordStatus_firstName_lastName_idx" ON "users"("recordStatus", "firstName", "lastName");

-- CreateIndex
CREATE INDEX "users_cohortYear_section_idx" ON "users"("cohortYear", "section");

-- CreateIndex
CREATE INDEX "users_createdById_idx" ON "users"("createdById");

-- CreateIndex
CREATE INDEX "audit_logs_action_occurredAt_idx" ON "audit_logs"("action", "occurredAt");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_occurredAt_idx" ON "audit_logs"("entityType", "entityId", "occurredAt");

-- CreateIndex
CREATE INDEX "audit_logs_actorAccountId_occurredAt_idx" ON "audit_logs"("actorAccountId", "occurredAt");

-- CreateIndex
CREATE INDEX "audit_logs_correlationId_idx" ON "audit_logs"("correlationId");

-- CreateIndex
CREATE UNIQUE INDEX "coop_cycles_code_key" ON "coop_cycles"("code");

-- CreateIndex
CREATE INDEX "coop_cycles_status_requestStartDate_requestEndDate_idx" ON "coop_cycles"("status", "requestStartDate", "requestEndDate");

-- CreateIndex
CREATE INDEX "coop_cycles_trainingStartDate_trainingEndDate_idx" ON "coop_cycles"("trainingStartDate", "trainingEndDate");

-- CreateIndex
CREATE UNIQUE INDEX "coop_cycles_academicYear_term_targetCohortYear_key" ON "coop_cycles"("academicYear", "term", "targetCohortYear");

-- CreateIndex
CREATE INDEX "coop_cycle_status_history_cycleId_changedAt_idx" ON "coop_cycle_status_history"("cycleId", "changedAt");

-- CreateIndex
CREATE INDEX "coop_cycle_status_history_changedById_idx" ON "coop_cycle_status_history"("changedById");

-- CreateIndex
CREATE UNIQUE INDEX "cycle_enrollments_currentStudentKey_key" ON "cycle_enrollments"("currentStudentKey");

-- CreateIndex
CREATE INDEX "cycle_enrollments_cycleId_enrollmentStatus_workStatus_idx" ON "cycle_enrollments"("cycleId", "enrollmentStatus", "workStatus");

-- CreateIndex
CREATE INDEX "cycle_enrollments_studentId_enrollmentStatus_idx" ON "cycle_enrollments"("studentId", "enrollmentStatus");

-- CreateIndex
CREATE INDEX "cycle_enrollments_createdById_idx" ON "cycle_enrollments"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "cycle_enrollments_cycleId_studentId_key" ON "cycle_enrollments"("cycleId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "provinces_code_key" ON "provinces"("code");

-- CreateIndex
CREATE UNIQUE INDEX "provinces_nameTh_key" ON "provinces"("nameTh");

-- CreateIndex
CREATE INDEX "provinces_region_nameTh_idx" ON "provinces"("region", "nameTh");

-- CreateIndex
CREATE UNIQUE INDEX "companies_code_key" ON "companies"("code");

-- CreateIndex
CREATE INDEX "companies_legalName_status_idx" ON "companies"("legalName", "status");

-- CreateIndex
CREATE INDEX "companies_createdById_idx" ON "companies"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "companies_taxId_key" ON "companies"("taxId");

-- CreateIndex
CREATE INDEX "company_sites_provinceId_recordStatus_idx" ON "company_sites"("provinceId", "recordStatus");

-- CreateIndex
CREATE INDEX "company_sites_branchName_idx" ON "company_sites"("branchName");

-- CreateIndex
CREATE UNIQUE INDEX "company_sites_companyId_branchName_key" ON "company_sites"("companyId", "branchName");

-- CreateIndex
CREATE UNIQUE INDEX "student_applications_activeSlotKey_key" ON "student_applications"("activeSlotKey");

-- CreateIndex
CREATE INDEX "student_applications_enrollmentId_appliedDate_idx" ON "student_applications"("enrollmentId", "appliedDate");

-- CreateIndex
CREATE INDEX "student_applications_status_provinceSnapshot_idx" ON "student_applications"("status", "provinceSnapshot");

-- CreateIndex
CREATE INDEX "student_applications_companySiteId_idx" ON "student_applications"("companySiteId");

-- CreateIndex
CREATE INDEX "student_applications_companyNameSnapshot_idx" ON "student_applications"("companyNameSnapshot");

-- CreateIndex
CREATE UNIQUE INDEX "placement_requests_requestNo_key" ON "placement_requests"("requestNo");

-- CreateIndex
CREATE UNIQUE INDEX "placement_requests_studentApplicationId_key" ON "placement_requests"("studentApplicationId");

-- CreateIndex
CREATE UNIQUE INDEX "placement_requests_activeSlotKey_key" ON "placement_requests"("activeSlotKey");

-- CreateIndex
CREATE UNIQUE INDEX "placement_requests_confirmedSlotKey_key" ON "placement_requests"("confirmedSlotKey");

-- CreateIndex
CREATE INDEX "placement_requests_enrollmentId_status_idx" ON "placement_requests"("enrollmentId", "status");

-- CreateIndex
CREATE INDEX "placement_requests_companySiteId_status_idx" ON "placement_requests"("companySiteId", "status");

-- CreateIndex
CREATE INDEX "placement_requests_submittedAt_idx" ON "placement_requests"("submittedAt");

-- CreateIndex
CREATE INDEX "placement_requests_confirmedById_idx" ON "placement_requests"("confirmedById");

-- CreateIndex
CREATE INDEX "placement_request_status_history_requestId_changedAt_idx" ON "placement_request_status_history"("requestId", "changedAt");

-- CreateIndex
CREATE INDEX "placement_request_status_history_changedById_idx" ON "placement_request_status_history"("changedById");

-- CreateIndex
CREATE UNIQUE INDEX "letter_document_versions_storageKey_key" ON "letter_document_versions"("storageKey");

-- CreateIndex
CREATE INDEX "letter_docs_request_type_status_idx" ON "letter_document_versions"("placementRequestId", "documentType", "status");

-- CreateIndex
CREATE INDEX "letter_document_versions_sha256_idx" ON "letter_document_versions"("sha256");

-- CreateIndex
CREATE INDEX "letter_document_versions_uploadedById_idx" ON "letter_document_versions"("uploadedById");

-- CreateIndex
CREATE INDEX "letter_document_versions_reviewedById_idx" ON "letter_document_versions"("reviewedById");

-- CreateIndex
CREATE UNIQUE INDEX "letter_docs_request_type_version_key" ON "letter_document_versions"("placementRequestId", "documentType", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "supervision_groups_code_key" ON "supervision_groups"("code");

-- CreateIndex
CREATE INDEX "supervision_groups_cycleId_round_idx" ON "supervision_groups"("cycleId", "round");

-- CreateIndex
CREATE INDEX "supervision_groups_createdById_idx" ON "supervision_groups"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "supervision_groups_id_cycleId_round_key" ON "supervision_groups"("id", "cycleId", "round");

-- CreateIndex
CREATE UNIQUE INDEX "supervision_groups_cycleId_round_name_key" ON "supervision_groups"("cycleId", "round", "name");

-- CreateIndex
CREATE UNIQUE INDEX "supervision_expenses_groupId_key" ON "supervision_expenses"("groupId");

-- CreateIndex
CREATE INDEX "supervision_expenses_createdById_idx" ON "supervision_expenses"("createdById");

-- CreateIndex
CREATE INDEX "supervision_group_lecturers_lecturerId_idx" ON "supervision_group_lecturers"("lecturerId");

-- CreateIndex
CREATE UNIQUE INDEX "supervision_group_lecturers_cycleId_round_lecturerId_key" ON "supervision_group_lecturers"("cycleId", "round", "lecturerId");

-- CreateIndex
CREATE INDEX "supervision_group_companies_companySiteId_idx" ON "supervision_group_companies"("companySiteId");

-- CreateIndex
CREATE UNIQUE INDEX "supervision_group_companies_cycleId_round_companySiteId_key" ON "supervision_group_companies"("cycleId", "round", "companySiteId");

-- CreateIndex
CREATE UNIQUE INDEX "supervision_appointments_appointmentNo_key" ON "supervision_appointments"("appointmentNo");

-- CreateIndex
CREATE INDEX "supervision_appointments_groupCompanyId_status_idx" ON "supervision_appointments"("groupCompanyId", "status");

-- CreateIndex
CREATE INDEX "supervision_appointments_scheduledDate_period_idx" ON "supervision_appointments"("scheduledDate", "period");

-- CreateIndex
CREATE INDEX "supervision_appointments_createdById_idx" ON "supervision_appointments"("createdById");

-- CreateIndex
CREATE INDEX "supervision_appointments_publishedById_idx" ON "supervision_appointments"("publishedById");

-- CreateIndex
CREATE INDEX "supervision_appointments_resultRecordedById_idx" ON "supervision_appointments"("resultRecordedById");

-- CreateIndex
CREATE INDEX "supervision_appointment_lecturers_lecturerId_idx" ON "supervision_appointment_lecturers"("lecturerId");

-- CreateIndex
CREATE UNIQUE INDEX "supervision_appointment_lecturers_appointmentId_lecturerId_key" ON "supervision_appointment_lecturers"("appointmentId", "lecturerId");

-- CreateIndex
CREATE INDEX "supervision_appointment_students_placementRequestId_idx" ON "supervision_appointment_students"("placementRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "supervision_appointment_students_appointmentId_placementReq_key" ON "supervision_appointment_students"("appointmentId", "placementRequestId");

-- CreateIndex
CREATE INDEX "student_evaluations_evaluatorLecturerId_status_idx" ON "student_evaluations"("evaluatorLecturerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "student_evaluations_appointmentStudentId_evaluatorLecturerI_key" ON "student_evaluations"("appointmentStudentId", "evaluatorLecturerId");

-- CreateIndex
CREATE UNIQUE INDEX "company_evaluations_appointmentId_key" ON "company_evaluations"("appointmentId");

-- CreateIndex
CREATE INDEX "company_evaluations_evaluatorId_status_idx" ON "company_evaluations"("evaluatorId", "status");

-- CreateIndex
CREATE INDEX "notifications_placementRequestId_idx" ON "notifications"("placementRequestId");

-- CreateIndex
CREATE INDEX "notifications_appointmentId_idx" ON "notifications"("appointmentId");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE INDEX "notification_recipients_accountId_readAt_deliveredAt_idx" ON "notification_recipients"("accountId", "readAt", "deliveredAt");

-- CreateIndex
CREATE UNIQUE INDEX "notification_recipients_notificationId_accountId_key" ON "notification_recipients"("notificationId", "accountId");

-- CreateIndex
CREATE INDEX "calendar_events_startsAt_endsAt_idx" ON "calendar_events"("startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "calendar_events_ownerAccountId_startsAt_idx" ON "calendar_events"("ownerAccountId", "startsAt");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorAccountId_fkey" FOREIGN KEY ("actorAccountId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coop_cycle_status_history" ADD CONSTRAINT "coop_cycle_status_history_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "coop_cycles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coop_cycle_status_history" ADD CONSTRAINT "coop_cycle_status_history_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycle_enrollments" ADD CONSTRAINT "cycle_enrollments_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "coop_cycles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycle_enrollments" ADD CONSTRAINT "cycle_enrollments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycle_enrollments" ADD CONSTRAINT "cycle_enrollments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_sites" ADD CONSTRAINT "company_sites_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_sites" ADD CONSTRAINT "company_sites_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "provinces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_applications" ADD CONSTRAINT "student_applications_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "cycle_enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_applications" ADD CONSTRAINT "student_applications_companySiteId_fkey" FOREIGN KEY ("companySiteId") REFERENCES "company_sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placement_requests" ADD CONSTRAINT "placement_requests_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "cycle_enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placement_requests" ADD CONSTRAINT "placement_requests_studentApplicationId_fkey" FOREIGN KEY ("studentApplicationId") REFERENCES "student_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placement_requests" ADD CONSTRAINT "placement_requests_companySiteId_fkey" FOREIGN KEY ("companySiteId") REFERENCES "company_sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placement_requests" ADD CONSTRAINT "placement_requests_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placement_request_status_history" ADD CONSTRAINT "placement_request_status_history_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "placement_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placement_request_status_history" ADD CONSTRAINT "placement_request_status_history_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "letter_document_versions" ADD CONSTRAINT "letter_document_versions_placementRequestId_fkey" FOREIGN KEY ("placementRequestId") REFERENCES "placement_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "letter_document_versions" ADD CONSTRAINT "letter_document_versions_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "letter_document_versions" ADD CONSTRAINT "letter_document_versions_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervision_groups" ADD CONSTRAINT "supervision_groups_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "coop_cycles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervision_groups" ADD CONSTRAINT "supervision_groups_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervision_expenses" ADD CONSTRAINT "supervision_expenses_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "supervision_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervision_expenses" ADD CONSTRAINT "supervision_expenses_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervision_group_lecturers" ADD CONSTRAINT "supervision_group_lecturers_groupId_cycleId_round_fkey" FOREIGN KEY ("groupId", "cycleId", "round") REFERENCES "supervision_groups"("id", "cycleId", "round") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervision_group_lecturers" ADD CONSTRAINT "supervision_group_lecturers_lecturerId_fkey" FOREIGN KEY ("lecturerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervision_group_companies" ADD CONSTRAINT "supervision_group_companies_groupId_cycleId_round_fkey" FOREIGN KEY ("groupId", "cycleId", "round") REFERENCES "supervision_groups"("id", "cycleId", "round") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervision_group_companies" ADD CONSTRAINT "supervision_group_companies_companySiteId_fkey" FOREIGN KEY ("companySiteId") REFERENCES "company_sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervision_appointments" ADD CONSTRAINT "supervision_appointments_groupCompanyId_fkey" FOREIGN KEY ("groupCompanyId") REFERENCES "supervision_group_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervision_appointments" ADD CONSTRAINT "supervision_appointments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervision_appointments" ADD CONSTRAINT "supervision_appointments_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervision_appointments" ADD CONSTRAINT "supervision_appointments_resultRecordedById_fkey" FOREIGN KEY ("resultRecordedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervision_appointment_lecturers" ADD CONSTRAINT "supervision_appointment_lecturers_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "supervision_appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervision_appointment_lecturers" ADD CONSTRAINT "supervision_appointment_lecturers_lecturerId_fkey" FOREIGN KEY ("lecturerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervision_appointment_students" ADD CONSTRAINT "supervision_appointment_students_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "supervision_appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervision_appointment_students" ADD CONSTRAINT "supervision_appointment_students_placementRequestId_fkey" FOREIGN KEY ("placementRequestId") REFERENCES "placement_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_evaluations" ADD CONSTRAINT "student_evaluations_appointmentStudentId_fkey" FOREIGN KEY ("appointmentStudentId") REFERENCES "supervision_appointment_students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_evaluations" ADD CONSTRAINT "student_evaluations_evaluatorLecturerId_fkey" FOREIGN KEY ("evaluatorLecturerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_evaluations" ADD CONSTRAINT "company_evaluations_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "supervision_appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_evaluations" ADD CONSTRAINT "company_evaluations_evaluatorId_fkey" FOREIGN KEY ("evaluatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_placementRequestId_fkey" FOREIGN KEY ("placementRequestId") REFERENCES "placement_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "supervision_appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_ownerAccountId_fkey" FOREIGN KEY ("ownerAccountId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
