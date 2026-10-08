# LAXCommute backend — October 8, 2026

## Database

Project: `yzdoarjleozzblvsjbhx`. Migrations `create_commute_profiles` and `restrict_rls_maintenance_function` are already live. Do not run the included SQL again on this project; it is supplied for review and setup of another project.

`public.commute_profiles` stores one commute per account: lot, terminal, boarding stops, walking minutes, and buffer minutes. It stores no GPS coordinates. Constraints validate supported values; deleting the account cascades to its commute. Users can read, insert, update and delete only their own row. Guests have no table privileges. A pre-existing internal RLS maintenance function was restricted from public execution.

## App connection

The updated app loads and upserts the table using its existing Supabase client and publishable key. No administrative keys or new environment variables are needed. Guests still use browser storage. Existing account metadata is preserved and remains a fallback when no database row exists; the next save writes the table. Deploy this version consistently, since older app versions still write metadata.

Slow loads cannot overwrite newer saves or show another account's settings after sign-out. Failed saves report failure. Offline reopening can use existing device settings or legacy metadata. Automatic offline upload and realtime cross-device updates are not implemented.

## Deployment still required

Database changes are live; the app source in this package still needs deployment through the existing Cloudflare setup. Shuttle data continues to use the existing Cloudflare service. Follow HOSTING.md, accept the installed PWA update, sign in, save a commute, and check it on another device.

SMTP, confirmation templates, and auth redirect URLs still require dashboard verification (AUTH.md). The remaining Security Advisor notice is disabled leaked-password protection: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Verification

125 app tests passed and the production build passed. Added tests cover database loading, legacy fallback, failed saves, sign-out during loading, and saves superseding older loads.

Live database role tests verified own-row access, blocked cross-account reads/inserts, blocked ownership reassignment, and absence of guest SELECT privileges. All temporary test users and rows were rolled back. This verifies database rules; real PWA and inbox testing remains necessary after deployment.
