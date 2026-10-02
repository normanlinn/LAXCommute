# Employee Shuttles poster and visit counts

The poster opens:

https://laxcommute.mrzawlinnaing1001.workers.dev/employee-shuttles

The existing single-page application serves this address. It does not redirect to `/`, so analytics can distinguish the poster landing path. Keep this path working when changing the app. A QR code does not expire by itself; it works as long as the destination remains available.

## Enable free Cloudflare Web Analytics

1. In your Cloudflare dashboard, open **Web Analytics**, select **Add a site**, and enter `laxcommute.mrzawlinnaing1001.workers.dev`.
2. Under **Manage site**, copy the public `token` value from the JavaScript snippet. This is a **Web Analytics beacon token**, not a Cloudflare account API token.
3. Set `VITE_CF_WEB_ANALYTICS_TOKEN` to that value in your local `.env` or your Cloudflare Git build variables, then rebuild and deploy the app. The app inserts the beacon automatically when this value is present. Leave it empty to disable tracking.
4. If you already use Cloudflare's automatic snippet injection, use that instead and leave this variable empty. Do not configure both methods.
5. Open the poster link, then allow a few minutes for data to appear. In Web Analytics, select this site and filter **Path** to `/employee-shuttles`. Choose the date range and review **Visits** and **Page views**.

No data is collected by this optional integration until it is configured and deployed. Check the deployed page for the beacon and confirm a test visit appears before relying on the counts.

These figures measure recorded visits to the poster link, not an exact number of people or every camera scan. Repeat visits and shared/bookmarked copies can count again; people who scan without opening the link, offline devices, and analytics blockers may not be counted. Cloudflare Web Analytics does not identify unique employees. Keep the analytics dashboard private in your Cloudflare account.

Sources: [Cloudflare setup](https://developers.cloudflare.com/web-analytics/get-started/), [Path filters](https://developers.cloudflare.com/web-analytics/data-metrics/dimensions/), [metric definitions](https://developers.cloudflare.com/web-analytics/data-metrics/high-level-metrics/).
