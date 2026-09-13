DROP INDEX IF EXISTS "company_evaluations_appointmentId_key";

CREATE UNIQUE INDEX "company_evaluations_appointmentId_evaluatorId_key"
ON "company_evaluations"("appointmentId", "evaluatorId");
