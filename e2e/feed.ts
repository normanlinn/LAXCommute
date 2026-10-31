import type { Page } from '@playwright/test';
import route from './fixtures/route-6885.json' with { type: 'json' };
import live from './fixtures/live-6885.json' with { type: 'json' };

/** Replays the captured South Lot feed with timestamps moved to "now". */
export async function mockFeed(page: Page) {
  // Keep runs offline-safe: no map tiles, fonts or analytics from the network.
  await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  await page.route(/\/api\/routes\/\d+$/, (r) => r.fulfill({ json: route }));
  await page.route(/\/api\/live\/\d+/, (r) => {
    const url = new URL(r.request().url());
    const shift = Date.now() - Date.parse(live.arrivalFetchedAt);
    const moved = (iso: string) => new Date(Date.parse(iso) + shift).toISOString();
    return r.fulfill({
      json: {
        ...live,
        routeID: Number(url.pathname.split('/').pop()),
        stopID: Number(url.searchParams.get('stopId')) || 0,
        vehicleFetchedAt: moved(live.vehicleFetchedAt),
        arrivalFetchedAt: moved(live.arrivalFetchedAt),
        vehicles: live.vehicles.map((v) => ({ ...v, lastUpdated: moved(v.lastUpdated) })),
        arrivals: live.arrivals.map((a) => ({
          ...a,
          vehicle: a.vehicle && { ...a.vehicle, lastUpdated: moved(a.vehicle.lastUpdated) },
        })),
      },
    });
  });
}
