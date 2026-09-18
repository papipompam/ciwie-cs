-- Training dates can be filled after a cooperative cycle is created.
ALTER TABLE "coop_cycles"
  ALTER COLUMN "trainingStartDate" DROP NOT NULL,
  ALTER COLUMN "trainingEndDate" DROP NOT NULL;
