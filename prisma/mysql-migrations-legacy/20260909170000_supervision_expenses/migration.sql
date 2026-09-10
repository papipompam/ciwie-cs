-- Add explicit lecturer gender for accommodation allocation.
ALTER TABLE `users`
    ADD COLUMN `gender` ENUM('MALE', 'FEMALE') NULL;

-- Store one calculated expense record per AI-created supervision line.
CREATE TABLE `supervision_expenses` (
    `id` VARCHAR(30) NOT NULL,
    `groupId` VARCHAR(30) NOT NULL,
    `fuelAmount` DECIMAL(12, 2) NOT NULL,
    `roomRate` DECIMAL(12, 2) NOT NULL,
    `nights` INTEGER NOT NULL,
    `allowanceRate` DECIMAL(12, 2) NOT NULL,
    `allowanceDays` INTEGER NOT NULL,
    `roomCapacity` INTEGER NOT NULL,
    `lecturerCount` INTEGER NOT NULL,
    `maleLecturerCount` INTEGER NOT NULL,
    `femaleLecturerCount` INTEGER NOT NULL,
    `maleRoomCount` INTEGER NOT NULL,
    `femaleRoomCount` INTEGER NOT NULL,
    `accommodationAmount` DECIMAL(12, 2) NOT NULL,
    `allowanceAmount` DECIMAL(12, 2) NOT NULL,
    `totalAmount` DECIMAL(12, 2) NOT NULL,
    `lecturerSnapshot` JSON NOT NULL,
    `createdById` VARCHAR(30) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `supervision_expenses_groupId_key`(`groupId`),
    INDEX `supervision_expenses_createdById_idx`(`createdById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `supervision_expenses`
    ADD CONSTRAINT `supervision_expenses_groupId_fkey`
    FOREIGN KEY (`groupId`) REFERENCES `supervision_groups`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `supervision_expenses`
    ADD CONSTRAINT `supervision_expenses_createdById_fkey`
    FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
