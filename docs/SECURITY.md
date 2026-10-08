# Security review — October 6, 2026

This review covers the repository, dependency audit and production build. It is not a penetration test or a certification. Email settings and real inbox flows remain unverified. On October 8, database role tests verified commute ownership with two temporary users in a rolled-back transaction.

## What the app does today

| Area                | Verified in the code                                                                                                                                                                                                               | Remaining check                                                                                                                                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Public shuttle API  | Only GET requests for routes 6883, 6884 and 6885. Live stop IDs must belong to the route. Duplicate, empty and unsupported parameters are rejected. Upstream URLs use a fixed host and fixed paths.                                | Monitor request volume and upstream outages. Add edge rate limiting if traffic warrants it; confirm the available Cloudflare plan first.                                                                     |
| Account settings    | `commute_profiles` has owner-only SELECT/INSERT/UPDATE/DELETE policies and no guest grants. Existing metadata remains a preference fallback. PKCE email returns are handled and consumed callback grants are removed from the URL. | Verify email delivery, exact redirect URLs, confirmation and recovery with a real inbox. Test two accounts on separate browser profiles.                                                                     |
| Device storage      | Commute settings contain the lot, terminal, stops and walking time. Theme and language preferences are also local. The app does not save device GPS coordinates in these settings.                                                 | Treat commute preferences as personal information on shared devices. The Supabase SDK separately persists the account session in browser storage; the commute checkbox does not control sign-in persistence. |
| Credentials         | The configured Supabase browser key is publishable. Builds reject `sb_secret_` keys, legacy service-role keys and private credential names under `VITE_*`.                                                                         | Never put an admin key, SMTP password or deployment token into browser build variables. This guard catches common mistakes, not every possible secret.                                                       |
| Browser protections | Static assets set MIME sniffing, framing, referrer and permission protections. CSP blocks object embeds, foreign base URLs and framing. Production source maps are explicitly disabled.                                            | This baseline CSP does not restrict script sources. A stricter script/connect policy needs testing with the optional Apple map, free map, auth, fonts and analytics.                                         |
| Dependencies        | The reviewed tree uses patched `sharp` 0.35.5 and `source-map-js` 1.2.2. The full npm audit reported zero known vulnerabilities after these changes. CI audits at high severity; Dependabot checks weekly.                         | New advisories can appear. Review update PRs and remove overrides when upstream dependencies include the fixes.                                                                                              |

## Supabase checks to complete

1. Review the project's Security Advisor and every exposed table, view, storage bucket and function. The app queries `commute_profiles`; unrelated project data must be checked separately.
2. If tables are used, enable row-level security and limit grants and policies to the authenticated owner's rows. Do not use editable `user_metadata` for permissions, employment verification or admin roles. The current commute metadata is a preference, not proof that someone is an employee.
3. With disposable accounts A and B, save different commutes, sign out and back in, and verify each account restores only its own settings. Check that unauthenticated requests and A's token cannot read or update B's account. Do not consider UI-only tests proof of server authorization.
4. Set exact production confirmation/recovery redirects and configure mail delivery as described in [AUTH.md](AUTH.md). Keep provider rate limits active. If enabling CAPTCHA, wire token collection into the signup/recovery forms first; enabling it only in the dashboard breaks those requests.
5. For a commercial launch, document retention, account deletion, support and what happens when the public shuttle feed is unavailable. Avoid collecting badge numbers or other employment identifiers unless there is a defined, necessary use for them.

## Interpreting public app details

Route IDs, framework names, API paths and a Supabase publishable key are expected to be visible in a browser application. Hiding them does not enforce access control. Source maps can reveal source structure, so they stay disabled, but minified JavaScript is still public. Never ship secrets in either format.

Map attribution HTML comes from trusted build configuration, not from users or the feed. Keep that setting maintainer-only. React renders stop names and account text as escaped text.

## Sources

- [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase user metadata](https://supabase.com/docs/guides/auth/users)
- [Supabase updateUser](https://supabase.com/docs/reference/javascript/auth-updateuser)
- [MDN Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy)
- [sharp advisory](https://github.com/advisories/GHSA-wq5f-xc86-pv6w)
- [source-map-js advisory](https://github.com/advisories/GHSA-68fv-2mgg-jv7q)
