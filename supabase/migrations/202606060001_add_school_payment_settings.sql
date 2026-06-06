alter table public.schools
  add column if not exists payment_bank_bin text,
  add column if not exists payment_account_no text,
  add column if not exists payment_account_name text,
  add column if not exists payment_qr_enabled boolean not null default false;
