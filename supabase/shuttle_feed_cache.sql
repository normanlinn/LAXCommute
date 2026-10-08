-- A bounded shared public-feed cache; browser roles have no table/RPC access.
create table public.shuttle_feed_cache (
  path text primary key check (
    path ~ '^routes/(6883|6884|6885)/(stops|patterns|vehicles)$'
    or path ~ '^stops/[0-9]{1,12}/arrivals\?routeId=(6883|6884|6885)$'
  ),
  envelope jsonb check (jsonb_typeof(envelope) = 'object'),
  expires_at timestamptz,
  lock_until timestamptz not null default '-infinity'
);
alter table public.shuttle_feed_cache enable row level security;
revoke all on public.shuttle_feed_cache from public, anon, authenticated;
grant select, insert, update on public.shuttle_feed_cache to service_role;
create function public.claim_shuttle_feed(feed_path text) returns boolean
language sql security invoker set search_path = '' as $$
  with claimed as (
    insert into public.shuttle_feed_cache(path, lock_until)
    values (feed_path, now() + interval '15 seconds')
    on conflict (path) do update set lock_until = now() + interval '15 seconds'
      where public.shuttle_feed_cache.lock_until <= now()
        and coalesce(public.shuttle_feed_cache.expires_at, '-infinity') <= now()
    returning true
  ) select coalesce((select true from claimed), false);
$$;
revoke all on function public.claim_shuttle_feed(text) from public, anon, authenticated;
grant execute on function public.claim_shuttle_feed(text) to service_role;
create policy cache_backend_only on public.shuttle_feed_cache
  for all to service_role using (true) with check (true);
