import { expect, test, type Page } from '@playwright/test';
import { mockFeed } from './feed';

async function open(page: Page) {
  await mockFeed(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Explore first' }).click();
  await expect(page.locator('.arrival-row').first()).toBeVisible();
}
async function noSideScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, 'page scrolls sideways').toBeLessThanOrEqual(0);
}

test('shows live arrivals for the default stop', async ({ page }) => {
  await open(page);
  const next = page.locator('.arrival-row').first();
  await expect(next.getByText('Live')).toBeVisible();
  await expect(next.getByText('Bus 8001')).toBeVisible();
  await expect(next.locator('.arrival-time strong')).toHaveText(/^\d+$/);
});

test('every tab fits the screen without sideways scrolling', async ({ page }) => {
  await open(page);
  await noSideScroll(page);
  for (const tab of ['Go home', 'My commute', 'Account', 'Explore']) {
    await page.getByRole('navigation').getByRole('button', { name: tab }).click();
    await page.waitForTimeout(400);
    await noSideScroll(page);
  }
});

test('the bell sets and cancels a bus-close alert', async ({ page, context }) => {
  await context.grantPermissions(['notifications']);
  await open(page);
  const bell = page.getByRole('button', { name: /Alert me 2 min before bus 8001/ });
  await bell.click();
  const on = page.getByRole('button', { name: /Cancel alert for bus 8001/ });
  await expect(on).toHaveAttribute('aria-pressed', 'true');
  await on.click();
  await expect(bell).toHaveAttribute('aria-pressed', 'false');
});

test('switching language loads Spanish on demand and keeps it after reload', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('button', { name: 'Español' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await page.getByRole('button', { name: 'Cerrar menú' }).click();
  await expect(page.locator('.arrival-row').first().getByText('Autobús 8001')).toBeVisible();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(page.getByText('Autobús 8001').filter({ visible: true }).first()).toBeVisible();
});

test('going offline keeps the last data and says so', async ({ page, context }) => {
  await open(page);
  await context.setOffline(true);
  await expect(page.locator('.offline-banner')).toBeVisible();
  await expect(page.locator('.arrival-row').first()).toBeVisible();
  await context.setOffline(false);
  await expect(page.locator('.offline-banner')).toBeHidden();
});

test('a GPS fix turns into a leave-by time for the next bus', async ({ page, context }) => {
  // ~240 m from South Lot Stop #1.
  await context.setGeolocation({ latitude: 33.951, longitude: -118.393406, accuracy: 15 });
  await context.grantPermissions(['geolocation']);
  await open(page);
  await page.getByRole('button', { name: 'Use my location' }).click();
  const card = page.locator('.leave-card');
  await expect(card).toContainText(/Leave in \d+ min|Time to head to your stop/);
  await expect(card).toContainText('min walk from where you are');
});

test('when the live feed is down, riders get a link to the official times for their lot', async ({
  page,
}) => {
  await mockFeed(page);
  await page.route(/\/api\/live\/\d+/, (r) =>
    r.fulfill({ status: 502, json: { error: 'Shuttle data is temporarily unavailable.' } }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Explore first' }).click();
  await expect(page.getByText('Plan your trip while live tracking is paused')).toBeVisible();
  await expect(page.getByRole('link', { name: /View official live arrivals/ })).toHaveAttribute(
    'href',
    'https://laxbus.syncromatics.com/route/6885/direction/south-lot/stop/11319089/arrivals',
  );
});

test('the menu shows version history with an update count', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByText("What's new", { exact: true }).click();
  await expect(page.getByText(/\d+ updates since/)).toBeVisible();
  await expect(page.locator('.release-timeline > li').first()).toContainText('Latest');
});

test('an outage announcement explains why live times are missing and can be dismissed', async ({
  page,
}) => {
  await mockFeed(page);
  await page.route(/\/api\/live\/\d+/, (r) =>
    r.fulfill({ status: 502, json: { error: 'Shuttle data is temporarily unavailable.' } }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Explore first' }).click();
  const notice = page.locator('.outage-notice');
  await expect(notice).toContainText('Live bus times are temporarily unavailable');
  await expect(notice).toContainText('Syncromatics');
  await notice.getByRole('button', { name: 'Dismiss announcement' }).click();
  await expect(notice).toBeHidden();
  await page.reload();
  await expect(page.locator('.outage-notice')).toBeHidden();
});

test('no outage announcement while live times are working', async ({ page }) => {
  await open(page);
  await expect(page.locator('.outage-notice')).toHaveCount(0);
});

test('riders can choose an avatar, and it shows in the header after reload', async ({ page }) => {
  await open(page);
  await page.getByRole('navigation').getByRole('button', { name: 'Account' }).click();
  await page.getByRole('radio', { name: 'Moon' }).check({ force: true });
  const header = page.locator('.header-actions .profile-button .avatar-circle');
  await expect(header).toBeVisible();
  await expect(header).toHaveCSS('background-color', 'rgb(88, 86, 214)');
  await page.reload();
  await expect(page.locator('.header-actions .profile-button .avatar-circle')).toHaveCSS(
    'background-color',
    'rgb(88, 86, 214)',
  );
});

test('riders can pick one of eight themes, and it stays after reload', async ({ page }) => {
  await open(page);
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'mono');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await expect(page.locator('.theme-dot')).toHaveCount(8);
  await page.locator('.theme-dot[title="Royal navy and gold"]').click();
  await expect(page.locator('.theme-current')).toHaveText('Royal navy and gold');
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'royal');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'royal');
});

test('riders can set a nickname and are greeted by it', async ({ page }) => {
  await open(page);
  await page.getByRole('navigation').getByRole('button', { name: 'Account' }).click();
  await page.getByLabel('What should we call you?').fill('Norman');
  await page.getByLabel('What should we call you?').press('Enter');
  await page.getByRole('navigation').getByRole('button', { name: 'Explore' }).click();
  await expect(page.locator('.greeting')).toContainText(/Good (morning|afternoon|evening), Norman/);
  await page.reload();
  await expect(page.locator('.greeting')).toContainText('Norman');
});

test('after an update, returning riders see what changed once', async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('laxcommute:seen-version', '1.0.0');
      sessionStorage.setItem('seeded', '1');
    }
  });
  await mockFeed(page);
  await page.goto('/');
  await expect(page.locator('.whats-new-toast')).toContainText(/Updated to v\d+\.\d+\.\d+/);
  await page.reload();
  await expect(page.locator('.whats-new-toast')).toHaveCount(0);
});
