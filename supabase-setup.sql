create table if not exists public.dmi_daily_reports (
  report_date date primary key,
  hours numeric not null default 7.25,
  locations jsonb not null default '{}'::jsonb,
  note text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.dmi_daily_reports enable row level security;
create policy "DMI reports access" on public.dmi_daily_reports for all using (true) with check (true);
alter publication supabase_realtime add table public.dmi_daily_reports;
