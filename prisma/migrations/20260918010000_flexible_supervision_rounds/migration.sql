-- Preserve existing supervision data while replacing the fixed two-value enum
-- with a bounded integer that can represent any planned supervision occurrence.
ALTER TABLE "supervision_group_lecturers"
  DROP CONSTRAINT "supervision_group_lecturers_groupId_cycleId_round_fkey";
ALTER TABLE "supervision_group_companies"
  DROP CONSTRAINT "supervision_group_companies_groupId_cycleId_round_fkey";

ALTER TABLE "supervision_groups"
  ALTER COLUMN "round" TYPE SMALLINT
  USING (CASE "round"::text WHEN 'ROUND_1' THEN 1 WHEN 'ROUND_2' THEN 2 END);
ALTER TABLE "supervision_group_lecturers"
  ALTER COLUMN "round" TYPE SMALLINT
  USING (CASE "round"::text WHEN 'ROUND_1' THEN 1 WHEN 'ROUND_2' THEN 2 END);
ALTER TABLE "supervision_group_companies"
  ALTER COLUMN "round" TYPE SMALLINT
  USING (CASE "round"::text WHEN 'ROUND_1' THEN 1 WHEN 'ROUND_2' THEN 2 END);

ALTER TABLE "supervision_groups"
  ADD CONSTRAINT "supervision_groups_round_check" CHECK ("round" BETWEEN 1 AND 99);
ALTER TABLE "supervision_group_lecturers"
  ADD CONSTRAINT "supervision_group_lecturers_round_check" CHECK ("round" BETWEEN 1 AND 99);
ALTER TABLE "supervision_group_companies"
  ADD CONSTRAINT "supervision_group_companies_round_check" CHECK ("round" BETWEEN 1 AND 99);

ALTER TABLE "supervision_group_lecturers"
  ADD CONSTRAINT "supervision_group_lecturers_groupId_cycleId_round_fkey"
  FOREIGN KEY ("groupId", "cycleId", "round")
  REFERENCES "supervision_groups"("id", "cycleId", "round")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supervision_group_companies"
  ADD CONSTRAINT "supervision_group_companies_groupId_cycleId_round_fkey"
  FOREIGN KEY ("groupId", "cycleId", "round")
  REFERENCES "supervision_groups"("id", "cycleId", "round")
  ON DELETE RESTRICT ON UPDATE CASCADE;

DROP TYPE "SupervisionRound";
