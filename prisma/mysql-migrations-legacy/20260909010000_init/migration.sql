-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(30) NOT NULL,
    `username` VARCHAR(100) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `role` ENUM('STAFF', 'LECTURER', 'STUDENT') NOT NULL,
    `status` ENUM('FIRST_LOGIN', 'ACTIVE', 'SUSPENDED', 'TERMINATED') NOT NULL DEFAULT 'FIRST_LOGIN',
    `recordStatus` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `namePrefix` VARCHAR(50) NOT NULL,
    `firstName` VARCHAR(100) NOT NULL,
    `lastName` VARCHAR(100) NOT NULL,
    `cohortYear` INTEGER NULL,
    `section` VARCHAR(50) NULL,
    `canReviewPlacements` BOOLEAN NOT NULL DEFAULT false,
    `failedLoginCount` INTEGER NOT NULL DEFAULT 0,
    `failedWindowAt` DATETIME(3) NULL,
    `lockedUntil` DATETIME(3) NULL,
    `sessionVersion` INTEGER NOT NULL DEFAULT 1,
    `passwordChangedAt` DATETIME(3) NULL,
    `suspendedAt` DATETIME(3) NULL,
    `terminatedAt` DATETIME(3) NULL,
    `lastLoginAt` DATETIME(3) NULL,
    `createdById` VARCHAR(30) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_username_key`(`username`),
    INDEX `users_role_status_idx`(`role`, `status`),
    INDEX `users_recordStatus_firstName_lastName_idx`(`recordStatus`, `firstName`, `lastName`),
    INDEX `users_cohortYear_section_idx`(`cohortYear`, `section`),
    INDEX `users_createdById_idx`(`createdById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `actorAccountId` VARCHAR(30) NULL,
    `action` VARCHAR(100) NOT NULL,
    `entityType` VARCHAR(100) NOT NULL,
    `entityId` VARCHAR(100) NOT NULL,
    `reason` TEXT NULL,
    `beforeData` JSON NULL,
    `afterData` JSON NULL,
    `metadata` JSON NULL,
    `correlationId` VARCHAR(100) NULL,
    `ipAddress` VARCHAR(45) NULL,
    `userAgent` TEXT NULL,
    `occurredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_action_occurredAt_idx`(`action`, `occurredAt`),
    INDEX `audit_logs_entityType_entityId_occurredAt_idx`(`entityType`, `entityId`, `occurredAt`),
    INDEX `audit_logs_actorAccountId_occurredAt_idx`(`actorAccountId`, `occurredAt`),
    INDEX `audit_logs_correlationId_idx`(`correlationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `coop_cycles` (
    `id` VARCHAR(30) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `label` VARCHAR(150) NOT NULL,
    `academicYear` INTEGER NOT NULL,
    `term` ENUM('FIRST', 'SECOND', 'SUMMER', 'OTHER') NOT NULL,
    `termLabel` VARCHAR(100) NOT NULL,
    `targetCohortYear` INTEGER NOT NULL,
    `requestStartDate` DATE NOT NULL,
    `requestEndDate` DATE NOT NULL,
    `trainingStartDate` DATE NOT NULL,
    `trainingEndDate` DATE NOT NULL,
    `status` ENUM('DRAFT', 'OPEN_FOR_REQUESTS', 'CLOSED_TO_REQUESTS', 'TRAINING', 'CLOSED') NOT NULL DEFAULT 'DRAFT',
    `closedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `coop_cycles_code_key`(`code`),
    INDEX `coop_cycles_status_requestStartDate_requestEndDate_idx`(`status`, `requestStartDate`, `requestEndDate`),
    INDEX `coop_cycles_trainingStartDate_trainingEndDate_idx`(`trainingStartDate`, `trainingEndDate`),
    UNIQUE INDEX `coop_cycles_academicYear_term_targetCohortYear_key`(`academicYear`, `term`, `targetCohortYear`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `coop_cycle_status_history` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `cycleId` VARCHAR(30) NOT NULL,
    `fromStatus` ENUM('DRAFT', 'OPEN_FOR_REQUESTS', 'CLOSED_TO_REQUESTS', 'TRAINING', 'CLOSED') NULL,
    `toStatus` ENUM('DRAFT', 'OPEN_FOR_REQUESTS', 'CLOSED_TO_REQUESTS', 'TRAINING', 'CLOSED') NOT NULL,
    `reason` TEXT NOT NULL,
    `changedById` VARCHAR(30) NOT NULL,
    `changedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `coop_cycle_status_history_cycleId_changedAt_idx`(`cycleId`, `changedAt`),
    INDEX `coop_cycle_status_history_changedById_idx`(`changedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cycle_enrollments` (
    `id` VARCHAR(30) NOT NULL,
    `cycleId` VARCHAR(30) NOT NULL,
    `studentId` VARCHAR(30) NOT NULL,
    `cohortYearSnapshot` INTEGER NOT NULL,
    `sectionSnapshot` VARCHAR(50) NULL,
    `enrollmentStatus` ENUM('ACTIVE', 'TRANSFERRED_OUT', 'COMPLETED', 'TERMINATED') NOT NULL DEFAULT 'ACTIVE',
    `workStatus` ENUM('NOT_STARTED', 'TRAINING', 'COMPLETED', 'TERMINATED') NOT NULL DEFAULT 'NOT_STARTED',
    `currentStudentKey` VARCHAR(30) NULL,
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `exitedAt` DATETIME(3) NULL,
    `exitReason` TEXT NULL,
    `createdById` VARCHAR(30) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `cycle_enrollments_currentStudentKey_key`(`currentStudentKey`),
    INDEX `cycle_enrollments_cycleId_enrollmentStatus_workStatus_idx`(`cycleId`, `enrollmentStatus`, `workStatus`),
    INDEX `cycle_enrollments_studentId_enrollmentStatus_idx`(`studentId`, `enrollmentStatus`),
    INDEX `cycle_enrollments_createdById_idx`(`createdById`),
    UNIQUE INDEX `cycle_enrollments_cycleId_studentId_key`(`cycleId`, `studentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `provinces` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(10) NOT NULL,
    `nameTh` VARCHAR(100) NOT NULL,
    `region` ENUM('NORTH', 'NORTHEAST', 'CENTRAL', 'EAST', 'WEST', 'SOUTH') NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `provinces_code_key`(`code`),
    UNIQUE INDEX `provinces_nameTh_key`(`nameTh`),
    INDEX `provinces_region_nameTh_idx`(`region`, `nameTh`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `companies` (
    `id` VARCHAR(30) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `legalName` VARCHAR(255) NOT NULL,
    `taxId` VARCHAR(20) NULL,
    `status` ENUM('PENDING', 'ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'PENDING',
    `createdById` VARCHAR(30) NOT NULL,
    `deactivatedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `companies_code_key`(`code`),
    INDEX `companies_legalName_status_idx`(`legalName`, `status`),
    INDEX `companies_createdById_idx`(`createdById`),
    UNIQUE INDEX `companies_taxId_key`(`taxId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `company_sites` (
    `id` VARCHAR(30) NOT NULL,
    `companyId` VARCHAR(30) NOT NULL,
    `branchName` VARCHAR(150) NOT NULL DEFAULT 'สำนักงานใหญ่',
    `address` TEXT NOT NULL,
    `latitude` DECIMAL(10, 7) NULL,
    `longitude` DECIMAL(10, 7) NULL,
    `provinceId` INTEGER NOT NULL,
    `postalCode` VARCHAR(10) NULL,
    `contactName` VARCHAR(150) NULL,
    `contactRole` VARCHAR(150) NULL,
    `contactPhone` VARCHAR(50) NULL,
    `contactEmail` VARCHAR(255) NULL,
    `recordStatus` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `company_sites_provinceId_recordStatus_idx`(`provinceId`, `recordStatus`),
    INDEX `company_sites_branchName_idx`(`branchName`),
    UNIQUE INDEX `company_sites_companyId_branchName_key`(`companyId`, `branchName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student_applications` (
    `id` VARCHAR(30) NOT NULL,
    `enrollmentId` VARCHAR(30) NOT NULL,
    `companySiteId` VARCHAR(30) NULL,
    `companyNameSnapshot` VARCHAR(255) NOT NULL,
    `companyLocation` VARCHAR(500) NULL,
    `recipientNameSnapshot` VARCHAR(255) NOT NULL,
    `letterAddressSnapshot` TEXT NOT NULL,
    `latitude` DECIMAL(10, 7) NULL,
    `longitude` DECIMAL(10, 7) NULL,
    `provinceSnapshot` VARCHAR(100) NOT NULL,
    `positionTitle` VARCHAR(150) NOT NULL,
    `appliedDate` DATE NOT NULL,
    `status` ENUM('SUBMITTED', 'WAITING_RESPONSE', 'RESPONDED', 'WAITING_INTERVIEW', 'ACCEPTED', 'REJECTED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'SUBMITTED',
    `activeSlotKey` VARCHAR(30) NULL,
    `details` TEXT NULL,
    `responseDate` DATE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `student_applications_activeSlotKey_key`(`activeSlotKey`),
    INDEX `student_applications_enrollmentId_appliedDate_idx`(`enrollmentId`, `appliedDate`),
    INDEX `student_applications_status_provinceSnapshot_idx`(`status`, `provinceSnapshot`),
    INDEX `student_applications_companySiteId_idx`(`companySiteId`),
    INDEX `student_applications_companyNameSnapshot_idx`(`companyNameSnapshot`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `placement_requests` (
    `id` VARCHAR(30) NOT NULL,
    `requestNo` VARCHAR(50) NOT NULL,
    `studentApplicationId` VARCHAR(30) NOT NULL,
    `enrollmentId` VARCHAR(30) NOT NULL,
    `companySiteId` VARCHAR(30) NULL,
    `companyNameSnapshot` VARCHAR(255) NOT NULL,
    `companyLocationSnapshot` TEXT NOT NULL,
    `provinceSnapshot` VARCHAR(100) NOT NULL,
    `latitude` DECIMAL(10, 7) NULL,
    `longitude` DECIMAL(10, 7) NULL,
    `positionTitle` VARCHAR(150) NOT NULL,
    `details` TEXT NULL,
    `recipientName` VARCHAR(255) NOT NULL,
    `recipientRole` VARCHAR(150) NOT NULL,
    `letterAddress` TEXT NOT NULL,
    `status` ENUM('DRAFT', 'SUBMITTED', 'RETURNED', 'BATCHED', 'WAITING_RESPONSE', 'WAITING_REVIEW', 'CONFIRMED', 'NOT_ACCEPTED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `activeSlotKey` VARCHAR(30) NULL,
    `confirmedSlotKey` VARCHAR(30) NULL,
    `submittedAt` DATETIME(3) NULL,
    `returnedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `cancellationReason` TEXT NULL,
    `confirmedPosition` VARCHAR(150) NULL,
    `resultNote` TEXT NULL,
    `confirmedById` VARCHAR(30) NULL,
    `confirmedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `placement_requests_requestNo_key`(`requestNo`),
    UNIQUE INDEX `placement_requests_studentApplicationId_key`(`studentApplicationId`),
    UNIQUE INDEX `placement_requests_activeSlotKey_key`(`activeSlotKey`),
    UNIQUE INDEX `placement_requests_confirmedSlotKey_key`(`confirmedSlotKey`),
    INDEX `placement_requests_enrollmentId_status_idx`(`enrollmentId`, `status`),
    INDEX `placement_requests_companySiteId_status_idx`(`companySiteId`, `status`),
    INDEX `placement_requests_submittedAt_idx`(`submittedAt`),
    INDEX `placement_requests_confirmedById_idx`(`confirmedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `placement_request_status_history` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `requestId` VARCHAR(30) NOT NULL,
    `fromStatus` ENUM('DRAFT', 'SUBMITTED', 'RETURNED', 'BATCHED', 'WAITING_RESPONSE', 'WAITING_REVIEW', 'CONFIRMED', 'NOT_ACCEPTED', 'CANCELLED') NULL,
    `toStatus` ENUM('DRAFT', 'SUBMITTED', 'RETURNED', 'BATCHED', 'WAITING_RESPONSE', 'WAITING_REVIEW', 'CONFIRMED', 'NOT_ACCEPTED', 'CANCELLED') NOT NULL,
    `reason` TEXT NULL,
    `changedById` VARCHAR(30) NOT NULL,
    `changedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `placement_request_status_history_requestId_changedAt_idx`(`requestId`, `changedAt`),
    INDEX `placement_request_status_history_changedById_idx`(`changedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `letter_batches` (
    `id` VARCHAR(30) NOT NULL,
    `batchNo` VARCHAR(50) NOT NULL,
    `cycleId` VARCHAR(30) NOT NULL,
    `companySiteId` VARCHAR(30) NOT NULL,
    `status` ENUM('WAITING_RESPONSE', 'WAITING_REVIEW', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'WAITING_RESPONSE',
    `companyNameSnapshot` VARCHAR(255) NOT NULL,
    `branchNameSnapshot` VARCHAR(150) NOT NULL,
    `companyAddressSnapshot` TEXT NOT NULL,
    `recipientNameSnapshot` VARCHAR(150) NOT NULL,
    `recipientRoleSnapshot` VARCHAR(150) NOT NULL,
    `letterAddressSnapshot` TEXT NOT NULL,
    `letterDate` DATE NULL,
    `issuedAt` DATETIME(3) NULL,
    `publishedAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `cancellationReason` TEXT NULL,
    `createdById` VARCHAR(30) NOT NULL,
    `issuedById` VARCHAR(30) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `letter_batches_batchNo_key`(`batchNo`),
    INDEX `letter_batches_cycleId_status_idx`(`cycleId`, `status`),
    INDEX `letter_batches_companySiteId_status_idx`(`companySiteId`, `status`),
    INDEX `letter_batches_createdById_idx`(`createdById`),
    INDEX `letter_batches_issuedById_idx`(`issuedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `letter_batch_members` (
    `id` VARCHAR(30) NOT NULL,
    `batchId` VARCHAR(30) NOT NULL,
    `requestId` VARCHAR(30) NOT NULL,
    `activeMembershipKey` VARCHAR(30) NULL,
    `studentCodeSnapshot` VARCHAR(50) NOT NULL,
    `namePrefixSnapshot` VARCHAR(50) NOT NULL,
    `firstNameSnapshot` VARCHAR(100) NOT NULL,
    `lastNameSnapshot` VARCHAR(100) NOT NULL,
    `positionSnapshot` VARCHAR(150) NOT NULL,
    `addedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `removedAt` DATETIME(3) NULL,
    `lockedAt` DATETIME(3) NULL,

    UNIQUE INDEX `letter_batch_members_activeMembershipKey_key`(`activeMembershipKey`),
    INDEX `letter_batch_members_requestId_removedAt_idx`(`requestId`, `removedAt`),
    INDEX `letter_batch_members_batchId_removedAt_idx`(`batchId`, `removedAt`),
    UNIQUE INDEX `letter_batch_members_batchId_requestId_key`(`batchId`, `requestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `letter_document_versions` (
    `id` VARCHAR(30) NOT NULL,
    `batchId` VARCHAR(30) NULL,
    `placementRequestId` VARCHAR(30) NULL,
    `documentType` ENUM('OUTGOING_REQUEST', 'COMPANY_RESPONSE') NOT NULL,
    `versionNumber` INTEGER NOT NULL,
    `status` ENUM('ACTIVE', 'RETURNED', 'SUPERSEDED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    `storageKey` VARCHAR(500) NOT NULL,
    `originalFileName` VARCHAR(255) NOT NULL,
    `mimeType` VARCHAR(100) NOT NULL,
    `detectedMimeType` VARCHAR(100) NULL,
    `sizeBytes` BIGINT NOT NULL,
    `sha256` CHAR(64) NOT NULL,
    `validationStatus` ENUM('PENDING', 'VALID', 'INVALID') NOT NULL DEFAULT 'PENDING',
    `validationError` TEXT NULL,
    `validatedAt` DATETIME(3) NULL,
    `uploadedById` VARCHAR(30) NOT NULL,
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `replacementReason` TEXT NULL,
    `reviewedById` VARCHAR(30) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewNote` TEXT NULL,

    UNIQUE INDEX `letter_document_versions_storageKey_key`(`storageKey`),
    INDEX `letter_document_versions_batchId_documentType_status_idx`(`batchId`, `documentType`, `status`),
    INDEX `letter_docs_request_type_status_idx`(`placementRequestId`, `documentType`, `status`),
    INDEX `letter_document_versions_sha256_idx`(`sha256`),
    INDEX `letter_document_versions_uploadedById_idx`(`uploadedById`),
    INDEX `letter_document_versions_reviewedById_idx`(`reviewedById`),
    UNIQUE INDEX `letter_document_versions_batchId_documentType_versionNumber_key`(`batchId`, `documentType`, `versionNumber`),
    UNIQUE INDEX `letter_docs_request_type_version_key`(`placementRequestId`, `documentType`, `versionNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `supervision_groups` (
    `id` VARCHAR(30) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `cycleId` VARCHAR(30) NOT NULL,
    `round` ENUM('ROUND_1', 'ROUND_2') NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `createdById` VARCHAR(30) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `supervision_groups_code_key`(`code`),
    INDEX `supervision_groups_cycleId_round_idx`(`cycleId`, `round`),
    INDEX `supervision_groups_createdById_idx`(`createdById`),
    UNIQUE INDEX `supervision_groups_id_cycleId_round_key`(`id`, `cycleId`, `round`),
    UNIQUE INDEX `supervision_groups_cycleId_round_name_key`(`cycleId`, `round`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `supervision_group_lecturers` (
    `id` VARCHAR(30) NOT NULL,
    `groupId` VARCHAR(30) NOT NULL,
    `cycleId` VARCHAR(30) NOT NULL,
    `round` ENUM('ROUND_1', 'ROUND_2') NOT NULL,
    `lecturerId` VARCHAR(30) NOT NULL,
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `supervision_group_lecturers_lecturerId_idx`(`lecturerId`),
    UNIQUE INDEX `supervision_group_lecturers_cycleId_round_lecturerId_key`(`cycleId`, `round`, `lecturerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `supervision_group_companies` (
    `id` VARCHAR(30) NOT NULL,
    `groupId` VARCHAR(30) NOT NULL,
    `cycleId` VARCHAR(30) NOT NULL,
    `round` ENUM('ROUND_1', 'ROUND_2') NOT NULL,
    `companySiteId` VARCHAR(30) NOT NULL,
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `supervision_group_companies_companySiteId_idx`(`companySiteId`),
    UNIQUE INDEX `supervision_group_companies_cycleId_round_companySiteId_key`(`cycleId`, `round`, `companySiteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `supervision_appointments` (
    `id` VARCHAR(30) NOT NULL,
    `appointmentNo` VARCHAR(50) NOT NULL,
    `groupCompanyId` VARCHAR(30) NOT NULL,
    `scheduledDate` DATE NULL,
    `period` ENUM('MORNING', 'AFTERNOON') NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'POSTPONED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `splitReason` TEXT NULL,
    `postponementReason` TEXT NULL,
    `cancellationReason` TEXT NULL,
    `publishedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `lockedAt` DATETIME(3) NULL,
    `resultSummary` LONGTEXT NULL,
    `resultIssues` LONGTEXT NULL,
    `resultSuggestions` LONGTEXT NULL,
    `companyRequirements` LONGTEXT NULL,
    `resultRecordedById` VARCHAR(30) NULL,
    `resultRecordedAt` DATETIME(3) NULL,
    `createdById` VARCHAR(30) NOT NULL,
    `publishedById` VARCHAR(30) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `supervision_appointments_appointmentNo_key`(`appointmentNo`),
    INDEX `supervision_appointments_groupCompanyId_status_idx`(`groupCompanyId`, `status`),
    INDEX `supervision_appointments_scheduledDate_period_idx`(`scheduledDate`, `period`),
    INDEX `supervision_appointments_createdById_idx`(`createdById`),
    INDEX `supervision_appointments_publishedById_idx`(`publishedById`),
    INDEX `supervision_appointments_resultRecordedById_idx`(`resultRecordedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `supervision_appointment_lecturers` (
    `id` VARCHAR(30) NOT NULL,
    `appointmentId` VARCHAR(30) NOT NULL,
    `lecturerId` VARCHAR(30) NOT NULL,
    `source` ENUM('GROUP', 'MANUAL') NOT NULL,
    `role` ENUM('LEAD', 'PARTICIPANT') NOT NULL DEFAULT 'PARTICIPANT',
    `isActual` BOOLEAN NOT NULL DEFAULT false,
    `addedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `confirmedAt` DATETIME(3) NULL,

    INDEX `supervision_appointment_lecturers_lecturerId_idx`(`lecturerId`),
    UNIQUE INDEX `supervision_appointment_lecturers_appointmentId_lecturerId_key`(`appointmentId`, `lecturerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `supervision_appointment_students` (
    `id` VARCHAR(30) NOT NULL,
    `appointmentId` VARCHAR(30) NOT NULL,
    `placementRequestId` VARCHAR(30) NOT NULL,
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `supervision_appointment_students_placementRequestId_idx`(`placementRequestId`),
    UNIQUE INDEX `supervision_appointment_students_appointmentId_placementRequ_key`(`appointmentId`, `placementRequestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student_evaluations` (
    `id` VARCHAR(30) NOT NULL,
    `appointmentStudentId` VARCHAR(30) NOT NULL,
    `evaluatorLecturerId` VARCHAR(30) NOT NULL,
    `rubricVersion` INTEGER NOT NULL DEFAULT 1,
    `status` ENUM('DRAFT', 'SUBMITTED') NOT NULL DEFAULT 'DRAFT',
    `responsibilityScore` TINYINT UNSIGNED NULL,
    `disciplineScore` TINYINT UNSIGNED NULL,
    `communicationScore` TINYINT UNSIGNED NULL,
    `knowledgeScore` TINYINT UNSIGNED NULL,
    `workQualityScore` TINYINT UNSIGNED NULL,
    `problemSolvingScore` TINYINT UNSIGNED NULL,
    `strengths` LONGTEXT NULL,
    `issues` LONGTEXT NULL,
    `suggestions` LONGTEXT NULL,
    `nextFollowUp` LONGTEXT NULL,
    `submittedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `student_evaluations_evaluatorLecturerId_status_idx`(`evaluatorLecturerId`, `status`),
    UNIQUE INDEX `student_evaluations_appointmentStudentId_evaluatorLecturerId_key`(`appointmentStudentId`, `evaluatorLecturerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `company_evaluations` (
    `id` VARCHAR(30) NOT NULL,
    `appointmentId` VARCHAR(30) NOT NULL,
    `evaluatorId` VARCHAR(30) NOT NULL,
    `rubricVersion` INTEGER NOT NULL DEFAULT 1,
    `status` ENUM('DRAFT', 'SUBMITTED') NOT NULL DEFAULT 'DRAFT',
    `workRelevanceScore` TINYINT UNSIGNED NULL,
    `workChallengeScore` TINYINT UNSIGNED NULL,
    `learningOpportunityScore` TINYINT UNSIGNED NULL,
    `supervisorReadinessScore` TINYINT UNSIGNED NULL,
    `studentSupportScore` TINYINT UNSIGNED NULL,
    `environmentScore` TINYINT UNSIGNED NULL,
    `safetyScore` TINYINT UNSIGNED NULL,
    `resourceReadinessScore` TINYINT UNSIGNED NULL,
    `allowanceScore` TINYINT UNSIGNED NULL,
    `transportationScore` TINYINT UNSIGNED NULL,
    `publicTransportScore` TINYINT UNSIGNED NULL,
    `nearbyAccommodationScore` TINYINT UNSIGNED NULL,
    `universityCoordinationScore` TINYINT UNSIGNED NULL,
    `recommendation` ENUM('RECOMMENDED', 'CONDITIONAL', 'FOLLOW_UP', 'NOT_RECOMMENDED', 'SAFETY_RISK') NULL,
    `observations` LONGTEXT NULL,
    `companyRequirements` LONGTEXT NULL,
    `issues` LONGTEXT NULL,
    `suggestions` LONGTEXT NULL,
    `submittedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `company_evaluations_appointmentId_key`(`appointmentId`),
    INDEX `company_evaluations_evaluatorId_status_idx`(`evaluatorId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` VARCHAR(30) NOT NULL,
    `type` VARCHAR(100) NOT NULL,
    `severity` ENUM('INFO', 'WARNING', 'SUCCESS', 'ERROR') NOT NULL DEFAULT 'INFO',
    `title` VARCHAR(255) NOT NULL,
    `body` TEXT NOT NULL,
    `deepLink` VARCHAR(500) NULL,
    `placementRequestId` VARCHAR(30) NULL,
    `letterBatchId` VARCHAR(30) NULL,
    `appointmentId` VARCHAR(30) NULL,
    `createdById` VARCHAR(30) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifications_placementRequestId_idx`(`placementRequestId`),
    INDEX `notifications_letterBatchId_idx`(`letterBatchId`),
    INDEX `notifications_appointmentId_idx`(`appointmentId`),
    INDEX `notifications_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_recipients` (
    `id` VARCHAR(30) NOT NULL,
    `notificationId` VARCHAR(30) NOT NULL,
    `accountId` VARCHAR(30) NOT NULL,
    `deliveredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `readAt` DATETIME(3) NULL,

    INDEX `notification_recipients_accountId_readAt_deliveredAt_idx`(`accountId`, `readAt`, `deliveredAt`),
    UNIQUE INDEX `notification_recipients_notificationId_accountId_key`(`notificationId`, `accountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `calendar_events` (
    `id` VARCHAR(30) NOT NULL,
    `eventType` ENUM('SUPERVISION', 'DOCUMENT', 'DEADLINE', 'EVALUATION', 'GENERAL') NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `startsAt` DATETIME(3) NOT NULL,
    `endsAt` DATETIME(3) NULL,
    `isAllDay` BOOLEAN NOT NULL DEFAULT false,
    `ownerAccountId` VARCHAR(30) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `calendar_events_startsAt_endsAt_idx`(`startsAt`, `endsAt`),
    INDEX `calendar_events_ownerAccountId_startsAt_idx`(`ownerAccountId`, `startsAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_actorAccountId_fkey` FOREIGN KEY (`actorAccountId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `coop_cycle_status_history` ADD CONSTRAINT `coop_cycle_status_history_cycleId_fkey` FOREIGN KEY (`cycleId`) REFERENCES `coop_cycles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `coop_cycle_status_history` ADD CONSTRAINT `coop_cycle_status_history_changedById_fkey` FOREIGN KEY (`changedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cycle_enrollments` ADD CONSTRAINT `cycle_enrollments_cycleId_fkey` FOREIGN KEY (`cycleId`) REFERENCES `coop_cycles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cycle_enrollments` ADD CONSTRAINT `cycle_enrollments_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cycle_enrollments` ADD CONSTRAINT `cycle_enrollments_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `companies` ADD CONSTRAINT `companies_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_sites` ADD CONSTRAINT `company_sites_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_sites` ADD CONSTRAINT `company_sites_provinceId_fkey` FOREIGN KEY (`provinceId`) REFERENCES `provinces`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_applications` ADD CONSTRAINT `student_applications_enrollmentId_fkey` FOREIGN KEY (`enrollmentId`) REFERENCES `cycle_enrollments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_applications` ADD CONSTRAINT `student_applications_companySiteId_fkey` FOREIGN KEY (`companySiteId`) REFERENCES `company_sites`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `placement_requests` ADD CONSTRAINT `placement_requests_enrollmentId_fkey` FOREIGN KEY (`enrollmentId`) REFERENCES `cycle_enrollments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `placement_requests` ADD CONSTRAINT `placement_requests_studentApplicationId_fkey` FOREIGN KEY (`studentApplicationId`) REFERENCES `student_applications`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `placement_requests` ADD CONSTRAINT `placement_requests_companySiteId_fkey` FOREIGN KEY (`companySiteId`) REFERENCES `company_sites`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `placement_requests` ADD CONSTRAINT `placement_requests_confirmedById_fkey` FOREIGN KEY (`confirmedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `placement_request_status_history` ADD CONSTRAINT `placement_request_status_history_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `placement_requests`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `placement_request_status_history` ADD CONSTRAINT `placement_request_status_history_changedById_fkey` FOREIGN KEY (`changedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `letter_batches` ADD CONSTRAINT `letter_batches_cycleId_fkey` FOREIGN KEY (`cycleId`) REFERENCES `coop_cycles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `letter_batches` ADD CONSTRAINT `letter_batches_companySiteId_fkey` FOREIGN KEY (`companySiteId`) REFERENCES `company_sites`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `letter_batches` ADD CONSTRAINT `letter_batches_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `letter_batches` ADD CONSTRAINT `letter_batches_issuedById_fkey` FOREIGN KEY (`issuedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `letter_batch_members` ADD CONSTRAINT `letter_batch_members_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `letter_batches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `letter_batch_members` ADD CONSTRAINT `letter_batch_members_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `placement_requests`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `letter_document_versions` ADD CONSTRAINT `letter_document_versions_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `letter_batches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `letter_document_versions` ADD CONSTRAINT `letter_document_versions_placementRequestId_fkey` FOREIGN KEY (`placementRequestId`) REFERENCES `placement_requests`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `letter_document_versions` ADD CONSTRAINT `letter_document_versions_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `letter_document_versions` ADD CONSTRAINT `letter_document_versions_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supervision_groups` ADD CONSTRAINT `supervision_groups_cycleId_fkey` FOREIGN KEY (`cycleId`) REFERENCES `coop_cycles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supervision_groups` ADD CONSTRAINT `supervision_groups_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supervision_group_lecturers` ADD CONSTRAINT `supervision_group_lecturers_groupId_cycleId_round_fkey` FOREIGN KEY (`groupId`, `cycleId`, `round`) REFERENCES `supervision_groups`(`id`, `cycleId`, `round`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supervision_group_lecturers` ADD CONSTRAINT `supervision_group_lecturers_lecturerId_fkey` FOREIGN KEY (`lecturerId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supervision_group_companies` ADD CONSTRAINT `supervision_group_companies_groupId_cycleId_round_fkey` FOREIGN KEY (`groupId`, `cycleId`, `round`) REFERENCES `supervision_groups`(`id`, `cycleId`, `round`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supervision_group_companies` ADD CONSTRAINT `supervision_group_companies_companySiteId_fkey` FOREIGN KEY (`companySiteId`) REFERENCES `company_sites`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supervision_appointments` ADD CONSTRAINT `supervision_appointments_groupCompanyId_fkey` FOREIGN KEY (`groupCompanyId`) REFERENCES `supervision_group_companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supervision_appointments` ADD CONSTRAINT `supervision_appointments_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supervision_appointments` ADD CONSTRAINT `supervision_appointments_publishedById_fkey` FOREIGN KEY (`publishedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supervision_appointments` ADD CONSTRAINT `supervision_appointments_resultRecordedById_fkey` FOREIGN KEY (`resultRecordedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supervision_appointment_lecturers` ADD CONSTRAINT `supervision_appointment_lecturers_appointmentId_fkey` FOREIGN KEY (`appointmentId`) REFERENCES `supervision_appointments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supervision_appointment_lecturers` ADD CONSTRAINT `supervision_appointment_lecturers_lecturerId_fkey` FOREIGN KEY (`lecturerId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supervision_appointment_students` ADD CONSTRAINT `supervision_appointment_students_appointmentId_fkey` FOREIGN KEY (`appointmentId`) REFERENCES `supervision_appointments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supervision_appointment_students` ADD CONSTRAINT `supervision_appointment_students_placementRequestId_fkey` FOREIGN KEY (`placementRequestId`) REFERENCES `placement_requests`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_evaluations` ADD CONSTRAINT `student_evaluations_appointmentStudentId_fkey` FOREIGN KEY (`appointmentStudentId`) REFERENCES `supervision_appointment_students`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_evaluations` ADD CONSTRAINT `student_evaluations_evaluatorLecturerId_fkey` FOREIGN KEY (`evaluatorLecturerId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_evaluations` ADD CONSTRAINT `company_evaluations_appointmentId_fkey` FOREIGN KEY (`appointmentId`) REFERENCES `supervision_appointments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_evaluations` ADD CONSTRAINT `company_evaluations_evaluatorId_fkey` FOREIGN KEY (`evaluatorId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_placementRequestId_fkey` FOREIGN KEY (`placementRequestId`) REFERENCES `placement_requests`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_letterBatchId_fkey` FOREIGN KEY (`letterBatchId`) REFERENCES `letter_batches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_appointmentId_fkey` FOREIGN KEY (`appointmentId`) REFERENCES `supervision_appointments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_recipients` ADD CONSTRAINT `notification_recipients_notificationId_fkey` FOREIGN KEY (`notificationId`) REFERENCES `notifications`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_recipients` ADD CONSTRAINT `notification_recipients_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar_events` ADD CONSTRAINT `calendar_events_ownerAccountId_fkey` FOREIGN KEY (`ownerAccountId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
