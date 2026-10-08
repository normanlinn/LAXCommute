create table public.backend_request_limits (
  key_hash text primary key check (key_hash ~ '^[0-9a-f]{64}$'),
  window_start timestamptz not null,
  requests integer not null check (requests > 0)
);
create index backend_request_limits_expiry on public.backend_request_limits(window_start);
alter table public.backend_request_limits enable row level security;
revoke all on public.backend_request_limits from public, anon, authenticated;
grant all on public.backend_request_limits to service_role;
create policy backend_limits_only on public.backend_request_limits for all to service_role using (true) with check (true);
create function public.consume_backend_request(bucket_key text, request_limit integer)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare used integer;
begin
  if request_limit < 1 or request_limit > 1200 then return false; end if;
  insert into public.backend_request_limits(key_hash, window_start, requests)
    values(bucket_key, now(), 1)
  on conflict(key_hash) do update set
    requests = case when public.backend_request_limits.window_start <= now() - interval '60 seconds' then 1 else least(public.backend_request_limits.requests + 1, request_limit + 1) end,
    window_start = case when public.backend_request_limits.window_start <= now() - interval '60 seconds' then now() else public.backend_request_limits.window_start end
  returning requests into used;
  return used <= request_limit;
end;
$$;
revoke all on function public.consume_backend_request(text, integer) from public, anon, authenticated;
grant execute on function public.consume_backend_request(text, integer) to service_role;
