# PWA reliability and map

There is one interactive street map with an SVG shuttle route. Anime.js draws the route once and eases bus markers between received GPS coordinates; it does not simulate driving or predict positions. Reduced-motion preferences bypass these animations. Routes, stops, and markers remain visible when background map images fail. Map imagery is fetched from the configured map provider; this app does not bulk-cache tiles.

The service worker uses NetworkFirst for public `/api/routes/` and `/api/live/` responses only. It falls back after eight seconds or upstream/network failures. Route geometry is retained for up to 30 days; up to 24 live snapshots are retained for one day. Partial/error responses never replace a good snapshot. Account sessions and private API responses are not included. Cached responses carry `X-LAXCommute-Cached: 1`; the client preserves the original source timestamps and does not show cached predictions or GPS markers as current. Local settings still work offline. On a first visit without any cached data, stops and times cannot load offline.

The app already applies the selected light/dark theme to browser theme-color. The manifest has a stable ID, name, scope, start URL, regular icons, and a separately padded maskable icon. Social cards use a 1200×630 PNG.

## Release checks

Run `npm test`, `npm run build`, and `npm run format:check`. Test an installed app after one successful online load, disconnect, reopen, and verify saved route data and the stale label. Reconnect and verify actual live timestamps return. Test all three routes and switching boarding stops.

Run Chrome Lighthouse accessibility, performance, and best-practices audits on the deployed homepage. Current Lighthouse no longer provides the former PWA audit category; check installability in Chrome DevTools Application separately. No Lighthouse score is claimed by this release.

## Arrival alerts

Background five-minute alerts are not implemented. They require an opt-in Push API subscription, server-side feed monitoring, VAPID credentials, secure subscription storage, and deduplication/expiry so stale arrivals do not generate alerts. On iPhone, push requires an installed Home Screen app and permission requested from a user action. Do not advertise background alerts until the complete flow has been tested on a physical phone.
