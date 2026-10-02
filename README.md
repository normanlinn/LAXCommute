# LAXCommute

**Your airport. Your commute.** A responsive React + TypeScript PWA for LAX employee shuttles, built with Tailwind CSS, DaisyUI, Leaflet, OpenFreeMap, and Supabase.

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

`npm run setup` creates your private, ignored `.env` file without overwriting an existing one. The Supabase URL and **public publishable key** are already supplied. The free embedded map works without a map token.

If you see `styleText` or Rolldown errors on Node 20.11.1, update Node first. If npm reports a permission error in `~/.npm`, use `npm ci --cache "$HOME/.npm-laxcommute"` instead of running npm with sudo.

## What works

- South, East, and West employee shuttle routes. East/West default to their own lot and also offer South Lot boarding stops listed by the route feed.
- Live arrival predictions and reported bus GPS positions from the existing LAX tracker feed.
- Interactive free map with route lines, tappable stops, bus markers, touch zoom, and camera controls.
- A directions chooser for Apple Maps or Google Maps, using the currently selected boarding stop.
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

## Free maps and phone directions

The default **Simple** map uses Leaflet for shuttle overlays and MapLibre GL for an **OpenFreeMap Positron** background. It shows your selected boarding stop and buses by default; **Show other stops** reveals other boarding points. Its pale colors make the shuttle route, bus icons, and persistent **BOARD HERE** label stand out. No Apple Developer membership, credit card, or Maps API key is needed. OpenFreeMap currently provides free public hosting without map-view/request caps, but does not offer an uptime guarantee.

The **Street detail** button switches to the original OpenStreetMap raster map. This is also the fallback if the simple map fails to initialize or load within 15 seconds. Switching backgrounds preserves the current camera and shuttle markers. Both views keep visible attribution and load map data online only. `VITE_MAP_PROVIDER=openstreetmap` is retained as the configuration value for this free map component; `apple` still selects the optional Apple implementation.

The phone's native map renderer cannot be embedded directly inside a PWA. Use **Directions to this stop** to choose Apple Maps or Google Maps for walking directions. Supported map links can open the corresponding installed app; otherwise they open its web experience. The PWA does not automatically choose every phone's system-default maps app.

The street-detail fallback uses OpenStreetMap's public tile service, which is **best effort**, with no guaranteed availability or unlimited capacity. It loads only visible tiles directly in the browser and uses normal browser HTTP caching. It does not prefetch tiles or offer offline map downloads. Monitor usage as your audience grows; 500–1,000 registered users is not a guarantee that the public tile service can support every traffic pattern.

Set `VITE_MAP_STYLE_URL` to choose another compatible OpenFreeMap style. To change the street-detail fallback provider, set `VITE_MAP_TILE_URL` and `VITE_MAP_ATTRIBUTION` to its URL template and required attribution, then rebuild. Follow the provider's separate limits and terms.

References: [OpenFreeMap](https://openfreemap.org/), [Leaflet](https://leafletjs.com/), [OpenStreetMap tile policy](https://operations.osmfoundation.org/policies/tiles/), [Apple map links](https://developer.apple.com/library/archive/featuredarticles/iPhoneURLScheme_Reference/MapLinks/MapLinks.html), [Google Maps URLs](https://developers.google.com/maps/documentation/urls/get-started).

## Employee Shuttles QR poster

The poster opens `/employee-shuttles`, which the existing single-page application serves. Optional free Cloudflare Web Analytics can report recorded visits to that path after you configure the public `VITE_CF_WEB_ANALYTICS_TOKEN` and deploy. No analytics is enabled without a token. See [poster and analytics setup](docs/QR-POSTER.md) for setup and counting limitations.

## Optional Apple Maps setup

The Apple MapKit JS implementation is available as an optional alternative. MapKit JS can run in browsers on iPhone and Android.

1. Open [Apple Developer](https://developer.apple.com/account).
2. Go to **Certificates, Identifiers & Profiles → Services → Maps**.
3. Create a **MapKit JS** Maps token restricted to your website domain.
4. Put it in `.env` as `VITE_APPLE_MAPS_TOKEN=your_token`, and set `VITE_MAP_PROVIDER=apple`.
5. Restart the dev server. Rebuild after changing it for a hosted release.

For development, use a separate short-lived test token accepted for your local origin. A domain-restricted production token may not authorize localhost. Keep your production token restricted to the real deployed domain. Only the browser Maps token belongs in this setting; never put Apple's `.p8` signing key into frontend code.

Apple documents a daily allowance of 250,000 map views and 25,000 service calls **per Apple Developer Program membership**. That program normally costs **US$99/year**. Free Cloudflare hosting does not remove Apple's account requirements. Keep `VITE_MAP_PROVIDER=openstreetmap` for the free default if you do not have an Apple token.

References: [MapKit JS](https://developer.apple.com/maps/web/), [Maps tokens](https://developer.apple.com/help/account/service-configurations/maps-tokens), [membership fees](https://developer.apple.com/programs/whats-included/).

## Host for free on Cloudflare

The app uses one Cloudflare Workers project: static React assets are served without invoking the API Worker; `/api/*` runs the live-data gateway. A separate paid server, Pages project, custom domain, or Apple App Store submission is not required.

GitHub stores the code. **GitHub Pages alone cannot run this project's live bus API**, so deploy the complete app to Cloudflare Workers. See the step-by-step [hosting guide](docs/HOSTING.md).

### Option A — deploy from your computer

```bash
npx wrangler login
npm run deploy
```

Wrangler prints your actual `https://...workers.dev` address. Log in to your own Cloudflare account and keep it on **Workers Free**. Review usage before choosing any paid plan.

### Option B — automatic releases from GitHub

In Cloudflare, go to **Workers & Pages → Create application → Import a repository**. Choose `normanlinn/LAXCommute` and the `main` branch. Keep the Worker name **`laxcommute-web`**, matching `wrangler.jsonc`.

Use:

| Setting        | Value                                 |
| -------------- | ------------------------------------- |
| Build command  | `npm run build`                       |
| Deploy command | `npx wrangler deploy`                 |
| Root directory | Repository root                       |
| Node version   | `24`                                  |
| Node variable  | `NODE_VERSION=24`                     |
| Maps token     | Not required for the default free map |

If needed, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as build variables. They are public browser settings, not server secrets. Cloudflare's Git integration owns its own deploy credential; do not commit an API token.

Changing a `VITE_` value requires a new build. The free map and existing Supabase public settings work with no extra build variables.

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
- Free map, optional Apple Maps, account UI, settings UI, and the Supabase SDK have separate chunks.
- Route polylines are decoded when route data loads, not on every countdown tick.
- The map stays mounted while the user views their trip; markers update by ID and camera changes are explicit.
- Countdown updates are isolated from the map; refresh pauses on hidden pages and account/settings screens.
- Predictions expire after 90 seconds; GPS positions expire after 180 seconds. Scheduled predictions are labeled separately.
- Service worker caching covers the app shell only. **Arrivals, API responses, authentication, and map tiles are not cached for offline live display.**

This is the web version of the previous SwiftUI prototype. It does not include an Apple Watch app. Background push notifications and automatic departure detection while the app is closed are future work; this version gives departure advice while the app is open.

## TypeScript and shared boarding

Application components and the Cloudflare Worker use `.ts`/`.tsx` with strict TypeScript checks. `npm run build` runs the type checker before bundling. Tests and small tooling scripts remain JavaScript.

Choose **East** or **West**, then choose a South Lot stop under **Where are you boarding?** The route stays East/West, so the API asks for that route’s arrivals at the selected South stop. Only stops returned by that route are eligible; drop-off and layover stops are excluded. **Usual stop** restores your saved boarding stop (or the selected lot’s first boarding stop). A temporary change does not overwrite your profile.

## Code layout

```text
src/
  components/     Screens, maps, directions, arrivals, installation help
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
npm run typecheck
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
