WITH latest AS (
  SELECT COALESCE(MAX(SUBSTRING("appointmentNo" FROM 3)::integer), 0) AS sequence
  FROM supervision_appointments
  WHERE "appointmentNo" ~ '^SV[0-9]{4}$'
), legacy AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt", id) AS sequence
  FROM supervision_appointments
  WHERE "appointmentNo" !~ '^SV[0-9]{4}$'
)
UPDATE supervision_appointments AS appointment
SET "appointmentNo" = 'SV' || LPAD((latest.sequence + legacy.sequence)::text, 4, '0')
FROM latest, legacy
WHERE appointment.id = legacy.id;
