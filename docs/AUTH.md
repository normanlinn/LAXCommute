# Finish sign-in and account setup

The app supports email/password accounts, confirmation links or email codes, resending confirmation, and password recovery. Guests can use live shuttles and save their commute on the device without an account. Account settings sync through the user's own Supabase `user_metadata.commute`; no new database table is required.

## What was verified

On October 3, 2026, the public settings endpoint for the configured Supabase project responded successfully with the supplied publishable key. Email authentication and signup were enabled, and email confirmation was required. That endpoint does **not** reveal SMTP configuration, redirect allowlists, user accounts, or delivery logs. Those need checking in your Supabase dashboard.

The shared `https://laxcommute.mrzawlinnaing1001.workers.dev/` address rendered Cloudflare's **There is nothing here yet** page in the test browser. The repository currently deploys a Worker named `laxcommute-web`, while the shared URL uses `laxcommute`. Open the actual URL shown after a successful deployment and use that one consistently. To keep the existing QR poster URL, the deployed Worker must serve that hostname. See [hosting setup](HOSTING.md). If you change the public address, update the poster, canonical URLs, sitemap, and Supabase settings together.

## 1. Deploy the current code

From your Git checkout:

```bash
git pull --ff-only origin main
npm ci
npm run setup
npm run deploy
```

Wrangler must already be signed into your Cloudflare account; use `npx wrangler login` if necessary. If you use Cloudflare's GitHub integration, deploy the latest successful `main` build there instead. A GitHub push alone publishes the website only when that integration is connected.

Open the deployed address and `/api/health`. Confirm that the app and shuttle stops load. In an installed PWA, accept **Update** when the app offers it so that the new account code is loaded.

## 2. Set the authentication URLs

In **Supabase → Authentication → URL Configuration**, set **Site URL** to the actual live HTTPS origin, with a trailing slash. Add the following exact **Redirect URLs**, replacing `YOUR-LIVE-ORIGIN` with that origin:

```text
YOUR-LIVE-ORIGIN/
YOUR-LIVE-ORIGIN/auth/confirm
YOUR-LIVE-ORIGIN/auth/recovery
http://localhost:5173/
http://localhost:5173/auth/confirm
http://localhost:5173/auth/recovery
```

For example, if the original poster address is restored, the confirmation redirect is `https://laxcommute.mrzawlinnaing1001.workers.dev/auth/confirm`. Use additional exact localhost entries if Vite selects another port. Production redirects must match the deployed address.

Keep the email provider and email/password signup enabled. Keep email confirmation enabled for public accounts.

## 3. Configure email delivery

Configure **custom SMTP** in Supabase's Authentication email settings with an email provider's host, port, username, password, and verified sender. SMTP secrets belong in that dashboard, never in `VITE_` variables or the repository. A provider may have a free allowance, but its limits and sender/domain requirements are separate from Supabase Free.

Supabase's default test mailer only sends to project-team addresses and currently permits **two emails per hour**. It cannot onboard arbitrary LAX employees. An `email_address_not_authorized` error indicates that the default mailer's recipient restriction is still affecting the request. Check SMTP setup and Authentication logs if email delivery fails.

Keep the existing `{{ .ConfirmationURL }}` in the **Confirm signup** and **Reset password** email templates. It handles verification and uses the redirect configured by the app. Disable your email provider's link tracking for these emails because rewriting authentication links can break them.

## 4. Include an email code for PWA users

Append this to **both** the Confirm signup and Reset password email templates:

```html
<p>You can also enter this code in LAXCommute:</p>
<p><strong>{{ .Token }}</strong></p>
<p>Use either the link or the code. If you did not request this email, ignore it.</p>
```

This enables the app's **Email code** input. The app verifies signup codes with `type: 'email'` and reset codes with `type: 'recovery'`. Users should return to the PWA account screen and enter the email address and code themselves. Codes and links expire and can only be used once; use the most recent email.

PKCE email links need the same browser and device that requested them. An installed PWA and an email app's browser may use different storage. Entering the code in the PWA avoids that dependency, and also helps when a workplace email scanner consumes a one-use link. If your templates contain only links, the code input cannot work until you add `{{ .Token }}`.

## 5. Verify with a real inbox

1. Create an account with an inbox you control, using the deployed app.
2. Confirm using the email code. Sign out, then sign in with the same password.
3. Save a commute, then check it after signing in on another device.
4. Use **Forgot password?**, enter the reset email's code, choose a new password, and verify the new password works.
5. Repeat signup and recovery from an installed iPhone or Android PWA.
6. Request a fresh email after an expired link; check that the app gives a useful error and still offers guest access.

Automated tests verify these app behaviors with a mocked auth server. A real account/inbox test is still required after SMTP, templates, and redirects are configured; it was not possible against the placeholder deployment.

## Match a failure to its fix

| Symptom or server code                                | Check or action                                                                                                                                                         |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Email address not authorized                          | Configure custom SMTP; the built-in test mailer restricts recipients.                                                                                                   |
| Email not confirmed                                   | Confirm the latest email, or use **Confirm email or resend confirmation**.                                                                                              |
| Invalid login credentials                             | Check the email/password; use Forgot password if needed.                                                                                                                |
| Confirmation opens localhost or the wrong website     | Correct Site URL and Redirect URLs, then request a fresh email.                                                                                                         |
| `otp_expired`                                         | Use a fresh link/code; do not reuse a consumed one.                                                                                                                     |
| `flow_state_expired`, missing verifier, or PKCE error | Use the browser that requested the link, or enter an email code. For confirmation, you can also try signing in with your password after the verification link was used. |
| Email/request rate limit                              | Wait before retrying; check both Supabase and provider quotas.                                                                                                          |
| CAPTCHA verification error                            | Check whether CAPTCHA was enabled in Supabase. This app does not yet collect CAPTCHA tokens.                                                                            |
| Request times out                                     | Check the device connection, project availability, and Authentication logs.                                                                                             |
| No code in the email                                  | Add `{{ .Token }}` to the matching email template.                                                                                                                      |
| Old interface remains after deployment                | Accept the PWA Update prompt and reopen the app.                                                                                                                        |

Sources: [Supabase password auth](https://supabase.com/docs/guides/auth/passwords), [redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [email templates](https://supabase.com/docs/guides/auth/auth-email-templates), [PKCE limitations](https://supabase.com/docs/guides/auth/sessions/pkce-flow), [auth error codes](https://supabase.com/docs/guides/auth/debugging/error-codes).
