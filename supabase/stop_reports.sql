-- Only the authenticated community Edge Function may read or write this table.
create table public.shuttle_stop_reports (
  id uuid primary key default gen_random_uuid(),
  route_id integer not null check (route_id in (6883,6884,6885)),
  stop_id bigint not null check (stop_id > 0),
  activity text not null check (activity in ('arrived','departed','crowding')),
  occupancy text check (occupancy in ('empty','seats','standing','full')),
  created_at timestamptz not null default now(),
  constraint crowding_requires_occupancy check (
    (activity = 'crowding' and occupancy is not null) or
    (activity <> 'crowding' and occupancy is null)
  )
);
create index shuttle_stop_reports_recent on public.shuttle_stop_reports (route_id, stop_id, created_at desc);
create index shuttle_stop_reports_expiry on public.shuttle_stop_reports (created_at);
alter table public.shuttle_stop_reports enable row level security;
revoke all on public.shuttle_stop_reports from anon, authenticated;
grant select, insert, delete on public.shuttle_stop_reports to service_role;
