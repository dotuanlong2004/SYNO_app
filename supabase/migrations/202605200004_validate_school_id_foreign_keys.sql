-- Validate tenant foreign keys after verifying there are no orphan school_id values.
-- This turns the non-breaking NOT VALID constraints from the foundation migration
-- into fully enforced constraints for existing and future data.

alter table public.students validate constraint students_school_id_fkey;
alter table public.user_profiles validate constraint user_profiles_school_id_fkey;
alter table public.attendance_logs validate constraint attendance_logs_school_id_fkey;
alter table public.attendance_spam_logs validate constraint attendance_spam_logs_school_id_fkey;
alter table public.hardware_scan_debounce validate constraint hardware_scan_debounce_school_id_fkey;
alter table public.timetables validate constraint timetables_school_id_fkey;
alter table public.grades validate constraint grades_school_id_fkey;
alter table public.student_fees validate constraint student_fees_school_id_fkey;
alter table public.fee_notices validate constraint fee_notices_school_id_fkey;
alter table public.chat_messages validate constraint chat_messages_school_id_fkey;
alter table public.announcements validate constraint announcements_school_id_fkey;
