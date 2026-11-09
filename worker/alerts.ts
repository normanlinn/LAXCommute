import { normalizeArrivals, snapshotFresh } from '../src/domain/arrivals';
import { supabaseSnapshot } from './supabase';
import { sendPush, validSubscription, type PushSubscriptionJSON, type VapidKeys } from './push';
import { readLimitedText, RequestBodyError } from '../supabase/functions/_shared/request-body';

// Same lead as the in-app alert (src/hooks/useBusAlert.ts).
export const ALERT_LEAD_MS = 2 * 60_000;
// Predictions move, so re-check at least this often while waiting.
export const CHECK_MS = 30_000;
// Give up on a bus that drops out of the live feed, and on any alert after an hour.
export const LOST_MS = 5 * 60_000;
export const MAX_AGE_MS = 60 * 60_000;

export interface AlertRecord {
  subscription: PushSubscriptionJSON;
  routeID: number;
  stopID: number;
  vehicleID: number;
  title: string;
  body: string;
  created: number;
  lastSeen: number;
  attempts: number;
}
interface Storage {
  get<T>(key: string): Promise<T | undefined>;
  put(key: string, value: unknown): Promise<void>;
  deleteAll(): Promise<void>;
  setAlarm(time: number): Promise<void>;
  deleteAlarm(): Promise<void>;
}
interface Namespace {
  idFromName(name: string): unknown;
  get(id: unknown): { fetch(url: string, init?: RequestInit): Promise<Response> };
}
export interface AlertEnv {
  BUS_ALERTS?: Namespace;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
}

function vapid(env: AlertEnv): VapidKeys | null {
  return env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY
    ? {
        publicKey: env.VAPID_PUBLIC_KEY,
        privateKey: env.VAPID_PRIVATE_KEY,
        subject: env.VAPID_SUBJECT || 'https://employeeshuttlelax.com',
      }
    : null;
}
const text = (value: unknown, max: number) =>
  typeof value === 'string' && value.trim() && value.length <= max ? value.trim() : null;
const id = (value: unknown) =>
  Number.isSafeInteger(value) && (value as number) > 0 ? (value as number) : null;

export function parseAlertRequest(value: unknown, now = Date.now()): AlertRecord | null {
  const input = value as Record<string, unknown>;
  if (!input || typeof input !== 'object' || !validSubscription(input.subscription)) return null;
  const routeID = id(input.routeID);
  const stopID = id(input.stopID);
  const vehicleID = id(input.vehicleID);
  const title = text(input.title, 80);
  const body = text(input.body, 200);
  if (!routeID || ![6883, 6884, 6885].includes(routeID) || !stopID || !vehicleID || !title || !body)
    return null;
  const { endpoint, keys } = input.subscription as PushSubscriptionJSON;
  return {
    subscription: { endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } },
    routeID,
    stopID,
    vehicleID,
    title,
    body,
    created: now,
    lastSeen: now,
    attempts: 0,
  };
}

/**
 * One instance per alert. It follows the live prediction for one bus at one stop
 * and pushes once when that bus is ALERT_LEAD_MS away, then deletes itself.
 * It never extrapolates: no fresh live prediction means no push.
 */
export class BusAlert {
  storage: Storage;
  env: AlertEnv;
  snapshot = supabaseSnapshot;
  fetcher: typeof fetch = (...args) => fetch(...args);
  constructor(state: { storage: Storage }, env: AlertEnv) {
    this.storage = state.storage;
    this.env = env;
  }
  async fetch(request: Request) {
    if (request.method === 'DELETE') {
      await this.clear();
      return new Response(null, { status: 204 });
    }
    const record = parseAlertRequest(await request.json().catch(() => null));
    if (!record) return Response.json({ error: 'Invalid alert.' }, { status: 400 });
    await this.storage.put('alert', record);
    await this.storage.setAlarm(Date.now());
    return new Response(null, { status: 201 });
  }
  async clear() {
    await this.storage.deleteAlarm();
    await this.storage.deleteAll();
  }
  async alarm() {
    const record = await this.storage.get<AlertRecord>('alert');
    const keys = vapid(this.env);
    if (!record || !keys) return this.clear();
    const now = Date.now();
    if (now - record.created > MAX_AGE_MS) return this.clear();
    let due: number | undefined;
    try {
      const snap = (await this.snapshot('live', record.routeID, record.stopID)) as {
        arrivals?: never[];
        arrivalFetchedAt?: string | null;
        sourceUnavailable?: boolean;
        arrivalSourceUnavailable?: boolean;
      };
      if (
        !snap.sourceUnavailable &&
        !snap.arrivalSourceUnavailable &&
        snapshotFresh(snap.arrivalFetchedAt, now)
      )
        due = normalizeArrivals(snap.arrivals || [], record.routeID, snap.arrivalFetchedAt ?? null)
          .filter((p) => !p.scheduled && p.vehicleID === record.vehicleID && p.due > now - 60_000)
          .at(0)?.due;
    } catch {
      /* Treat a feed hiccup like a missing prediction and check again. */
    }
    if (due === undefined) {
      if (now - record.lastSeen > LOST_MS) return this.clear();
      return this.storage.setAlarm(now + CHECK_MS);
    }
    record.lastSeen = now;
    const wait = due - ALERT_LEAD_MS - now;
    if (wait > 0) {
      await this.storage.put('alert', record);
      return this.storage.setAlarm(now + Math.min(CHECK_MS, Math.max(5_000, wait)));
    }
    let status = 0;
    try {
      status = await sendPush(
        record.subscription,
        { title: record.title, body: record.body, tag: 'laxcommute-bus-alert', url: '/' },
        keys,
        this.fetcher,
      );
    } catch {
      /* Network failure: retry below. */
    }
    // One quick retry for a transient push-service failure; 4xx (incl. 404/410 gone) is final.
    if ((status === 0 || status >= 500) && record.attempts < 1) {
      record.attempts += 1;
      await this.storage.put('alert', record);
      return this.storage.setAlarm(now + 10_000);
    }
    return this.clear();
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const noStore = { 'Cache-Control': 'no-store' };

/** /api/alerts routes, or null when the path is not an alert route. */
export async function handleAlerts(request: Request, env: AlertEnv) {
  const { pathname } = new URL(request.url);
  if (!pathname.startsWith('/api/alerts')) return null;
  const keys = vapid(env);
  if (!keys || !env.BUS_ALERTS)
    return Response.json(
      { error: 'Push alerts are not enabled.' },
      { status: 404, headers: noStore },
    );
  if (pathname === '/api/alerts/key' && request.method === 'GET')
    return Response.json(
      { publicKey: keys.publicKey },
      { headers: { 'Cache-Control': 'public, max-age=3600' } },
    );
  if (pathname === '/api/alerts' && request.method === 'POST') {
    let raw: string;
    try {
      raw = await readLimitedText(request);
    } catch (error) {
      return Response.json(
        { error: error instanceof RequestBodyError ? error.message : 'Invalid alert.' },
        { status: error instanceof RequestBodyError ? error.status : 400, headers: noStore },
      );
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
    if (!parseAlertRequest(parsed))
      return Response.json({ error: 'Invalid alert.' }, { status: 400, headers: noStore });
    // The random id is the only handle, so only its creator can cancel it.
    const alertID = crypto.randomUUID();
    const stub = env.BUS_ALERTS.get(env.BUS_ALERTS.idFromName(alertID));
    const result = await stub.fetch('https://bus-alert/start', { method: 'POST', body: raw });
    if (result.status !== 201)
      return Response.json({ error: 'Invalid alert.' }, { status: 400, headers: noStore });
    return Response.json({ id: alertID }, { status: 201, headers: noStore });
  }
  const match = pathname.match(/^\/api\/alerts\/([0-9a-f-]+)$/);
  if (match && UUID.test(match[1]) && request.method === 'DELETE') {
    await env.BUS_ALERTS.get(env.BUS_ALERTS.idFromName(match[1])).fetch(
      'https://bus-alert/cancel',
      {
        method: 'DELETE',
      },
    );
    return new Response(null, { status: 204, headers: noStore });
  }
  return Response.json({ error: 'Not found.' }, { status: 404, headers: noStore });
}
