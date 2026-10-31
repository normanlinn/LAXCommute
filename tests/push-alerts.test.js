import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  base64url,
  encryptPayload,
  fromBase64url,
  validSubscription,
  vapidAuthorization,
} from '../worker/push';
import { ALERT_LEAD_MS, BusAlert, CHECK_MS, LOST_MS, handleAlerts } from '../worker/alerts';

const enc = new TextEncoder();
const cat = (...parts) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) out.set(p, (o += p.length) - p.length);
  return out;
};
async function hkdf(salt, ikm, info, bytes) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, bytes * 8),
  );
}

// A browser-side subscription whose private key the test keeps for decrypting.
async function browser() {
  const pair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
    'deriveBits',
  ]);
  const pub = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
  const auth = crypto.getRandomValues(new Uint8Array(16));
  return {
    pair,
    pub,
    auth,
    subscription: {
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
      keys: { p256dh: base64url(pub), auth: base64url(auth) },
    },
  };
}
async function decrypt(ua, body) {
  const salt = body.slice(0, 16);
  const idlen = body[20];
  const asPub = body.slice(21, 21 + idlen);
  const asKey = await crypto.subtle.importKey(
    'raw',
    asPub,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  );
  const shared = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: asKey }, ua.pair.privateKey, 256),
  );
  const ikm = await hkdf(ua.auth, shared, cat(enc.encode('WebPush: info\0'), ua.pub, asPub), 32);
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']);
  const plain = new Uint8Array(
    await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, key, body.slice(21 + idlen)),
  );
  expect(plain.at(-1)).toBe(2);
  return new TextDecoder().decode(plain.slice(0, -1));
}
async function vapidKeys() {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
    'verify',
  ]);
  const { d } = await crypto.subtle.exportKey('jwk', pair.privateKey);
  return {
    pair,
    keys: {
      publicKey: base64url(new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey))),
      privateKey: d,
      subject: 'https://employeeshuttlelax.com',
    },
  };
}

describe('web push encoding', () => {
  it('encrypts a payload a browser can decrypt (RFC 8291)', async () => {
    const ua = await browser();
    const body = await encryptPayload(ua.subscription, enc.encode('{"title":"Bus close"}'));
    expect(new DataView(body.buffer).getUint32(16)).toBe(4096);
    expect(await decrypt(ua, body)).toBe('{"title":"Bus close"}');
  });

  it('signs a VAPID token the push service can verify', async () => {
    const { pair, keys } = await vapidKeys();
    const header = await vapidAuthorization('https://fcm.googleapis.com/fcm/send/x', keys);
    const [, token, k] = header.match(/^vapid t=([^,]+), k=(.+)$/);
    expect(k).toBe(keys.publicKey);
    const [h, c, s] = token.split('.');
    const claims = JSON.parse(new TextDecoder().decode(fromBase64url(c)));
    expect(claims.aud).toBe('https://fcm.googleapis.com');
    const ok = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      pair.publicKey,
      fromBase64url(s),
      enc.encode(`${h}.${c}`),
    );
    expect(ok).toBe(true);
  });

  it('only accepts subscriptions on real push services', async () => {
    const { subscription } = await browser();
    expect(validSubscription(subscription)).toBe(true);
    expect(validSubscription({ ...subscription, endpoint: 'https://web.push.apple.com/QGx' })).toBe(
      true,
    );
    for (const endpoint of [
      'https://evil.example.com/push',
      'http://fcm.googleapis.com/fcm/send/x',
      'https://fcm.googleapis.com.evil.com/x',
      'https://169.254.169.254/latest',
    ])
      expect(validSubscription({ ...subscription, endpoint })).toBe(false);
    expect(validSubscription({ ...subscription, keys: { p256dh: 'AAAA', auth: 'AAAA' } })).toBe(
      false,
    );
  });
});

const NOW = Date.parse('2026-10-31T08:00:00Z');
function memoryStorage() {
  const data = new Map();
  return {
    data,
    alarm: null,
    get: async (k) => data.get(k),
    put: async (k, v) => void data.set(k, structuredClone(v)),
    deleteAll: async () => data.clear(),
    async setAlarm(t) {
      this.alarm = t;
    },
    async deleteAlarm() {
      this.alarm = null;
    },
  };
}
const liveSnapshot = (secondsAway, vehicleID = 541) => ({
  arrivalFetchedAt: new Date(Date.now()).toISOString(),
  arrivals: [
    {
      secondsToArrival: secondsAway,
      route: { id: 6885 },
      pattern: { directionType: 'Loop' },
      vehicle: { id: vehicleID, name: String(vehicleID), lastUpdated: new Date().toISOString() },
    },
  ],
});

describe('bus alert durable object', () => {
  let ua, vapid, storage, alert, pushes;
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    ua = await browser();
    vapid = await vapidKeys();
    storage = memoryStorage();
    alert = new BusAlert(
      { storage },
      { VAPID_PUBLIC_KEY: vapid.keys.publicKey, VAPID_PRIVATE_KEY: vapid.keys.privateKey },
    );
    pushes = [];
    alert.fetcher = async (url, init) => {
      pushes.push({ url, init });
      return new Response(null, { status: 201 });
    };
    const res = await alert.fetch(
      new Request('https://bus-alert/start', {
        method: 'POST',
        body: JSON.stringify({
          subscription: ua.subscription,
          routeID: 6885,
          stopID: 1,
          vehicleID: 541,
          title: 'Your shuttle is almost here',
          body: 'Bus 541 is about 2 min from South Lot.',
        }),
      }),
    );
    expect(res.status).toBe(201);
  });
  afterEach(() => vi.useRealTimers());

  it('waits while the bus is far, then pushes once it is two minutes out', async () => {
    alert.snapshot = async () => liveSnapshot(6 * 60);
    await alert.alarm();
    expect(pushes).toHaveLength(0);
    expect(storage.alarm).toBe(NOW + CHECK_MS);

    vi.setSystemTime(NOW + 4 * 60_000);
    alert.snapshot = async () => liveSnapshot(ALERT_LEAD_MS / 1000);
    await alert.alarm();
    expect(pushes).toHaveLength(1);
    expect(pushes[0].url).toBe(ua.subscription.endpoint);
    expect(pushes[0].init.headers.TTL).toBe('120');
    const message = JSON.parse(await decrypt(ua, pushes[0].init.body));
    expect(message.body).toBe('Bus 541 is about 2 min from South Lot.');
    expect(storage.data.size).toBe(0);
    expect(storage.alarm).toBeNull();
  });

  it('never pushes from stale or missing data, and gives up on a lost bus', async () => {
    alert.snapshot = async () => ({
      ...liveSnapshot(60),
      arrivalFetchedAt: '2026-10-31T07:00:00Z',
    });
    await alert.alarm();
    alert.snapshot = async () => liveSnapshot(60, 999);
    await alert.alarm();
    expect(pushes).toHaveLength(0);
    expect(storage.data.size).toBe(1);

    vi.setSystemTime(NOW + LOST_MS + 1_000);
    await alert.alarm();
    expect(pushes).toHaveLength(0);
    expect(storage.data.size).toBe(0);
  });

  it('can be cancelled', async () => {
    const res = await alert.fetch(new Request('https://bus-alert/cancel', { method: 'DELETE' }));
    expect(res.status).toBe(204);
    expect(storage.data.size).toBe(0);
    expect(storage.alarm).toBeNull();
  });
});

describe('alert routes', () => {
  it('reports push as disabled until keys are configured', async () => {
    const res = await handleAlerts(new Request('https://x.test/api/alerts/key'), {});
    expect(res.status).toBe(404);
    expect(await handleAlerts(new Request('https://x.test/api/live/1'), {})).toBeNull();
  });

  it('rejects malformed alerts before creating anything', async () => {
    const get = vi.fn();
    const env = {
      VAPID_PUBLIC_KEY: 'k',
      VAPID_PRIVATE_KEY: 'p',
      BUS_ALERTS: { idFromName: (n) => n, get },
    };
    const res = await handleAlerts(
      new Request('https://x.test/api/alerts', {
        method: 'POST',
        body: JSON.stringify({ subscription: { endpoint: 'https://evil.example.com' } }),
      }),
      env,
    );
    expect(res.status).toBe(400);
    expect(get).not.toHaveBeenCalled();
    const bad = await handleAlerts(
      new Request('https://x.test/api/alerts/not-a-uuid', { method: 'DELETE' }),
      env,
    );
    expect(bad.status).toBe(404);
  });
});
