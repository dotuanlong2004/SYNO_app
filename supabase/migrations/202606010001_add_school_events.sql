create table if not exists public.school_events (
  id bigserial primary key,
  school_id varchar not null references public.schools(id),
  title varchar not null,
  content text not null,
  image_url text null,
  event_date timestamptz null,
  published_at timestamptz not null default now(),
  created_by uuid null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists school_events_school_published_idx
  on public.school_events (school_id, published_at desc);

alter table public.school_events enable row level security;

grant select on public.school_events to authenticated;
grant insert, update, delete on public.school_events to authenticated;
grant usage, select on sequence public.school_events_id_seq to authenticated;

drop policy if exists "staff read events in own school" on public.school_events;
create policy "staff read events in own school"
  on public.school_events
  for select to authenticated
  using (app_private.is_staff_for_school(school_id));

drop policy if exists "parents read events in linked school" on public.school_events;
create policy "parents read events in linked school"
  on public.school_events
  for select to authenticated
  using (
    exists (
      select 1 from public.students s
      where s.parent_id = auth.uid()
        and s.school_id = school_events.school_id
    )
  );

drop policy if exists "staff manage events in own school" on public.school_events;
create policy "staff manage events in own school"
  on public.school_events
  for all to authenticated
  using (app_private.is_staff_for_school(school_id))
  with check (app_private.is_staff_for_school(school_id));
