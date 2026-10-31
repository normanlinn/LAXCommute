// Web Push (RFC 8291 aes128gcm payloads + RFC 8292 VAPID) on WebCrypto alone,
// so the Worker needs no npm dependency to notify a closed app.

export interface PushSubscriptionJSON {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}
export interface VapidKeys {
  publicKey: string; // base64url, uncompressed P-256 point (65 bytes)
  privateKey: string; // base64url, P-256 scalar d (32 bytes)
  subject: string; // mailto: or https: contact for the push service
}

const encoder = new TextEncoder();
type Bytes = Uint8Array<ArrayBuffer>;

export function base64url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function fromBase64url(value: string): Bytes {
  const padded = value
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}
function concat(...parts: Bytes[]): Bytes {
  const out = new Uint8Array(parts.reduce((sum, p) => sum + p.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}
async function hkdf(salt: Bytes, ikm: Bytes, info: Bytes, bytes: number) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, bytes * 8),
  );
}

// Only real browser push services, so a crafted subscription cannot aim the Worker elsewhere.
const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/,
  /^updates\.push\.services\.mozilla\.com$/,
  /^(?:[a-z0-9-]+\.)*push\.apple\.com$/,
  /^[a-z0-9-]+\.notify\.windows\.com$/,
];
export function validSubscription(value: unknown): value is PushSubscriptionJSON {
  const sub = value as PushSubscriptionJSON;
  if (!sub || typeof sub.endpoint !== 'string' || sub.endpoint.length > 1024) return false;
  let url: URL;
  try {
    url = new URL(sub.endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' || !PUSH_HOSTS.some((host) => host.test(url.hostname)))
    return false;
  try {
    return (
      fromBase64url(sub.keys?.p256dh).length === 65 && fromBase64url(sub.keys?.auth).length === 16
    );
  } catch {
    return false;
  }
}

/** Encrypts one payload for one subscription as a single aes128gcm record. */
export async function encryptPayload(sub: PushSubscriptionJSON, payload: Bytes) {
  const uaPublic = fromBase64url(sub.keys.p256dh);
  const authSecret = fromBase64url(sub.keys.auth);
  const local = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
    'deriveBits',
  ])) as CryptoKeyPair;
  const asPublic = new Uint8Array(
    (await crypto.subtle.exportKey('raw', local.publicKey)) as ArrayBuffer,
  );
  const uaKey = await crypto.subtle.importKey(
    'raw',
    uaPublic,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  );
  const shared = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, local.privateKey, 256),
  );
  const ikm = await hkdf(
    authSecret,
    shared,
    concat(encoder.encode('WebPush: info\0'), uaPublic, asPublic),
    32,
  );
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, encoder.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, encoder.encode('Content-Encoding: nonce\0'), 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  // 0x02 marks the last (only) record.
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonce },
      key,
      concat(payload, new Uint8Array([2])),
    ),
  );
  const header = new Uint8Array(21);
  new DataView(header.buffer).setUint32(16, 4096);
  header.set(salt, 0);
  header[20] = asPublic.length;
  return concat(header, asPublic, cipher);
}

export async function vapidAuthorization(endpoint: string, vapid: VapidKeys, now = Date.now()) {
  const pub = fromBase64url(vapid.publicKey);
  const key = await crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC',
      crv: 'P-256',
      d: vapid.privateKey,
      x: base64url(pub.slice(1, 33)),
      y: base64url(pub.slice(33, 65)),
      ext: true,
    },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  const part = (value: object) => base64url(encoder.encode(JSON.stringify(value)));
  const unsigned = `${part({ typ: 'JWT', alg: 'ES256' })}.${part({
    aud: new URL(endpoint).origin,
    exp: Math.floor(now / 1000) + 12 * 3600,
    sub: vapid.subject,
  })}`;
  const signature = new Uint8Array(
    await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, encoder.encode(unsigned)),
  );
  return `vapid t=${unsigned}.${base64url(signature)}, k=${vapid.publicKey}`;
}

/** Returns the push service status; 404/410 mean the subscription is gone for good. */
export async function sendPush(
  sub: PushSubscriptionJSON,
  message: object,
  vapid: VapidKeys,
  fetcher: typeof fetch = fetch,
) {
  const body = await encryptPayload(sub, encoder.encode(JSON.stringify(message)));
  const response = await fetcher(sub.endpoint, {
    method: 'POST',
    headers: {
      Authorization: await vapidAuthorization(sub.endpoint, vapid),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      // A late "bus is close" alert is useless, so let the push service drop it.
      TTL: '120',
      Urgency: 'high',
    },
    body,
    signal: AbortSignal.timeout(10_000),
  });
  return response.status;
}
