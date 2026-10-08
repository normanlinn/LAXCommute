# Shuttle backend

The browser uses the same-origin `/api/routes/:routeID` and `/api/live/:routeID?stopId=...` endpoints. Cloudflare validates requests and applies per-IP limits, then calls the Supabase `shuttle-feed` Edge Function. Only Supabase requests the official LAX feed. This preserves existing offline caching, avoids browser CORS issues, and lets the Cloudflare cache reduce function invocations.

## Cache and outages

- Vehicle positions and arrivals: shared 15-second cache in Postgres, refreshed only when requested. There is no always-running polling job. Stops and geometry: one hour.
- An atomic database lease permits one refresh per feed key across function instances. Concurrent requests use saved data or briefly wait for the owner. One additional attempt is allowed when the upstream request fails.
- Upstream timeout: 3.5 seconds per attempt, including the response body. Feed arrays and the fields used by the UI are validated before storage.
- Last good live data can be returned for up to five minutes; route geometry can be used for up to one day. Original timestamps are retained. The response reports `sourceUnavailable`, `arrivalSourceUnavailable`, and `vehicleSourceUnavailable`.
- Stale arrival times are labeled **Last reported**, stay fixed at the value from their original snapshot, and never produce departure advice or approaching-bus animation. No invented data is returned when no usable snapshot exists.
- Cloudflare live cache expiration derives from the original feed timestamp, so cache layers do not compound freshness windows. Failed and stale responses are not cached at Cloudflare.

## Access and request limits

- Only the three configured route IDs and route-member boarding stops are accepted. No arbitrary upstream URLs.
- Browser origins are restricted to `https://employeeshuttlelax.com`. Loopback development is allowed at the local Cloudflare gateway. CORS is a browser restriction, not proof of caller identity.
- Guest shuttle access uses explicit publishable-application-key validation inside the function. `verify_jwt=false` is intentional because publishable keys are not JWTs; the function does its own check. The key is public and does not grant account or cache-table access.
- Cloudflare: 120 app API calls per minute per client IP; account deletion additionally allows three per minute. Cloudflare counters are per location and best effort, not a billing cap.
- Supabase direct-function safeguard: 1,200 feed requests per minute per connecting IP. This larger budget allows shared Cloudflare egress addresses. Account deletion allows 30 per minute per connecting IP and three per minute per verified user. Counters are atomic and backend-only; identifiers are salted hashes. Expired counters become eligible for opportunistic cleanup after 15 minutes, during later requests. This is not a fixed deletion SLA.
- Supabase Auth settings: sign-up/sign-in and code verification limited to 10 requests per five minutes per IP. Token-refresh limits remain unchanged. Email links expire after 30 minutes, with eight-digit OTPs. Secure email changes and recent-session password changes are enabled.
- Browser roles cannot read/write feed cache or limiter tables, or execute their RPCs. RLS and explicit service-role policies protect both tables. No service-role credential is present in browser or Cloudflare source.

## Accounts

Passwordless email links are available alongside existing password sign-in. Passwords are handled by Supabase Auth; this application never stores plaintext passwords. New sign-ups no longer duplicate commute preferences in auth metadata. Existing compatibility reads remain available. The sync table contains only the account ID and selected commute preferences; it does not store GPS trails.

`DELETE /api/account` invokes `delete-account`. The function validates the supplied session with Supabase Auth, derives the user ID from that response, requires a sign-in within ten minutes, revokes refresh sessions, then deletes that user. The commute row is removed by its existing cascade foreign key. The UI asks for confirmation and clears that account's device preferences afterward. Previously issued access tokens can remain cryptographically valid until expiry, but user validation and the commute foreign key block operations for a deleted user. No arbitrary body user ID is accepted.

## Deployment

Apply `supabase/shuttle_feed_cache.sql` and `supabase/request_limits.sql` to a fresh project, then deploy both function folders with their shared dependencies. These schema files are already applied to the current project; do not re-run them against it. Both functions use the hosted `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` environment secrets. Re-deploy functions whenever their source changes; pushing GitHub alone does not deploy Supabase functions. The site's existing Cloudflare pipeline deploys the gateway and UI.

## Remaining setup

The project currently uses Supabase's built-in test email sender. Public passwordless/signup email delivery requires an existing custom SMTP provider to be connected. SMTP credentials must be entered directly in Supabase, never committed or sent in chat. Google and Apple providers remain disabled until their provider credentials are configured. Leaked-password protection is unavailable on the current Free plan; no paid upgrade was made. CAPTCHA remains an optional separate integration and is not claimed as implemented.

No claim is made that every Supabase product endpoint has a custom application rate limiter. User-data endpoints retain Supabase's platform controls and owner-only RLS. The custom limits above cover the app's proxy, Edge Functions, and configured Auth actions.
