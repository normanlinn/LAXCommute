# LAXCommute security review — November 9, 2026

Scope: the LAXCommute repository, employeeshuttlelax.com, Cloudflare API handlers,
the Supabase community/shuttle/account functions, and database grants and policies.
Other websites and third-party infrastructure are outside this review.

## Changes

- Community browser requests are restricted to the production origin. API-key
  checks and server-side rate limits remain in place. The publishable key is public;
  CORS is a browser restriction, not user authentication or complete bot protection.
- Community and push-alert bodies have streamed 4 KiB byte limits and five-second
  read deadlines, including requests without Content-Length.
- Push URLs reject embedded credentials, alternate ports and fragments. Push
  requests do not follow redirects away from their approved service. Alert creation
  has its own six-per-minute IP limit, and unknown shuttle routes are rejected.
- Provider credentials are sent only in the Api-Key header, never a query string.
- Static pages and API responses advertise HTTPS-only access with HSTS. API errors
  receive consistent nosniff, framing, CSP, referrer and no-store headers.
- Fixed the server-side optional feedback-email validation expression.
- Updated glob and minimatch to patched versions. Production build output is scanned
  for recognizable privileged credentials; only filenames are logged on detection.
- CI's dependency audit now blocks moderate and higher findings, and all known
  production dependency findings. Run `npm run security:check` for audit, tests and build.

## Existing protections checked

- All six public-schema app tables have RLS enabled. Saved commute policies require
  auth.uid() ownership for reads, inserts, updates and deletes, including WITH CHECK.
- Browser roles have no grants to feedback, community-report, feed-cache or rate-limit
  tables. Service-only RPCs cannot be executed by anon or authenticated roles.
- Authentication uses PKCE. Account deletion verifies the bearer token server-side,
  checks recent sign-in, revokes refresh sessions and never trusts a submitted user ID.
- Script execution and framing are restricted by CSP; map attribution HTML is sanitized;
  feed-provided names are inserted as text. Private credentials are not intended for
  VITE_* variables, and existing build checks reject privileged Supabase keys there.
- No Storage buckets are configured. Service-worker caching targets public shuttle
  data and app assets, not account APIs.

## Remaining limits

- Supabase reports leaked-password protection disabled. Enable it in Auth settings
  if the project plan supports it (Pro or above). Configuration is not exposed by the
  available connector, so this review does not claim that it was changed. Verify
  server-side password policy, redirect allowlists, CAPTCHA and account MFA in the dashboard.
- deepmerge 4.3.1 has an unpatched low-severity advisory in the build-tool chain.
  npm reports several inherited low findings from this one dependency. It is absent
  from the production dependency audit. Do not downgrade the PWA tool to an obsolete
  release merely to hide the warning; monitor the upstream fix.
- Guest passenger reporting remains anonymous and can be abused by automated clients.
  Origin checks and IP throttles reduce exposure, but CAPTCHA or authenticated reporting
  would require additional product configuration. Rider observations are not verified GPS.
- Secret scans detect known formats, not every possible custom secret. This review is
  targeted source/configuration analysis and non-destructive checks, not an independent
  penetration test, an audit of all account settings or a guarantee against compromise.
- Syncromatics still requires separate authorization. Security changes do not restore
  live data without provider access.

References: [Supabase password security](https://supabase.com/docs/guides/auth/password-security),
[deepmerge advisory](https://github.com/advisories/GHSA-gcqx-w48m-w2h4).

## Validation

226 automated tests, type checking, production build, public-output credential scanning
and repository formatting checks passed. Production npm audit reports zero known
vulnerabilities; the full build-tool audit retains the low-severity findings above.
Read-only role tests against the deployed database returned one own commute for an
owner and zero visible commutes for an unrelated authenticated identity. No user
records were changed by those tests. Live API checks reject unrelated browser
origins, missing application keys and oversized request bodies.
