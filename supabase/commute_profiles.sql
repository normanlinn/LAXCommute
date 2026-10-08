create table public.commute_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  lot text not null check (lot in ('South','East','West')),
  terminal text not null check (terminal in ('Terminal 1','Terminal 2','Terminal 3','Terminal B (TBIT)','Terminal 4','Terminal 5','Terminal 6','Terminal 7','Terminal 8')),
  terminal_stop_id bigint not null default 0 check (terminal_stop_id between 0 and 9007199254740991),
  terminal_stop_name text not null default '' check (char_length(terminal_stop_name) <= 500),
  parking_stop_id bigint not null default 0 check (parking_stop_id between 0 and 9007199254740991),
  parking_stop_name text not null default '' check (char_length(parking_stop_name) <= 500),
  walking_minutes double precision not null default 7 check (walking_minutes between 1 and 45),
  buffer_minutes double precision not null default 2 check (buffer_minutes between 0 and 10)
);
alter table public.commute_profiles enable row level security;
revoke all on public.commute_profiles from anon, authenticated;
grant select, insert, update, delete on public.commute_profiles to authenticated;
create policy commute_select_own on public.commute_profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy commute_insert_own on public.commute_profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy commute_update_own on public.commute_profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy commute_delete_own on public.commute_profiles for delete to authenticated using ((select auth.uid()) = user_id);
