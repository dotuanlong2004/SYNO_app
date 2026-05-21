-- Clean stale school_id values in legacy auth user metadata.
-- Authorization must continue to use public.user_profiles, not user metadata.

update auth.users
set raw_user_meta_data = jsonb_set(
  coalesce(raw_user_meta_data, '{}'::jsonb),
  '{school_id}',
  '"1"'::jsonb,
  true
)
where raw_user_meta_data ->> 'school_id' = 'default_school';
