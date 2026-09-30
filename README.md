# LAXCommute

**Your airport. Your commute.** A responsive React PWA for LAX employee shuttles, built with Tailwind CSS, DaisyUI, Apple Maps, and Supabase.

Check real shuttle predictions, choose a boarding stop, and keep your everyday terminal and parking lot saved. Install the website on an iPhone or Android home screen.

## Start on your computer

Install Node.js **22.12 or newer** (Node 24 recommended), then open Terminal:

```bash
git clone git@github.com:normanlinn/LAXCommute.git
cd LAXCommute
npm ci
npm run setup
npm run dev
```

Open the local address printed by Vite, usually **http://localhost:5173**. If SSH is not configured, clone with `https://github.com/normanlinn/LAXCommute.git` instead.

`npm run setup` creates your private, ignored `.env` file without overwriting an existing one. The Supabase URL and **public publishable key** are already supplied. The embedded Apple map needs your own Maps token; departures work without it.

## What works

- South, East, and West employee shuttle routes.
- Live arrival predictions and reported bus GPS positions from the existing LAX tracker feed.
- A visible **To work / To parking** direction switch and **Go home** navigation.
- Saved terminal and exact boarding stops for both directions.
- A temporary stop for today, without changing your saved commute.
- User-requested nearest-stop selection; manual stop selection always remains available.
- Walking time plus a departure buffer, with advice based on a catchable fresh prediction.
- Supabase sign-in, account creation, email confirmation, password recovery, and account-specific saved settings.
- Guest settings saved on the current device.
- DaisyUI buttons, inputs, selects, tabs, cards, alerts, collapses, and a native accessible dialog.
- Responsive phone, tablet, and desktop layouts; reduced-motion support.
- PWA manifest, iPhone/Android icons, install help, offline shell, and an explicit update prompt.

## Apple Maps setup

This project uses **Apple MapKit JS**, not OpenFreeMap or another map provider. MapKit JS can run in browsers on iPhone and Android.

1. Open [Apple Developer](https://developer.apple.com/account).
2. Go to **Certificates, Identifiers & Profiles → Services → Maps**.
3. Create a **MapKit JS** Maps token restricted to your website domain.
4. Put it in `.env` as `VITE_APPLE_MAPS_TOKEN=your_token`.
5. Restart the dev server. Rebuild after changing it for a hosted release.

For development, use a separate short-lived test token accepted for your local origin. A domain-restricted production token may not authorize localhost. Keep your production token restricted to the real deployed domain. Only the browser Maps token belongs in this setting; never put Apple's `.p8` signing key into frontend code.

Apple documents a daily allowance of 250,000 map views and 25,000 service calls **per Apple Developer Program membership**. That program normally costs **US$99/year**. Free Cloudflare hosting does not remove Apple's account requirements. If you do not have access to create a valid Maps token, the embedded map stays unavailable; **Open Apple Maps** links and the live departure list still work. This project does not bypass Apple's requirements.

References: [MapKit JS](https://developer.apple.com/maps/web/), [Maps tokens](https://developer.apple.com/help/account/service-configurations/maps-tokens), [membership fees](https://developer.apple.com/programs/whats-included/).

## Host for free on Cloudflare

The app uses one Cloudflare Workers project: static React assets are served without invoking the API Worker; `/api/*` runs the live-data gateway. A separate paid server, Pages project, custom domain, or Apple App Store submission is not required.

### Option A — deploy from your computer

```bash
npx wrangler login
npm run deploy
```

Wrangler prints your actual `https://...workers.dev` address. Log in to your own Cloudflare account and keep it on **Workers Free**. Review usage before choosing any paid plan.

### Option B — automatic releases from GitHub

In Cloudflare, go to **Workers & Pages → Create → connect a Git repository**. Choose `normanlinn/LAXCommute` and the `main` branch.

Use:

| Setting        | Value                                                     |
| -------------- | --------------------------------------------------------- |
| Build command  | `npm run build`                                           |
| Deploy command | `npx wrangler deploy`                                     |
| Root directory | Repository root                                           |
| Node version   | `24`                                                      |
| Build variable | `VITE_APPLE_MAPS_TOKEN` with your domain-restricted token |

If needed, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as build variables. They are public browser settings, not server secrets. Cloudflare's Git integration owns its own deploy credential; do not commit an API token.

On the first release, you can leave the Maps token empty to obtain your final domain, create a token for that domain, then rebuild. Changing a `VITE_` value requires a new build.

The free tier currently allows **100,000 dynamic Worker requests/day**. Static asset requests are free and unlimited. The default **60-second refresh** only runs while the trip screen is open and the page is visible. Server caching reduces upstream LAX requests but incoming Worker requests still count. Free-plan exhaustion can temporarily stop API responses; this code does not enable automatic paid upgrades.

Example planning estimate: 1,000 people using the app for one hour daily at one combined refresh per minute is about **60,000 live requests/day**, before initial loads, manual refreshes, retries, and route changes. Monitor actual traffic; this is an estimate, not a capacity guarantee.

Reference: [Cloudflare pricing](https://developers.cloudflare.com/workers/platform/pricing/).

## Finish Supabase account setup

Your existing project is configured. No new database schema is required: the small saved commute is stored in the signed-in user's own `user_metadata.commute`.

In **Supabase → Authentication → URL Configuration**:

- Set **Site URL** to the actual deployed HTTPS address, replacing `localhost`.
- Add that address with its trailing `/` to **Redirect URLs**.
- Add `http://localhost:5173/` for local development.
- If Vite uses another port, allow that exact development address too.

Enable an SMTP provider for public email signups and password recovery. Supabase's default email service is intended for testing, restricted to project-team addresses, and currently allows only two messages/hour. You can keep Supabase Free while using an email provider; the provider has its own allowances. Do not count on the built-in test mailer to onboard 500–1,000 people.

References: [redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

## Add to your home screen

**iPhone:** open the deployed website in Safari → Share → Add to Home Screen → Add.

**Android:** open it in Chrome → Install app, or menu → Add to Home screen.

HTTPS is required for production installation and location access. An HTTP LAN address used from a phone may not support those capabilities. Localhost on the computer is an exception.

## Performance and data behavior

- One combined live request for the selected route/stop per refresh, rather than independent duplicate arrival/map polling.
- TanStack Query shares requests, cancels unused requests, caches stops, and handles retries.
- Apple Maps, account UI, settings UI, and the Supabase SDK have separate chunks.
- Route polylines are decoded when route data loads, not on every countdown tick.
- The map stays mounted while the user views their trip; markers update by ID and camera changes are explicit.
- Countdown updates are isolated from the map; refresh pauses on hidden pages and account/settings screens.
- Predictions expire after 90 seconds; GPS positions expire after 180 seconds. Scheduled predictions are labeled separately.
- Service worker caching covers the app shell only. **Arrivals, API responses, authentication, and Apple map data are not cached for offline live display.**

This is the web version of the previous SwiftUI prototype. It does not include an Apple Watch app. Background push notifications and automatic departure detection while the app is closed are future work; this version gives departure advice while the app is open.

## Code layout

```text
src/
  components/     Screens, Apple map, arrivals, installation help
  components/ui/  Shared DaisyUI components
  domain/         Pure commute, distance, route-shape, and prediction rules
  hooks/          Query, account, and saved-commute state
  services/       Shuttle API and lazy Supabase client
worker/           Fixed-path public shuttle gateway and caching
tests/            Arrival, boarding, gateway, and UI regression checks
public/           PWA icons and response headers
scripts/          Non-destructive local setup
```

## Check and update

```bash
npm test
npm run format:check
npm run build
npm run deploy:check
```

`deploy:check` packages a deployment without publishing it. GitHub Actions runs tests and a production build for main-branch pushes and pull requests.

Use `npm run format` to keep source files consistently formatted with Prettier. Formatting, tests, and builds run automatically in GitHub Actions.

To push a change:

```bash
git add .
git commit -m "Describe your change"
git push origin main
```

Never commit `.env`, service-role keys, signing keys, `node_modules`, or generated `dist` files. The supplied Supabase publishable key is intentionally public.

The shuttle endpoint belongs to the existing public LAX Syncromatics tracker. It is not a published supported API contract; behavior or availability can change. The app shows errors, expires old data, and offers the original [LAX tracker](https://shuttles.flylax.com/employeeparking) when the feed is unavailable.

LAXCommute is an independent employee commute project and is not an official LAWA or airline service.
