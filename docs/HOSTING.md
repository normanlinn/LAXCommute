# Publish LAXCommute for free

Use **GitHub for the source code and Cloudflare Workers for the live website**. This app includes a small `/api/*` gateway for the shuttle feed, so uploading only its static files to GitHub Pages would leave the live arrivals and bus positions unavailable.

The default Leaflet/OpenFreeMap map needs no token. The existing Supabase public settings are already in the code. Keep your Cloudflare account on **Workers Free**.

## Deploy from your Mac

1. Install Node **24 LTS**, then reopen Terminal and check `node -v`. Node 20.11.1 cannot run this project's Vite version.
2. Open your existing project and update it:

   ```bash
   cd /Users/zawlinnaing/Downloads/LAXCommute/LAXCommute
   git pull --ff-only origin main
   npm ci --cache "$HOME/.npm-laxcommute"
   npm run setup
   ```

   If this is a downloaded ZIP rather than a Git clone, download the latest source from GitHub or clone `https://github.com/normanlinn/LAXCommute.git` into a new folder. `git pull` requires a Git checkout. Do not overwrite local changes without saving them first.

3. Create a free Cloudflare account or sign in to your existing one in your browser.
4. From the project folder, run:

   ```bash
   npx wrangler login
   npm run deploy
   ```

   The first command opens Cloudflare in your browser to authorize Wrangler. Use your own account and complete any verification there. The second builds and publishes both the app and its API.

5. Open the actual `https://...workers.dev` URL printed by Wrangler. Share that URL with users. You do not need to buy a domain.

If a build fails, fix it before deployment. Do not upload just `dist/client`, because that omits the API Worker.

## Deploy directly from GitHub in Cloudflare

This option does not require running npm on your Mac. Cloudflare installs dependencies and builds the project for you.

1. Open the [Cloudflare dashboard](https://dash.cloudflare.com/).
2. Go to **Workers & Pages → Create application → Import a repository → Get started**.
3. Connect GitHub and select **`normanlinn/LAXCommute`**. Grant access to this repository when GitHub asks.
4. Use these settings:

   | Setting                    | Value                        |
   | -------------------------- | ---------------------------- |
   | Worker name                | `laxcommute-web`             |
   | Production branch          | `main`                       |
   | Root directory             | Repository root; leave blank |
   | Build command              | `npm run build`              |
   | Deploy command             | `npx wrangler deploy`        |
   | Build environment variable | `NODE_VERSION` = `24`        |

5. Select **Save and Deploy**. Open the provided **workers.dev** address after the build succeeds.

Keep the Worker name identical to `name` in `wrangler.jsonc`. The repository already includes the Cloudflare Vite plugin and Worker configuration; no Pages output-directory setting is needed.

Later pushes to `main` automatically publish updates. If you deployed with Wrangler first, connect GitHub through **Workers & Pages → laxcommute-web → Settings → Builds → Connect**.

## Make account confirmation return to your website

In **Supabase → Authentication → URL Configuration**:

1. Set **Site URL** to your actual HTTPS Cloudflare address.
2. Add that address with a trailing `/` to **Redirect URLs**.
3. Keep `http://localhost:5173/` as an additional redirect if you develop locally.

This replaces the old localhost confirmation link. Public signup email also needs a configured SMTP provider; Supabase's default test email service is restricted and is not suitable for 500–1,000 users.

## Check the deployed app

- Open `/api/health` on the same website; it should return JSON.
- Check that South, East, and West route stops load. Tap a terminal stop and confirm the boarding selector changes.
- Check that bus positions and departure predictions load when the source feed reports them; an empty feed is not proof of a deployment failure.
- Open **Go home**, choose today's boarding stop, and verify **My commute** still holds your usual terminal.
- Open **Directions to this stop** and choose Apple Maps or Google Maps.
- Test sign-in and account confirmation after finishing the Supabase URL/email setup.
- On iPhone, open in Safari → Share → Add to Home Screen. On Android, use Chrome's Install app or Add to Home screen option.

## Free limits

Cloudflare currently includes **100,000 dynamic Worker requests/day**, and static asset requests are free and unlimited. The app refreshes live data once per minute while the trip screen is visible. Registered-user count alone does not determine traffic; monitor actual daily requests.

OpenStreetMap public tiles have separate best-effort usage rules and no uptime guarantee. Attribution stays visible, requests use normal browser caching, and the app does not download offline tiles. If map traffic becomes heavy, switch the tile URL and attribution to a suitable provider using the documented `.env` settings.

References: [Workers Git integration](https://developers.cloudflare.com/workers/ci-cd/builds/), [build configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/), [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [OpenStreetMap tile policy](https://operations.osmfoundation.org/policies/tiles/), [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp).
