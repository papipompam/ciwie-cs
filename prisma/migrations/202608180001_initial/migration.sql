-- CreateTable
CREATE TABLE `users` (
    `id` CHAR(36) NOT NULL,
    `identifier` VARCHAR(191) NOT NULL,
    `normalized_identifier` VARCHAR(191) NOT NULL,
    `email` VARCHAR(320) NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `role` ENUM('STUDENT', 'LECTURER', 'ADMIN') NOT NULL,
    `status` ENUM('PENDING', 'ACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'PENDING',
    `session_version` INTEGER NOT NULL DEFAULT 1,
    `must_change_password` BOOLEAN NOT NULL DEFAULT true,
    `last_login_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_normalized_identifier_key`(`normalized_identifier`),
    INDEX `users_role_status_idx`(`role`, `status`),
    INDEX `users_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `activation_codes` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `token_hash` CHAR(64) NOT NULL,
    `status` ENUM('ACTIVE', 'USED', 'REVOKED') NOT NULL DEFAULT 'ACTIVE',
    `expires_at` DATETIME(3) NOT NULL,
    `used_at` DATETIME(3) NULL,
    `revoked_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `activation_codes_token_hash_key`(`token_hash`),
    INDEX `activation_codes_user_id_expires_at_idx`(`user_id`, `expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `password_reset_tokens` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `token_hash` CHAR(64) NOT NULL,
    `status` ENUM('ACTIVE', 'USED', 'REVOKED') NOT NULL DEFAULT 'ACTIVE',
    `expires_at` DATETIME(3) NOT NULL,
    `used_at` DATETIME(3) NULL,
    `revoked_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `password_reset_tokens_token_hash_key`(`token_hash`),
    INDEX `password_reset_tokens_user_id_expires_at_idx`(`user_id`, `expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_sessions` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `session_hash` CHAR(64) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `revoked_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_sessions_session_hash_key`(`session_hash`),
    INDEX `user_sessions_user_id_revoked_at_expires_at_idx`(`user_id`, `revoked_at`, `expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student_profiles` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `student_code` VARCHAR(32) NOT NULL,
    `first_name_th` VARCHAR(100) NOT NULL,
    `last_name_th` VARCHAR(100) NOT NULL,
    `phone` VARCHAR(32) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `student_profiles_user_id_key`(`user_id`),
    UNIQUE INDEX `student_profiles_student_code_key`(`student_code`),
    INDEX `student_profiles_last_name_th_first_name_th_idx`(`last_name_th`, `first_name_th`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lecturer_profiles` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `employee_code` VARCHAR(32) NULL,
    `first_name_th` VARCHAR(100) NOT NULL,
    `last_name_th` VARCHAR(100) NOT NULL,
    `phone` VARCHAR(32) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `lecturer_profiles_user_id_key`(`user_id`),
    UNIQUE INDEX `lecturer_profiles_employee_code_key`(`employee_code`),
    INDEX `lecturer_profiles_last_name_th_first_name_th_idx`(`last_name_th`, `first_name_th`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `coop_terms` (
    `id` CHAR(36) NOT NULL,
    `academic_year` INTEGER NOT NULL,
    `semester` INTEGER NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `starts_on` DATE NOT NULL,
    `ends_on` DATE NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `coop_terms_is_active_starts_on_idx`(`is_active`, `starts_on`),
    UNIQUE INDEX `coop_terms_academic_year_semester_key`(`academic_year`, `semester`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student_term_enrollments` (
    `id` CHAR(36) NOT NULL,
    `student_id` CHAR(36) NOT NULL,
    `coop_term_id` CHAR(36) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `student_term_enrollments_coop_term_id_created_at_idx`(`coop_term_id`, `created_at`),
    UNIQUE INDEX `student_term_enrollments_student_id_coop_term_id_key`(`student_id`, `coop_term_id`),
    UNIQUE INDEX `student_term_enrollments_id_coop_term_id_key`(`id`, `coop_term_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `organizations` (
    `id` CHAR(36) NOT NULL,
    `name_th` VARCHAR(255) NOT NULL,
    `name_en` VARCHAR(255) NULL,
    `normalized_name` VARCHAR(255) NOT NULL,
    `tax_id` VARCHAR(32) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_by_id` CHAR(36) NOT NULL,
    `updated_by_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `organizations_tax_id_key`(`tax_id`),
    INDEX `organizations_normalized_name_idx`(`normalized_name`),
    INDEX `organizations_is_active_name_th_idx`(`is_active`, `name_th`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `work_sites` (
    `id` CHAR(36) NOT NULL,
    `organization_id` CHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `normalized_name` VARCHAR(255) NOT NULL,
    `address_line` VARCHAR(500) NOT NULL,
    `province` VARCHAR(100) NOT NULL,
    `region` VARCHAR(100) NOT NULL,
    `postal_code` VARCHAR(10) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `work_sites_province_normalized_name_idx`(`province`, `normalized_name`),
    INDEX `work_sites_region_province_idx`(`region`, `province`),
    UNIQUE INDEX `work_sites_organization_id_normalized_name_key`(`organization_id`, `normalized_name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `organization_contacts` (
    `id` CHAR(36) NOT NULL,
    `organization_id` CHAR(36) NOT NULL,
    `work_site_id` CHAR(36) NULL,
    `name` VARCHAR(200) NOT NULL,
    `position` VARCHAR(150) NULL,
    `email` VARCHAR(320) NULL,
    `phone` VARCHAR(32) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `organization_contacts_organization_id_is_active_idx`(`organization_id`, `is_active`),
    INDEX `organization_contacts_work_site_id_is_active_idx`(`work_site_id`, `is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `organization_aliases` (
    `id` CHAR(36) NOT NULL,
    `organization_id` CHAR(36) NOT NULL,
    `normalized_alias` VARCHAR(255) NOT NULL,
    `display_alias` VARCHAR(255) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `organization_aliases_normalized_alias_key`(`normalized_alias`),
    INDEX `organization_aliases_organization_id_idx`(`organization_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `organization_merge_history` (
    `id` CHAR(36) NOT NULL,
    `source_organization_id` CHAR(36) NOT NULL,
    `target_organization_id` CHAR(36) NOT NULL,
    `actor_id` CHAR(36) NOT NULL,
    `reason` VARCHAR(1000) NOT NULL,
    `source_snapshot` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `organization_merge_history_source_organization_id_created_at_idx`(`source_organization_id`, `created_at`),
    INDEX `organization_merge_history_target_organization_id_created_at_idx`(`target_organization_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `applications` (
    `id` CHAR(36) NOT NULL,
    `student_term_id` CHAR(36) NOT NULL,
    `coop_term_id` CHAR(36) NOT NULL,
    `work_site_id` CHAR(36) NOT NULL,
    `contact_id` CHAR(36) NULL,
    `contact_snapshot` JSON NULL,
    `status` ENUM('SUBMITTED', 'WAITING_RESPONSE', 'INTERVIEW_PENDING', 'PRELIMINARY_ACCEPTED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'SUBMITTED',
    `position_title` VARCHAR(255) NULL,
    `applied_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `version` INTEGER NOT NULL DEFAULT 1,
    `created_by_id` CHAR(36) NOT NULL,
    `updated_by_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `applications_student_term_id_status_idx`(`student_term_id`, `status`),
    INDEX `applications_work_site_id_status_applied_at_idx`(`work_site_id`, `status`, `applied_at`),
    INDEX `applications_contact_id_idx`(`contact_id`),
    UNIQUE INDEX `applications_id_coop_term_id_work_site_id_key`(`id`, `coop_term_id`, `work_site_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `application_status_history` (
    `id` CHAR(36) NOT NULL,
    `application_id` CHAR(36) NOT NULL,
    `from_status` ENUM('SUBMITTED', 'WAITING_RESPONSE', 'INTERVIEW_PENDING', 'PRELIMINARY_ACCEPTED', 'REJECTED', 'CANCELLED') NULL,
    `to_status` ENUM('SUBMITTED', 'WAITING_RESPONSE', 'INTERVIEW_PENDING', 'PRELIMINARY_ACCEPTED', 'REJECTED', 'CANCELLED') NOT NULL,
    `actor_id` CHAR(36) NOT NULL,
    `reason` VARCHAR(1000) NULL,
    `snapshot` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `application_status_history_application_id_created_at_idx`(`application_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `files` (
    `id` CHAR(36) NOT NULL,
    `original_filename` VARCHAR(255) NOT NULL,
    `created_by_id` CHAR(36) NOT NULL,
    `visibility` ENUM('PRIVATE', 'STUDENT_VISIBLE', 'STAFF_ONLY') NOT NULL DEFAULT 'PRIVATE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `files_created_by_id_created_at_idx`(`created_by_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `file_versions` (
    `id` CHAR(36) NOT NULL,
    `file_id` CHAR(36) NOT NULL,
    `revision` INTEGER NOT NULL,
    `object_key` VARCHAR(512) NOT NULL,
    `checksum_sha256` CHAR(64) NOT NULL,
    `mime_type` VARCHAR(255) NOT NULL,
    `extension` VARCHAR(16) NOT NULL,
    `size_bytes` BIGINT UNSIGNED NOT NULL,
    `scan_status` ENUM('UPLOADED', 'PENDING_SCAN', 'CLEAN', 'REJECTED') NOT NULL DEFAULT 'UPLOADED',
    `scan_reason` VARCHAR(500) NULL,
    `created_by_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `file_versions_object_key_key`(`object_key`),
    INDEX `file_versions_checksum_sha256_idx`(`checksum_sha256`),
    INDEX `file_versions_scan_status_created_at_idx`(`scan_status`, `created_at`),
    UNIQUE INDEX `file_versions_file_id_revision_key`(`file_id`, `revision`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `application_evidence_files` (
    `id` CHAR(36) NOT NULL,
    `application_id` CHAR(36) NOT NULL,
    `file_version_id` CHAR(36) NOT NULL,
    `visibility` ENUM('PRIVATE', 'STUDENT_VISIBLE', 'STAFF_ONLY') NOT NULL DEFAULT 'STUDENT_VISIBLE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `application_evidence_files_application_id_file_version_id_key`(`application_id`, `file_version_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `document_requests` (
    `id` CHAR(36) NOT NULL,
    `student_term_id` CHAR(36) NOT NULL,
    `application_id` CHAR(36) NOT NULL,
    `coop_term_id` CHAR(36) NOT NULL,
    `work_site_id` CHAR(36) NOT NULL,
    `status` ENUM('REQUESTED', 'IN_PROGRESS', 'READY_TO_SEND', 'CANCELLED') NOT NULL DEFAULT 'REQUESTED',
    `requested_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by_id` CHAR(36) NOT NULL,
    `updated_by_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `document_requests_coop_term_id_work_site_id_status_idx`(`coop_term_id`, `work_site_id`, `status`),
    INDEX `document_requests_student_term_id_status_idx`(`student_term_id`, `status`),
    UNIQUE INDEX `document_requests_id_student_term_id_coop_term_id_work_site__key`(`id`, `student_term_id`, `coop_term_id`, `work_site_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `document_batches` (
    `id` CHAR(36) NOT NULL,
    `coop_term_id` CHAR(36) NOT NULL,
    `work_site_id` CHAR(36) NOT NULL,
    `status` ENUM('DRAFT', 'READY_TO_SEND', 'SENT', 'CLOSED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `document_type` VARCHAR(64) NOT NULL,
    `document_no` VARCHAR(100) NULL,
    `document_year` INTEGER NULL,
    `document_date` DATE NULL,
    `lock_version` INTEGER NOT NULL DEFAULT 1,
    `created_by_id` CHAR(36) NOT NULL,
    `updated_by_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `document_batches_coop_term_id_work_site_id_status_idx`(`coop_term_id`, `work_site_id`, `status`),
    UNIQUE INDEX `document_batches_id_coop_term_id_work_site_id_key`(`id`, `coop_term_id`, `work_site_id`),
    UNIQUE INDEX `document_batches_document_year_document_type_document_no_key`(`document_year`, `document_type`, `document_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `document_batch_members` (
    `id` CHAR(36) NOT NULL,
    `batch_id` CHAR(36) NOT NULL,
    `request_id` CHAR(36) NOT NULL,
    `student_term_id` CHAR(36) NOT NULL,
    `coop_term_id` CHAR(36) NOT NULL,
    `work_site_id` CHAR(36) NOT NULL,
    `snapshot` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `document_batch_members_request_id_key`(`request_id`),
    INDEX `document_batch_members_coop_term_id_work_site_id_student_ter_idx`(`coop_term_id`, `work_site_id`, `student_term_id`),
    UNIQUE INDEX `document_batch_members_batch_id_student_term_id_key`(`batch_id`, `student_term_id`),
    UNIQUE INDEX `document_batch_members_id_batch_id_key`(`id`, `batch_id`),
    UNIQUE INDEX `document_batch_members_id_batch_id_student_term_id_coop_term_key`(`id`, `batch_id`, `student_term_id`, `coop_term_id`, `work_site_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `document_batch_student_slots` (
    `id` CHAR(36) NOT NULL,
    `batch_member_id` CHAR(36) NOT NULL,
    `batch_id` CHAR(36) NOT NULL,
    `student_term_id` CHAR(36) NOT NULL,
    `coop_term_id` CHAR(36) NOT NULL,
    `work_site_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `document_batch_student_slots_batch_member_id_key`(`batch_member_id`),
    INDEX `document_batch_student_slots_batch_id_student_term_id_idx`(`batch_id`, `student_term_id`),
    UNIQUE INDEX `document_batch_student_slots_student_term_id_coop_term_id_wo_key`(`student_term_id`, `coop_term_id`, `work_site_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `document_versions` (
    `id` CHAR(36) NOT NULL,
    `batch_id` CHAR(36) NOT NULL,
    `revision` INTEGER NOT NULL,
    `kind` VARCHAR(64) NOT NULL,
    `file_version_id` CHAR(36) NOT NULL,
    `created_by_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `document_versions_batch_id_kind_revision_key`(`batch_id`, `kind`, `revision`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `deliveries` (
    `id` CHAR(36) NOT NULL,
    `batch_id` CHAR(36) NOT NULL,
    `status` ENUM('ASSIGNED', 'SENT', 'WAITING_RESPONSE', 'RESPONSE_RECEIVED') NOT NULL DEFAULT 'ASSIGNED',
    `owner_type` ENUM('STUDENT', 'LECTURER') NOT NULL,
    `owner_user_id` CHAR(36) NOT NULL,
    `channel` VARCHAR(100) NULL,
    `recipient` VARCHAR(255) NULL,
    `sent_at` DATETIME(3) NULL,
    `acknowledged_at` DATETIME(3) NULL,
    `note` VARCHAR(1000) NULL,
    `created_by_id` CHAR(36) NOT NULL,
    `updated_by_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `deliveries_batch_id_status_sent_at_idx`(`batch_id`, `status`, `sent_at`),
    INDEX `deliveries_owner_user_id_status_idx`(`owner_user_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `delivery_history` (
    `id` CHAR(36) NOT NULL,
    `delivery_id` CHAR(36) NOT NULL,
    `from_status` ENUM('ASSIGNED', 'SENT', 'WAITING_RESPONSE', 'RESPONSE_RECEIVED') NULL,
    `to_status` ENUM('ASSIGNED', 'SENT', 'WAITING_RESPONSE', 'RESPONSE_RECEIVED') NOT NULL,
    `actor_id` CHAR(36) NOT NULL,
    `reason` VARCHAR(1000) NULL,
    `snapshot` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `delivery_history_delivery_id_created_at_idx`(`delivery_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `delivery_evidence_files` (
    `id` CHAR(36) NOT NULL,
    `delivery_id` CHAR(36) NOT NULL,
    `file_version_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `delivery_evidence_files_delivery_id_file_version_id_key`(`delivery_id`, `file_version_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `response_forms` (
    `id` CHAR(36) NOT NULL,
    `batch_id` CHAR(36) NOT NULL,
    `revision` INTEGER NOT NULL,
    `file_version_id` CHAR(36) NOT NULL,
    `status` ENUM('DRAFT', 'PENDING_REVIEW', 'CONFIRMED') NOT NULL DEFAULT 'DRAFT',
    `uploaded_by_id` CHAR(36) NOT NULL,
    `submitted_at` DATETIME(3) NULL,
    `confirmed_at` DATETIME(3) NULL,
    `confirmed_by_id` CHAR(36) NULL,
    `lock_version` INTEGER NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `response_forms_batch_id_status_idx`(`batch_id`, `status`),
    UNIQUE INDEX `response_forms_batch_id_revision_key`(`batch_id`, `revision`),
    UNIQUE INDEX `response_forms_id_batch_id_key`(`id`, `batch_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `response_student_results` (
    `id` CHAR(36) NOT NULL,
    `response_form_id` CHAR(36) NOT NULL,
    `batch_member_id` CHAR(36) NOT NULL,
    `batch_id` CHAR(36) NOT NULL,
    `result` ENUM('ACCEPTED', 'DECLINED') NOT NULL,
    `note` VARCHAR(1000) NULL,
    `confirmed_by_id` CHAR(36) NULL,
    `confirmed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `response_student_results_batch_id_result_idx`(`batch_id`, `result`),
    INDEX `response_student_results_batch_member_id_result_idx`(`batch_member_id`, `result`),
    UNIQUE INDEX `response_student_results_response_form_id_batch_member_id_key`(`response_form_id`, `batch_member_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `placements` (
    `id` CHAR(36) NOT NULL,
    `student_term_id` CHAR(36) NOT NULL,
    `current_work_site_id` CHAR(36) NOT NULL,
    `source_response_result_id` CHAR(36) NOT NULL,
    `status` ENUM('ACTIVE', 'REVERSED') NOT NULL DEFAULT 'ACTIVE',
    `version` INTEGER NOT NULL DEFAULT 1,
    `confirmed_by_id` CHAR(36) NOT NULL,
    `confirmed_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `placements_student_term_id_key`(`student_term_id`),
    UNIQUE INDEX `placements_source_response_result_id_key`(`source_response_result_id`),
    INDEX `placements_current_work_site_id_status_idx`(`current_work_site_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `placement_versions` (
    `id` CHAR(36) NOT NULL,
    `placement_id` CHAR(36) NOT NULL,
    `version` INTEGER NOT NULL,
    `snapshot` JSON NOT NULL,
    `reason` VARCHAR(1000) NOT NULL,
    `actor_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `placement_versions_placement_id_version_key`(`placement_id`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `supervision_visits` (
    `id` CHAR(36) NOT NULL,
    `coop_term_id` CHAR(36) NOT NULL,
    `work_site_id` CHAR(36) NOT NULL,
    `round` ENUM('ROUND_1', 'ROUND_2') NOT NULL,
    `visit_date` DATE NOT NULL,
    `period` ENUM('MORNING', 'AFTERNOON', 'FULL_DAY') NOT NULL,
    `status` ENUM('SCHEDULED', 'POSTPONED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
    `lock_version` INTEGER NOT NULL DEFAULT 1,
    `created_by_id` CHAR(36) NOT NULL,
    `updated_by_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `supervision_visits_coop_term_id_round_visit_date_period_stat_idx`(`coop_term_id`, `round`, `visit_date`, `period`, `status`),
    INDEX `supervision_visits_work_site_id_visit_date_period_idx`(`work_site_id`, `visit_date`, `period`),
    UNIQUE INDEX `supervision_visits_id_coop_term_id_key`(`id`, `coop_term_id`),
    UNIQUE INDEX `supervision_visits_id_visit_date_period_key`(`id`, `visit_date`, `period`),
    UNIQUE INDEX `supervision_visits_id_round_visit_date_period_key`(`id`, `round`, `visit_date`, `period`),
    UNIQUE INDEX `supervision_visits_id_work_site_id_visit_date_period_key`(`id`, `work_site_id`, `visit_date`, `period`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `visit_students` (
    `id` CHAR(36) NOT NULL,
    `visit_id` CHAR(36) NOT NULL,
    `student_term_id` CHAR(36) NOT NULL,
    `coop_term_id` CHAR(36) NOT NULL,
    `acknowledgement_status` ENUM('PENDING', 'ACKNOWLEDGED') NOT NULL DEFAULT 'PENDING',
    `acknowledged_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `visit_students_student_term_id_coop_term_id_idx`(`student_term_id`, `coop_term_id`),
    INDEX `visit_students_student_term_id_acknowledgement_status_idx`(`student_term_id`, `acknowledgement_status`),
    UNIQUE INDEX `visit_students_visit_id_student_term_id_key`(`visit_id`, `student_term_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `visit_lecturers` (
    `id` CHAR(36) NOT NULL,
    `visit_id` CHAR(36) NOT NULL,
    `lecturer_id` CHAR(36) NOT NULL,
    `acknowledgement_status` ENUM('PENDING', 'ACKNOWLEDGED') NOT NULL DEFAULT 'PENDING',
    `acknowledged_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `visit_lecturers_lecturer_id_acknowledgement_status_idx`(`lecturer_id`, `acknowledgement_status`),
    UNIQUE INDEX `visit_lecturers_visit_id_lecturer_id_key`(`visit_id`, `lecturer_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `visit_student_slots` (
    `id` CHAR(36) NOT NULL,
    `visit_id` CHAR(36) NOT NULL,
    `student_term_id` CHAR(36) NOT NULL,
    `round` ENUM('ROUND_1', 'ROUND_2') NOT NULL,
    `visit_date` DATE NOT NULL,
    `period` ENUM('MORNING', 'AFTERNOON', 'FULL_DAY') NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `visit_student_slots_visit_id_student_term_id_key`(`visit_id`, `student_term_id`),
    UNIQUE INDEX `visit_student_slots_student_term_id_round_key`(`student_term_id`, `round`),
    UNIQUE INDEX `visit_student_slots_student_term_id_visit_date_period_key`(`student_term_id`, `visit_date`, `period`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `visit_lecturer_slots` (
    `id` CHAR(36) NOT NULL,
    `visit_id` CHAR(36) NOT NULL,
    `lecturer_id` CHAR(36) NOT NULL,
    `visit_date` DATE NOT NULL,
    `period` ENUM('MORNING', 'AFTERNOON', 'FULL_DAY') NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `visit_lecturer_slots_visit_id_lecturer_id_key`(`visit_id`, `lecturer_id`),
    UNIQUE INDEX `visit_lecturer_slots_lecturer_id_visit_date_period_key`(`lecturer_id`, `visit_date`, `period`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `visit_work_site_slots` (
    `id` CHAR(36) NOT NULL,
    `visit_id` CHAR(36) NOT NULL,
    `work_site_id` CHAR(36) NOT NULL,
    `visit_date` DATE NOT NULL,
    `period` ENUM('MORNING', 'AFTERNOON', 'FULL_DAY') NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `visit_work_site_slots_visit_id_key`(`visit_id`),
    UNIQUE INDEX `visit_work_site_slots_work_site_id_visit_date_period_key`(`work_site_id`, `visit_date`, `period`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `supervision_results` (
    `id` CHAR(36) NOT NULL,
    `visit_student_id` CHAR(36) NOT NULL,
    `outcome` ENUM('COMPLETED', 'ABSENT', 'MAKEUP_REQUIRED') NOT NULL,
    `summary` TEXT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `submitted_by_id` CHAR(36) NOT NULL,
    `submitted_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `supervision_results_visit_student_id_key`(`visit_student_id`),
    INDEX `supervision_results_outcome_submitted_at_idx`(`outcome`, `submitted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `supervision_result_versions` (
    `id` CHAR(36) NOT NULL,
    `supervision_result_id` CHAR(36) NOT NULL,
    `version` INTEGER NOT NULL,
    `snapshot` JSON NOT NULL,
    `reason` VARCHAR(1000) NOT NULL,
    `actor_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `supervision_result_versions_supervision_result_id_version_key`(`supervision_result_id`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `supervision_visit_history` (
    `id` CHAR(36) NOT NULL,
    `visit_id` CHAR(36) NOT NULL,
    `action` VARCHAR(64) NOT NULL,
    `snapshot` JSON NOT NULL,
    `actor_id` CHAR(36) NOT NULL,
    `reason` VARCHAR(1000) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `supervision_visit_history_visit_id_created_at_idx`(`visit_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `internal_notes` (
    `id` CHAR(36) NOT NULL,
    `visit_id` CHAR(36) NOT NULL,
    `author_id` CHAR(36) NOT NULL,
    `visibility` ENUM('PRIVATE', 'STUDENT_VISIBLE', 'STAFF_ONLY') NOT NULL DEFAULT 'STAFF_ONLY',
    `content` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `internal_notes_visit_id_created_at_idx`(`visit_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `company_requirements` (
    `id` CHAR(36) NOT NULL,
    `visit_id` CHAR(36) NOT NULL,
    `placement_id` CHAR(36) NULL,
    `category` VARCHAR(100) NOT NULL,
    `technology` VARCHAR(255) NULL,
    `detail` TEXT NOT NULL,
    `author_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `company_requirements_visit_id_category_idx`(`visit_id`, `category`),
    INDEX `company_requirements_placement_id_created_at_idx`(`placement_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `evaluation_templates` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(64) NOT NULL,
    `subject` ENUM('STUDENT', 'ORGANIZATION') NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_by_id` CHAR(36) NOT NULL,
    `updated_by_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `evaluation_templates_code_key`(`code`),
    INDEX `evaluation_templates_subject_is_active_idx`(`subject`, `is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `evaluation_template_versions` (
    `id` CHAR(36) NOT NULL,
    `template_id` CHAR(36) NOT NULL,
    `version` INTEGER NOT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'RETIRED') NOT NULL DEFAULT 'DRAFT',
    `content_hash` CHAR(64) NOT NULL,
    `published_at` DATETIME(3) NULL,
    `published_by_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `evaluation_template_versions_template_id_status_idx`(`template_id`, `status`),
    UNIQUE INDEX `evaluation_template_versions_template_id_version_key`(`template_id`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `evaluation_items` (
    `id` CHAR(36) NOT NULL,
    `template_version_id` CHAR(36) NOT NULL,
    `code` VARCHAR(64) NOT NULL,
    `label` VARCHAR(500) NOT NULL,
    `answer_type` ENUM('SCORE', 'TEXT', 'BOOLEAN') NOT NULL,
    `required` BOOLEAN NOT NULL DEFAULT true,
    `max_score` DECIMAL(8, 2) NULL,
    `weight` DECIMAL(8, 4) NULL,
    `sort_order` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `evaluation_items_template_version_id_code_key`(`template_version_id`, `code`),
    UNIQUE INDEX `evaluation_items_template_version_id_sort_order_key`(`template_version_id`, `sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student_evaluations` (
    `id` CHAR(36) NOT NULL,
    `visit_student_id` CHAR(36) NOT NULL,
    `template_version_id` CHAR(36) NOT NULL,
    `template_id` CHAR(36) NOT NULL,
    `status` ENUM('DRAFT', 'SUBMITTED') NOT NULL DEFAULT 'DRAFT',
    `version` INTEGER NOT NULL DEFAULT 1,
    `submitted_at` DATETIME(3) NULL,
    `submitted_by_id` CHAR(36) NULL,
    `created_by_id` CHAR(36) NOT NULL,
    `updated_by_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `student_evaluations_status_submitted_at_idx`(`status`, `submitted_at`),
    UNIQUE INDEX `student_evaluations_visit_student_id_template_id_key`(`visit_student_id`, `template_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student_evaluation_answers` (
    `id` CHAR(36) NOT NULL,
    `evaluation_id` CHAR(36) NOT NULL,
    `item_id` CHAR(36) NOT NULL,
    `item_snapshot` JSON NOT NULL,
    `score_value` DECIMAL(8, 2) NULL,
    `text_value` TEXT NULL,
    `boolean_value` BOOLEAN NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `student_evaluation_answers_evaluation_id_item_id_key`(`evaluation_id`, `item_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student_evaluation_versions` (
    `id` CHAR(36) NOT NULL,
    `evaluation_id` CHAR(36) NOT NULL,
    `version` INTEGER NOT NULL,
    `snapshot` JSON NOT NULL,
    `reason` VARCHAR(1000) NOT NULL,
    `actor_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `student_evaluation_versions_evaluation_id_version_key`(`evaluation_id`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `organization_evaluations` (
    `id` CHAR(36) NOT NULL,
    `visit_id` CHAR(36) NOT NULL,
    `template_version_id` CHAR(36) NOT NULL,
    `template_id` CHAR(36) NOT NULL,
    `status` ENUM('DRAFT', 'SUBMITTED') NOT NULL DEFAULT 'DRAFT',
    `version` INTEGER NOT NULL DEFAULT 1,
    `submitted_at` DATETIME(3) NULL,
    `submitted_by_id` CHAR(36) NULL,
    `created_by_id` CHAR(36) NOT NULL,
    `updated_by_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `organization_evaluations_status_submitted_at_idx`(`status`, `submitted_at`),
    UNIQUE INDEX `organization_evaluations_visit_id_template_id_key`(`visit_id`, `template_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `organization_evaluation_answers` (
    `id` CHAR(36) NOT NULL,
    `evaluation_id` CHAR(36) NOT NULL,
    `item_id` CHAR(36) NOT NULL,
    `item_snapshot` JSON NOT NULL,
    `score_value` DECIMAL(8, 2) NULL,
    `text_value` TEXT NULL,
    `boolean_value` BOOLEAN NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `organization_evaluation_answers_evaluation_id_item_id_key`(`evaluation_id`, `item_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `organization_evaluation_versions` (
    `id` CHAR(36) NOT NULL,
    `evaluation_id` CHAR(36) NOT NULL,
    `version` INTEGER NOT NULL,
    `snapshot` JSON NOT NULL,
    `reason` VARCHAR(1000) NOT NULL,
    `actor_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `organization_evaluation_versions_evaluation_id_version_key`(`evaluation_id`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `import_jobs` (
    `id` CHAR(36) NOT NULL,
    `requested_by_id` CHAR(36) NOT NULL,
    `source_file_version_id` CHAR(36) NOT NULL,
    `kind` VARCHAR(64) NOT NULL,
    `source_checksum` CHAR(64) NOT NULL,
    `status` ENUM('UPLOADED', 'SCANNING', 'PREVIEW_READY', 'CONFIRMING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'UPLOADED',
    `total_rows` INTEGER NOT NULL DEFAULT 0,
    `processed_rows` INTEGER NOT NULL DEFAULT 0,
    `failure_reason` VARCHAR(1000) NULL,
    `confirmed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `import_jobs_requested_by_id_status_created_at_idx`(`requested_by_id`, `status`, `created_at`),
    UNIQUE INDEX `import_jobs_requested_by_id_kind_source_checksum_key`(`requested_by_id`, `kind`, `source_checksum`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `import_rows` (
    `id` CHAR(36) NOT NULL,
    `import_job_id` CHAR(36) NOT NULL,
    `row_no` INTEGER NOT NULL,
    `status` ENUM('NEW', 'UNCHANGED', 'CONFLICT', 'INVALID', 'IMPORTED') NOT NULL,
    `normalized_hash` CHAR(64) NOT NULL,
    `normalized_data` JSON NOT NULL,
    `observed_version` INTEGER NULL,
    `errors` JSON NULL,
    `imported_entity_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `import_rows_import_job_id_status_idx`(`import_job_id`, `status`),
    UNIQUE INDEX `import_rows_import_job_id_row_no_key`(`import_job_id`, `row_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `export_jobs` (
    `id` CHAR(36) NOT NULL,
    `requested_by_id` CHAR(36) NOT NULL,
    `kind` VARCHAR(64) NOT NULL,
    `format` VARCHAR(16) NOT NULL,
    `filter_snapshot` JSON NOT NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `file_version_id` CHAR(36) NULL,
    `expires_at` DATETIME(3) NULL,
    `failure_reason` VARCHAR(1000) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `export_jobs_requested_by_id_status_created_at_idx`(`requested_by_id`, `status`, `created_at`),
    INDEX `export_jobs_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` CHAR(36) NOT NULL,
    `recipient_id` CHAR(36) NOT NULL,
    `event_type` VARCHAR(100) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `body` VARCHAR(1000) NOT NULL,
    `entity_type` VARCHAR(100) NULL,
    `entity_id` CHAR(36) NULL,
    `status` ENUM('UNREAD', 'READ') NOT NULL DEFAULT 'UNREAD',
    `read_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `notifications_recipient_id_status_created_at_idx`(`recipient_id`, `status`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `outbox_messages` (
    `id` CHAR(36) NOT NULL,
    `event_type` VARCHAR(100) NOT NULL,
    `aggregate_type` VARCHAR(100) NOT NULL,
    `aggregate_id` CHAR(36) NOT NULL,
    `dedupe_key` VARCHAR(191) NOT NULL,
    `payload` JSON NOT NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'SENT', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `next_attempt_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processed_at` DATETIME(3) NULL,
    `last_error` VARCHAR(2000) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `outbox_messages_dedupe_key_key`(`dedupe_key`),
    INDEX `outbox_messages_status_next_attempt_at_idx`(`status`, `next_attempt_at`),
    INDEX `outbox_messages_aggregate_type_aggregate_id_created_at_idx`(`aggregate_type`, `aggregate_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `idempotency_records` (
    `id` CHAR(36) NOT NULL,
    `actor_id` CHAR(36) NOT NULL,
    `operation` VARCHAR(100) NOT NULL,
    `idempotency_key` VARCHAR(191) NOT NULL,
    `request_hash` CHAR(64) NOT NULL,
    `status` ENUM('IN_PROGRESS', 'SUCCEEDED', 'FAILED') NOT NULL DEFAULT 'IN_PROGRESS',
    `response_status` INTEGER NULL,
    `response_body` JSON NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idempotency_records_expires_at_idx`(`expires_at`),
    UNIQUE INDEX `idempotency_records_actor_id_operation_idempotency_key_key`(`actor_id`, `operation`, `idempotency_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `expenses` (
    `id` CHAR(36) NOT NULL,
    `visit_id` CHAR(36) NOT NULL,
    `round` ENUM('ROUND_1', 'ROUND_2') NOT NULL,
    `travel_days` SMALLINT UNSIGNED NOT NULL,
    `travel_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `lodging_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `meal_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `total_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `note` VARCHAR(1000) NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `created_by_id` CHAR(36) NOT NULL,
    `updated_by_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `expenses_visit_id_round_created_at_idx`(`visit_id`, `round`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `expense_versions` (
    `id` CHAR(36) NOT NULL,
    `expense_id` CHAR(36) NOT NULL,
    `version` INTEGER NOT NULL,
    `snapshot` JSON NOT NULL,
    `reason` VARCHAR(1000) NOT NULL,
    `actor_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `expense_versions_expense_id_version_key`(`expense_id`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` CHAR(36) NOT NULL,
    `actor_id` CHAR(36) NULL,
    `action` VARCHAR(100) NOT NULL,
    `entity_type` VARCHAR(100) NOT NULL,
    `entity_id` CHAR(36) NOT NULL,
    `request_id` VARCHAR(100) NOT NULL,
    `reason` VARCHAR(1000) NULL,
    `before_data` JSON NULL,
    `after_data` JSON NULL,
    `ip_address` VARCHAR(45) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_entity_type_entity_id_created_at_idx`(`entity_type`, `entity_id`, `created_at`),
    INDEX `audit_logs_actor_id_created_at_idx`(`actor_id`, `created_at`),
    INDEX `audit_logs_request_id_idx`(`request_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `activation_codes` ADD CONSTRAINT `activation_codes_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `password_reset_tokens` ADD CONSTRAINT `password_reset_tokens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_sessions` ADD CONSTRAINT `user_sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_profiles` ADD CONSTRAINT `student_profiles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lecturer_profiles` ADD CONSTRAINT `lecturer_profiles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_term_enrollments` ADD CONSTRAINT `student_term_enrollments_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `student_profiles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_term_enrollments` ADD CONSTRAINT `student_term_enrollments_coop_term_id_fkey` FOREIGN KEY (`coop_term_id`) REFERENCES `coop_terms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `work_sites` ADD CONSTRAINT `work_sites_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `organization_contacts` ADD CONSTRAINT `organization_contacts_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `organization_contacts` ADD CONSTRAINT `organization_contacts_work_site_id_fkey` FOREIGN KEY (`work_site_id`) REFERENCES `work_sites`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `organization_aliases` ADD CONSTRAINT `organization_aliases_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `organization_merge_history` ADD CONSTRAINT `organization_merge_history_source_organization_id_fkey` FOREIGN KEY (`source_organization_id`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `organization_merge_history` ADD CONSTRAINT `organization_merge_history_target_organization_id_fkey` FOREIGN KEY (`target_organization_id`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `applications` ADD CONSTRAINT `applications_student_term_id_fkey` FOREIGN KEY (`student_term_id`) REFERENCES `student_term_enrollments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `applications` ADD CONSTRAINT `applications_coop_term_id_fkey` FOREIGN KEY (`coop_term_id`) REFERENCES `coop_terms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `applications` ADD CONSTRAINT `applications_work_site_id_fkey` FOREIGN KEY (`work_site_id`) REFERENCES `work_sites`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `applications` ADD CONSTRAINT `applications_contact_id_fkey` FOREIGN KEY (`contact_id`) REFERENCES `organization_contacts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `application_status_history` ADD CONSTRAINT `application_status_history_application_id_fkey` FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `file_versions` ADD CONSTRAINT `file_versions_file_id_fkey` FOREIGN KEY (`file_id`) REFERENCES `files`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `application_evidence_files` ADD CONSTRAINT `application_evidence_files_application_id_fkey` FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `application_evidence_files` ADD CONSTRAINT `application_evidence_files_file_version_id_fkey` FOREIGN KEY (`file_version_id`) REFERENCES `file_versions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `document_requests` ADD CONSTRAINT `document_requests_student_term_id_fkey` FOREIGN KEY (`student_term_id`) REFERENCES `student_term_enrollments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `document_requests` ADD CONSTRAINT `document_requests_application_id_fkey` FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `document_requests` ADD CONSTRAINT `document_requests_coop_term_id_fkey` FOREIGN KEY (`coop_term_id`) REFERENCES `coop_terms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `document_requests` ADD CONSTRAINT `document_requests_work_site_id_fkey` FOREIGN KEY (`work_site_id`) REFERENCES `work_sites`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `document_batches` ADD CONSTRAINT `document_batches_coop_term_id_fkey` FOREIGN KEY (`coop_term_id`) REFERENCES `coop_terms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `document_batches` ADD CONSTRAINT `document_batches_work_site_id_fkey` FOREIGN KEY (`work_site_id`) REFERENCES `work_sites`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `document_batch_members` ADD CONSTRAINT `document_batch_members_batch_id_fkey` FOREIGN KEY (`batch_id`) REFERENCES `document_batches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `document_batch_members` ADD CONSTRAINT `document_batch_members_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `document_requests`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `document_batch_members` ADD CONSTRAINT `document_batch_members_student_term_id_fkey` FOREIGN KEY (`student_term_id`) REFERENCES `student_term_enrollments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `document_batch_student_slots` ADD CONSTRAINT `document_batch_student_slots_batch_member_id_fkey` FOREIGN KEY (`batch_member_id`) REFERENCES `document_batch_members`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `document_batch_student_slots` ADD CONSTRAINT `document_batch_student_slots_batch_id_fkey` FOREIGN KEY (`batch_id`) REFERENCES `document_batches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `document_batch_student_slots` ADD CONSTRAINT `document_batch_student_slots_student_term_id_fkey` FOREIGN KEY (`student_term_id`) REFERENCES `student_term_enrollments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `document_versions` ADD CONSTRAINT `document_versions_batch_id_fkey` FOREIGN KEY (`batch_id`) REFERENCES `document_batches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `document_versions` ADD CONSTRAINT `document_versions_file_version_id_fkey` FOREIGN KEY (`file_version_id`) REFERENCES `file_versions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deliveries` ADD CONSTRAINT `deliveries_batch_id_fkey` FOREIGN KEY (`batch_id`) REFERENCES `document_batches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `delivery_history` ADD CONSTRAINT `delivery_history_delivery_id_fkey` FOREIGN KEY (`delivery_id`) REFERENCES `deliveries`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `delivery_evidence_files` ADD CONSTRAINT `delivery_evidence_files_delivery_id_fkey` FOREIGN KEY (`delivery_id`) REFERENCES `deliveries`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `delivery_evidence_files` ADD CONSTRAINT `delivery_evidence_files_file_version_id_fkey` FOREIGN KEY (`file_version_id`) REFERENCES `file_versions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `response_forms` ADD CONSTRAINT `response_forms_batch_id_fkey` FOREIGN KEY (`batch_id`) REFERENCES `document_batches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `response_forms` ADD CONSTRAINT `response_forms_file_version_id_fkey` FOREIGN KEY (`file_version_id`) REFERENCES `file_versions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `response_student_results` ADD CONSTRAINT `response_student_results_response_form_id_fkey` FOREIGN KEY (`response_form_id`) REFERENCES `response_forms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `response_student_results` ADD CONSTRAINT `response_student_results_batch_member_id_fkey` FOREIGN KEY (`batch_member_id`) REFERENCES `document_batch_members`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `response_student_results` ADD CONSTRAINT `response_student_results_batch_id_fkey` FOREIGN KEY (`batch_id`) REFERENCES `document_batches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `placements` ADD CONSTRAINT `placements_student_term_id_fkey` FOREIGN KEY (`student_term_id`) REFERENCES `student_term_enrollments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `placements` ADD CONSTRAINT `placements_current_work_site_id_fkey` FOREIGN KEY (`current_work_site_id`) REFERENCES `work_sites`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `placements` ADD CONSTRAINT `placements_source_response_result_id_fkey` FOREIGN KEY (`source_response_result_id`) REFERENCES `response_student_results`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `placement_versions` ADD CONSTRAINT `placement_versions_placement_id_fkey` FOREIGN KEY (`placement_id`) REFERENCES `placements`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supervision_visits` ADD CONSTRAINT `supervision_visits_coop_term_id_fkey` FOREIGN KEY (`coop_term_id`) REFERENCES `coop_terms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supervision_visits` ADD CONSTRAINT `supervision_visits_work_site_id_fkey` FOREIGN KEY (`work_site_id`) REFERENCES `work_sites`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `visit_students` ADD CONSTRAINT `visit_students_visit_id_fkey` FOREIGN KEY (`visit_id`) REFERENCES `supervision_visits`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `visit_students` ADD CONSTRAINT `visit_students_student_term_id_fkey` FOREIGN KEY (`student_term_id`) REFERENCES `student_term_enrollments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `visit_lecturers` ADD CONSTRAINT `visit_lecturers_visit_id_fkey` FOREIGN KEY (`visit_id`) REFERENCES `supervision_visits`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `visit_lecturers` ADD CONSTRAINT `visit_lecturers_lecturer_id_fkey` FOREIGN KEY (`lecturer_id`) REFERENCES `lecturer_profiles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `visit_student_slots` ADD CONSTRAINT `visit_student_slots_visit_id_fkey` FOREIGN KEY (`visit_id`) REFERENCES `supervision_visits`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `visit_lecturer_slots` ADD CONSTRAINT `visit_lecturer_slots_visit_id_fkey` FOREIGN KEY (`visit_id`) REFERENCES `supervision_visits`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `visit_work_site_slots` ADD CONSTRAINT `visit_work_site_slots_visit_id_fkey` FOREIGN KEY (`visit_id`) REFERENCES `supervision_visits`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supervision_results` ADD CONSTRAINT `supervision_results_visit_student_id_fkey` FOREIGN KEY (`visit_student_id`) REFERENCES `visit_students`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supervision_result_versions` ADD CONSTRAINT `supervision_result_versions_supervision_result_id_fkey` FOREIGN KEY (`supervision_result_id`) REFERENCES `supervision_results`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supervision_visit_history` ADD CONSTRAINT `supervision_visit_history_visit_id_fkey` FOREIGN KEY (`visit_id`) REFERENCES `supervision_visits`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `internal_notes` ADD CONSTRAINT `internal_notes_visit_id_fkey` FOREIGN KEY (`visit_id`) REFERENCES `supervision_visits`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_requirements` ADD CONSTRAINT `company_requirements_visit_id_fkey` FOREIGN KEY (`visit_id`) REFERENCES `supervision_visits`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_requirements` ADD CONSTRAINT `company_requirements_placement_id_fkey` FOREIGN KEY (`placement_id`) REFERENCES `placements`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `evaluation_template_versions` ADD CONSTRAINT `evaluation_template_versions_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `evaluation_templates`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `evaluation_items` ADD CONSTRAINT `evaluation_items_template_version_id_fkey` FOREIGN KEY (`template_version_id`) REFERENCES `evaluation_template_versions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_evaluations` ADD CONSTRAINT `student_evaluations_visit_student_id_fkey` FOREIGN KEY (`visit_student_id`) REFERENCES `visit_students`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_evaluations` ADD CONSTRAINT `student_evaluations_template_version_id_fkey` FOREIGN KEY (`template_version_id`) REFERENCES `evaluation_template_versions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_evaluations` ADD CONSTRAINT `student_evaluations_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `evaluation_templates`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_evaluation_answers` ADD CONSTRAINT `student_evaluation_answers_evaluation_id_fkey` FOREIGN KEY (`evaluation_id`) REFERENCES `student_evaluations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_evaluation_answers` ADD CONSTRAINT `student_evaluation_answers_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `evaluation_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_evaluation_versions` ADD CONSTRAINT `student_evaluation_versions_evaluation_id_fkey` FOREIGN KEY (`evaluation_id`) REFERENCES `student_evaluations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `organization_evaluations` ADD CONSTRAINT `organization_evaluations_visit_id_fkey` FOREIGN KEY (`visit_id`) REFERENCES `supervision_visits`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `organization_evaluations` ADD CONSTRAINT `organization_evaluations_template_version_id_fkey` FOREIGN KEY (`template_version_id`) REFERENCES `evaluation_template_versions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `organization_evaluations` ADD CONSTRAINT `organization_evaluations_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `evaluation_templates`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `organization_evaluation_answers` ADD CONSTRAINT `organization_evaluation_answers_evaluation_id_fkey` FOREIGN KEY (`evaluation_id`) REFERENCES `organization_evaluations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `organization_evaluation_answers` ADD CONSTRAINT `organization_evaluation_answers_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `evaluation_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `organization_evaluation_versions` ADD CONSTRAINT `organization_evaluation_versions_evaluation_id_fkey` FOREIGN KEY (`evaluation_id`) REFERENCES `organization_evaluations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `import_jobs` ADD CONSTRAINT `import_jobs_source_file_version_id_fkey` FOREIGN KEY (`source_file_version_id`) REFERENCES `file_versions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `import_rows` ADD CONSTRAINT `import_rows_import_job_id_fkey` FOREIGN KEY (`import_job_id`) REFERENCES `import_jobs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `export_jobs` ADD CONSTRAINT `export_jobs_file_version_id_fkey` FOREIGN KEY (`file_version_id`) REFERENCES `file_versions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_recipient_id_fkey` FOREIGN KEY (`recipient_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_visit_id_fkey` FOREIGN KEY (`visit_id`) REFERENCES `supervision_visits`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expense_versions` ADD CONSTRAINT `expense_versions_expense_id_fkey` FOREIGN KEY (`expense_id`) REFERENCES `expenses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Cross-aggregate consistency guards that Prisma cannot express as relation fields
-- without exposing redundant navigation properties in the generated client.
ALTER TABLE `applications`
    ADD INDEX `applications_student_term_coop_term_idx` (`student_term_id`, `coop_term_id`),
    ADD CONSTRAINT `applications_student_term_coop_term_fkey`
      FOREIGN KEY (`student_term_id`, `coop_term_id`)
      REFERENCES `student_term_enrollments` (`id`, `coop_term_id`)
      ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `document_requests`
    ADD INDEX `document_requests_application_scope_idx` (`application_id`, `coop_term_id`, `work_site_id`),
    ADD INDEX `document_requests_student_term_scope_idx` (`student_term_id`, `coop_term_id`),
    ADD CONSTRAINT `document_requests_application_scope_fkey`
      FOREIGN KEY (`application_id`, `coop_term_id`, `work_site_id`)
      REFERENCES `applications` (`id`, `coop_term_id`, `work_site_id`)
      ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `document_requests_student_term_scope_fkey`
      FOREIGN KEY (`student_term_id`, `coop_term_id`)
      REFERENCES `student_term_enrollments` (`id`, `coop_term_id`)
      ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `document_batch_members`
    ADD INDEX `batch_members_batch_scope_idx` (`batch_id`, `coop_term_id`, `work_site_id`),
    ADD INDEX `batch_members_request_scope_idx` (`request_id`, `student_term_id`, `coop_term_id`, `work_site_id`),
    ADD CONSTRAINT `batch_members_batch_scope_fkey`
      FOREIGN KEY (`batch_id`, `coop_term_id`, `work_site_id`)
      REFERENCES `document_batches` (`id`, `coop_term_id`, `work_site_id`)
      ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `batch_members_request_scope_fkey`
      FOREIGN KEY (`request_id`, `student_term_id`, `coop_term_id`, `work_site_id`)
      REFERENCES `document_requests` (`id`, `student_term_id`, `coop_term_id`, `work_site_id`)
      ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `document_batch_student_slots`
    ADD INDEX `batch_student_slots_scope_idx` (`batch_member_id`, `batch_id`, `student_term_id`, `coop_term_id`, `work_site_id`),
    ADD CONSTRAINT `batch_student_slots_scope_fkey`
      FOREIGN KEY (`batch_member_id`, `batch_id`, `student_term_id`, `coop_term_id`, `work_site_id`)
      REFERENCES `document_batch_members` (`id`, `batch_id`, `student_term_id`, `coop_term_id`, `work_site_id`)
      ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `response_student_results`
    ADD INDEX `response_results_form_batch_idx` (`response_form_id`, `batch_id`),
    ADD INDEX `response_results_member_batch_idx` (`batch_member_id`, `batch_id`),
    ADD CONSTRAINT `response_results_form_batch_fkey`
      FOREIGN KEY (`response_form_id`, `batch_id`)
      REFERENCES `response_forms` (`id`, `batch_id`)
      ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `response_results_member_batch_fkey`
      FOREIGN KEY (`batch_member_id`, `batch_id`)
      REFERENCES `document_batch_members` (`id`, `batch_id`)
      ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `visit_students`
    ADD INDEX `visit_students_visit_term_idx` (`visit_id`, `coop_term_id`),
    ADD CONSTRAINT `visit_students_visit_term_fkey`
      FOREIGN KEY (`visit_id`, `coop_term_id`)
      REFERENCES `supervision_visits` (`id`, `coop_term_id`)
      ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `visit_students_student_term_fkey`
      FOREIGN KEY (`student_term_id`, `coop_term_id`)
      REFERENCES `student_term_enrollments` (`id`, `coop_term_id`)
      ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `visit_student_slots`
    ADD INDEX `visit_student_slots_schedule_idx` (`visit_id`, `round`, `visit_date`, `period`),
    ADD CONSTRAINT `visit_student_slots_member_fkey`
      FOREIGN KEY (`visit_id`, `student_term_id`)
      REFERENCES `visit_students` (`visit_id`, `student_term_id`)
      ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `visit_student_slots_schedule_fkey`
      FOREIGN KEY (`visit_id`, `round`, `visit_date`, `period`)
      REFERENCES `supervision_visits` (`id`, `round`, `visit_date`, `period`)
      ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `visit_lecturer_slots`
    ADD INDEX `visit_lecturer_slots_schedule_idx` (`visit_id`, `visit_date`, `period`),
    ADD CONSTRAINT `visit_lecturer_slots_member_fkey`
      FOREIGN KEY (`visit_id`, `lecturer_id`)
      REFERENCES `visit_lecturers` (`visit_id`, `lecturer_id`)
      ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `visit_lecturer_slots_schedule_fkey`
      FOREIGN KEY (`visit_id`, `visit_date`, `period`)
      REFERENCES `supervision_visits` (`id`, `visit_date`, `period`)
      ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `visit_work_site_slots`
    ADD INDEX `visit_work_site_slots_schedule_idx` (`visit_id`, `work_site_id`, `visit_date`, `period`),
    ADD CONSTRAINT `visit_work_site_slots_schedule_fkey`
      FOREIGN KEY (`visit_id`, `work_site_id`, `visit_date`, `period`)
      REFERENCES `supervision_visits` (`id`, `work_site_id`, `visit_date`, `period`)
      ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `evaluation_template_versions`
    ADD UNIQUE INDEX `evaluation_template_versions_id_template_id_key` (`id`, `template_id`);

ALTER TABLE `student_evaluations`
    ADD INDEX `student_evaluations_version_template_idx` (`template_version_id`, `template_id`),
    ADD CONSTRAINT `student_evaluations_version_template_fkey`
      FOREIGN KEY (`template_version_id`, `template_id`)
      REFERENCES `evaluation_template_versions` (`id`, `template_id`)
      ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `organization_evaluations`
    ADD INDEX `organization_evaluations_version_template_idx` (`template_version_id`, `template_id`),
    ADD CONSTRAINT `organization_evaluations_version_template_fkey`
      FOREIGN KEY (`template_version_id`, `template_id`)
      REFERENCES `evaluation_template_versions` (`id`, `template_id`)
      ON DELETE RESTRICT ON UPDATE CASCADE;

-- Actor/owner references. Application code still enforces role and object policy.
ALTER TABLE `organizations`
    ADD CONSTRAINT `organizations_created_by_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `organizations_updated_by_fkey` FOREIGN KEY (`updated_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `organization_merge_history` ADD CONSTRAINT `org_merge_actor_fkey` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `applications`
    ADD CONSTRAINT `applications_created_by_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `applications_updated_by_fkey` FOREIGN KEY (`updated_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `application_status_history` ADD CONSTRAINT `application_history_actor_fkey` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `files` ADD CONSTRAINT `files_created_by_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `file_versions` ADD CONSTRAINT `file_versions_created_by_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `document_requests`
    ADD CONSTRAINT `document_requests_created_by_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `document_requests_updated_by_fkey` FOREIGN KEY (`updated_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `document_batches`
    ADD CONSTRAINT `document_batches_created_by_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `document_batches_updated_by_fkey` FOREIGN KEY (`updated_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `document_versions` ADD CONSTRAINT `document_versions_created_by_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `deliveries`
    ADD CONSTRAINT `deliveries_owner_user_fkey` FOREIGN KEY (`owner_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `deliveries_created_by_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `deliveries_updated_by_fkey` FOREIGN KEY (`updated_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `delivery_history` ADD CONSTRAINT `delivery_history_actor_fkey` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `response_forms`
    ADD CONSTRAINT `response_forms_uploaded_by_fkey` FOREIGN KEY (`uploaded_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `response_forms_confirmed_by_fkey` FOREIGN KEY (`confirmed_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `response_student_results` ADD CONSTRAINT `response_results_confirmed_by_fkey` FOREIGN KEY (`confirmed_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `placements` ADD CONSTRAINT `placements_confirmed_by_fkey` FOREIGN KEY (`confirmed_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `placement_versions` ADD CONSTRAINT `placement_versions_actor_fkey` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `supervision_visits`
    ADD CONSTRAINT `visits_created_by_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `visits_updated_by_fkey` FOREIGN KEY (`updated_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `supervision_results` ADD CONSTRAINT `supervision_results_submitter_fkey` FOREIGN KEY (`submitted_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `supervision_visit_history` ADD CONSTRAINT `visit_history_actor_fkey` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `internal_notes` ADD CONSTRAINT `internal_notes_author_fkey` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `company_requirements` ADD CONSTRAINT `company_requirements_author_fkey` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `evaluation_templates`
    ADD CONSTRAINT `eval_templates_created_by_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `eval_templates_updated_by_fkey` FOREIGN KEY (`updated_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `evaluation_template_versions` ADD CONSTRAINT `eval_template_versions_publisher_fkey` FOREIGN KEY (`published_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `student_evaluations`
    ADD CONSTRAINT `student_evals_submitted_by_fkey` FOREIGN KEY (`submitted_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `student_evals_created_by_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `student_evals_updated_by_fkey` FOREIGN KEY (`updated_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `student_evaluation_versions` ADD CONSTRAINT `student_eval_versions_actor_fkey` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `organization_evaluations`
    ADD CONSTRAINT `organization_evals_submitted_by_fkey` FOREIGN KEY (`submitted_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `organization_evals_created_by_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `organization_evals_updated_by_fkey` FOREIGN KEY (`updated_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `organization_evaluation_versions` ADD CONSTRAINT `organization_eval_versions_actor_fkey` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `import_jobs` ADD CONSTRAINT `import_jobs_requested_by_fkey` FOREIGN KEY (`requested_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `export_jobs` ADD CONSTRAINT `export_jobs_requested_by_fkey` FOREIGN KEY (`requested_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `expenses`
    ADD CONSTRAINT `expenses_created_by_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `expenses_updated_by_fkey` FOREIGN KEY (`updated_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_actor_fkey` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `supervision_result_versions` ADD CONSTRAINT `supervision_result_versions_actor_fkey` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `idempotency_records` ADD CONSTRAINT `idempotency_records_actor_fkey` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `expense_versions` ADD CONSTRAINT `expense_versions_actor_fkey` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Semantic checks supported by MySQL 8.4. Workflow transitions remain in domain services.
ALTER TABLE `coop_terms` ADD CONSTRAINT `chk_coop_terms_dates` CHECK (`starts_on` <= `ends_on`);
ALTER TABLE `file_versions`
    ADD CONSTRAINT `chk_file_versions_size` CHECK (`size_bytes` > 0),
    ADD CONSTRAINT `chk_file_versions_revision` CHECK (`revision` > 0);
ALTER TABLE `document_batches`
    ADD CONSTRAINT `chk_document_number_parts` CHECK (`document_no` IS NULL OR `document_year` IS NOT NULL);
ALTER TABLE `response_forms`
    ADD CONSTRAINT `chk_response_confirmation` CHECK ((`confirmed_at` IS NULL) = (`confirmed_by_id` IS NULL));
ALTER TABLE `response_student_results`
    ADD CONSTRAINT `chk_result_confirmation` CHECK ((`confirmed_at` IS NULL) = (`confirmed_by_id` IS NULL));
ALTER TABLE `evaluation_items`
    ADD CONSTRAINT `chk_evaluation_item_scores` CHECK ((`max_score` IS NULL OR `max_score` >= 0) AND (`weight` IS NULL OR `weight` >= 0));
ALTER TABLE `import_rows` ADD CONSTRAINT `chk_import_row_number` CHECK (`row_no` > 0);
ALTER TABLE `outbox_messages` ADD CONSTRAINT `chk_outbox_attempts` CHECK (`attempts` >= 0);
ALTER TABLE `idempotency_records` ADD CONSTRAINT `chk_idempotency_response_status` CHECK (`response_status` IS NULL OR (`response_status` >= 100 AND `response_status` <= 599));
ALTER TABLE `expenses`
    ADD CONSTRAINT `chk_expense_non_negative` CHECK (`travel_days` > 0 AND `travel_amount` >= 0 AND `lodging_amount` >= 0 AND `meal_amount` >= 0),
    ADD CONSTRAINT `chk_expense_total` CHECK (`total_amount` = `travel_amount` + `lodging_amount` + `meal_amount`);

-- Audit history is append-only at the database boundary, including for privileged
-- application connections. Corrections must be represented by a new audit row.
CREATE TRIGGER `audit_logs_prevent_update`
BEFORE UPDATE ON `audit_logs`
FOR EACH ROW
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'audit_logs is append-only: UPDATE forbidden';

CREATE TRIGGER `audit_logs_prevent_delete`
BEFORE DELETE ON `audit_logs`
FOR EACH ROW
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'audit_logs is append-only: DELETE forbidden';
