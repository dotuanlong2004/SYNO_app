alter table public.announcements
  add column if not exists priority text not null default 'normal';

alter table public.announcements
  drop constraint if exists announcements_priority_check;

alter table public.announcements
  add constraint announcements_priority_check
  check (priority in ('normal', 'high', 'urgent'));
