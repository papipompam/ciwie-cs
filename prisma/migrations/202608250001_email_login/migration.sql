-- Make email the canonical, case-insensitive login identity.
-- Existing deployments fail closed if any user has no email or normalized duplicates.
ALTER TABLE `users`
    ADD COLUMN `normalized_email` VARCHAR(320) NULL AFTER `email`;

UPDATE `users`
SET `email` = LOWER(TRIM(`email`)),
    `normalized_email` = LOWER(TRIM(`email`));

ALTER TABLE `users`
    MODIFY `email` VARCHAR(320) NOT NULL,
    MODIFY `normalized_email` VARCHAR(320) NOT NULL,
    DROP INDEX `users_email_idx`,
    ADD UNIQUE INDEX `users_normalized_email_key` (`normalized_email`);
