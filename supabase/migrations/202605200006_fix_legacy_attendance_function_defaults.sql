-- Keep legacy attendance RPC overloads from falling back to the removed default_school tenant.

create or replace function public.insert_attendance_from_device(
  p_ma_cham_cong varchar,
  p_scanned_at timestamptz,
  p_school_id varchar default '1',
  p_log_type varchar default null,
  p_status_detail varchar default 'on_time'
)
returns table(inserted boolean, out_student_id bigint, student_name varchar, message text)
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_student_id bigint;
  v_student_name varchar;
  v_last_log_type varchar(32);
  v_determined_log_type varchar(32);
  v_log_type varchar(32);
begin
  select s.id, s.full_name
    into v_student_id, v_student_name
  from public.students s
  where s.school_id = p_school_id
    and s.ma_cham_cong = p_ma_cham_cong
  limit 1;

  if v_student_id is null then
    return query select
      false,
      null::bigint,
      null::varchar,
      ('Student not found for school=' || p_school_id || ', ma_cham_cong=' || p_ma_cham_cong)::text;
    return;
  end if;

  select al.log_type
    into v_last_log_type
  from public.attendance_logs al
  where al.school_id = p_school_id
    and al.student_id = v_student_id
    and date(al.scanned_at at time zone 'Asia/Ho_Chi_Minh')
      = date(p_scanned_at at time zone 'Asia/Ho_Chi_Minh')
  order by al.scanned_at desc
  limit 1;

  if v_last_log_type is null then
    v_determined_log_type := 'check_in';
  elsif v_last_log_type = 'check_in' then
    v_determined_log_type := 'check_out';
  else
    v_determined_log_type := 'check_in';
  end if;

  v_log_type := coalesce(p_log_type, v_determined_log_type);

  insert into public.attendance_logs (
    school_id,
    student_id,
    scanned_at,
    log_type,
    status_detail
  )
  values (
    p_school_id,
    v_student_id,
    p_scanned_at,
    v_log_type,
    coalesce(p_status_detail, case when v_log_type = 'check_in' then 'on_time' else 'leave' end)
  )
  on conflict do nothing;

  if found then
    return query select true, v_student_id, v_student_name, ('Inserted: ' || v_log_type)::text;
  else
    return query select false, v_student_id, v_student_name, 'Duplicate (already exists)'::text;
  end if;
end;
$$;

create or replace function public.record_attendance_with_spam_check(
  p_student_code varchar,
  p_school_id varchar default '1',
  p_scanned_at timestamptz default now(),
  p_log_type varchar default null,
  p_status_detail varchar default null,
  p_late_minutes integer default null
)
returns jsonb
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_student_id bigint;
  v_last_log_type varchar(32);
  v_next_log_type varchar(32);
  v_status_detail varchar(32);
  v_inserted_id bigint;
begin
  if exists (
    select 1
    from public.attendance_spam_logs asl
    where asl.school_id = p_school_id
      and asl.student_code = p_student_code
      and asl.expires_at > now()
  ) then
    return jsonb_build_object(
      'blocked', true,
      'student_id', null,
      'log_type', null,
      'error_message', 'Spam blocked (< 10 minutes).'
    );
  end if;

  select s.id
    into v_student_id
  from public.students s
  where s.school_id = p_school_id
    and s.student_code = p_student_code
  limit 1;

  if v_student_id is null then
    return jsonb_build_object(
      'blocked', false,
      'student_id', null,
      'log_type', null,
      'error_message', 'Student not found'
    );
  end if;

  select al.log_type
    into v_last_log_type
  from public.attendance_logs al
  where al.school_id = p_school_id
    and al.student_id = v_student_id
    and date(al.scanned_at at time zone 'Asia/Ho_Chi_Minh')
      = date(p_scanned_at at time zone 'Asia/Ho_Chi_Minh')
  order by al.scanned_at desc
  limit 1;

  v_next_log_type := coalesce(
    p_log_type,
    case when v_last_log_type = 'check_in' then 'check_out' else 'check_in' end
  );

  v_status_detail := coalesce(
    p_status_detail,
    case when v_next_log_type = 'check_in' then 'on_time' else 'leave' end
  );

  insert into public.attendance_logs (
    school_id,
    student_id,
    scanned_at,
    log_type,
    status_detail,
    late_minutes
  )
  values (
    p_school_id,
    v_student_id,
    p_scanned_at,
    v_next_log_type,
    v_status_detail,
    p_late_minutes
  )
  returning id into v_inserted_id;

  insert into public.attendance_spam_logs (school_id, student_code, expires_at)
  values (p_school_id, p_student_code, now() + interval '10 minutes')
  on conflict (school_id, student_code)
  do update set expires_at = excluded.expires_at;

  return jsonb_build_object(
    'blocked', false,
    'student_id', v_student_id,
    'attendance_log_id', v_inserted_id,
    'log_type', v_next_log_type,
    'error_message', null
  );
exception
  when unique_violation then
    return jsonb_build_object(
      'blocked', true,
      'student_id', v_student_id,
      'log_type', v_next_log_type,
      'error_message', 'Duplicate attendance log'
    );
end;
$$;
