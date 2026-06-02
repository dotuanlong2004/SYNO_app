create table if not exists public.school_event_comments (
  id bigserial primary key,
  event_id bigint not null references public.school_events(id) on delete cascade,
  school_id varchar not null references public.schools(id),
  parent_id uuid not null references auth.users(id),
  comment_text text not null,
  created_at timestamptz not null default now()
);

create index if not exists school_event_comments_event_created_idx
  on public.school_event_comments(event_id, created_at desc);

alter table public.school_event_comments enable row level security;

grant select, insert, delete on public.school_event_comments to authenticated;
grant usage, select on sequence public.school_event_comments_id_seq to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'school_event_comments'
      and policyname = 'staff read event comments in own school'
  ) then
    create policy "staff read event comments in own school"
      on public.school_event_comments
      for select to authenticated
      using (app_private.is_staff_for_school(school_id));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'school_event_comments'
      and policyname = 'parents read event comments in linked school'
  ) then
    create policy "parents read event comments in linked school"
      on public.school_event_comments
      for select to authenticated
      using (
        exists (
          select 1
          from public.students s
          where s.parent_id = auth.uid()
            and s.school_id = school_event_comments.school_id
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'school_event_comments'
      and policyname = 'parents create own event comments in linked school'
  ) then
    create policy "parents create own event comments in linked school"
      on public.school_event_comments
      for insert to authenticated
      with check (
        parent_id = auth.uid()
        and exists (
          select 1
          from public.students s
          where s.parent_id = auth.uid()
            and s.school_id = school_event_comments.school_id
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'school_event_comments'
      and policyname = 'staff delete event comments in own school'
  ) then
    create policy "staff delete event comments in own school"
      on public.school_event_comments
      for delete to authenticated
      using (app_private.is_staff_for_school(school_id));
  end if;
end $$;
