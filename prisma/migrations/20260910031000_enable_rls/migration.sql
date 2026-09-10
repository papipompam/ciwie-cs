-- Keep every public application table protected if Supabase Data API exposure is enabled.
-- The Nuxt server connects with the database owner role; browser clients do not access these tables directly.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'users', 'audit_logs', 'coop_cycles', 'coop_cycle_status_history', 'cycle_enrollments',
    'provinces', 'companies', 'company_sites', 'student_applications', 'placement_requests',
    'placement_request_status_history', 'letter_document_versions', 'supervision_groups',
    'supervision_expenses', 'supervision_group_lecturers', 'supervision_group_companies',
    'supervision_appointments', 'supervision_appointment_lecturers', 'supervision_appointment_students',
    'student_evaluations', 'company_evaluations', 'notifications', 'notification_recipients',
    'calendar_events'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
  END LOOP;
END $$;
