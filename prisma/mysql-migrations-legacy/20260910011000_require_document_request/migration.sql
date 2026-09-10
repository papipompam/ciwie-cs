-- A legacy batch document has no unambiguous request owner, so it cannot be retained in the per-request model.
DELETE FROM `letter_document_versions` WHERE `placementRequestId` IS NULL;

ALTER TABLE `letter_document_versions`
    MODIFY `placementRequestId` VARCHAR(30) NOT NULL;
