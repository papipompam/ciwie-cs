DO $$
BEGIN
  IF (SELECT count(*) FROM "placement_requests") > 99999 THEN
    RAISE EXCEPTION 'Placement request number limit reached';
  END IF;
END $$;

WITH numbered AS (
  SELECT "id", row_number() OVER (ORDER BY "createdAt", "id") AS sequence
  FROM "placement_requests"
)
UPDATE "placement_requests" AS request
SET "requestNo" = 'MIGRATION-' || numbered.sequence
FROM numbered
WHERE request."id" = numbered."id";

WITH numbered AS (
  SELECT "id", row_number() OVER (ORDER BY "createdAt", "id") AS sequence
  FROM "placement_requests"
)
UPDATE "placement_requests" AS request
SET "requestNo" = 'RE' || lpad(numbered.sequence::text, 5, '0')
FROM numbered
WHERE request."id" = numbered."id";
