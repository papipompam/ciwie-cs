-- Letter documents are issued per placement request; batch-level issuance is no longer part of the workflow.
ALTER TABLE `letter_document_versions`
    DROP FOREIGN KEY `letter_document_versions_batchId_fkey`,
    DROP INDEX `letter_document_versions_batchId_documentType_versionNumber_key`,
    DROP INDEX `letter_document_versions_batchId_documentType_status_idx`,
    DROP COLUMN `batchId`;

ALTER TABLE `notifications`
    DROP FOREIGN KEY `notifications_letterBatchId_fkey`,
    DROP INDEX `notifications_letterBatchId_idx`,
    DROP COLUMN `letterBatchId`;

DROP TABLE `letter_batch_members`;
DROP TABLE `letter_batches`;
