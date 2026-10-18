import { backendLimiter, connectingIP } from '../_shared/request-limit.ts';
import { communityCorsHeaders } from '../_shared/community-cors.ts';

const baseURL = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const publishableKey = 'sb_publishable_AkClR2bp72pGci-NAX1DBQ_8INzT0v1';
if (!baseURL || !serviceKey) throw new Error('Supabase environment is incomplete');

const validRoutes = new Set([6883, 6884, 6885]);
const occupancies = new Set(['empty', 'seats', 'standing', 'full']);
const categories = new Set(['suggestion', 'bug', 'other']);
const rateLimit = backendLimiter(baseURL, serviceKey);
const headers = {
  ...communityCorsHeaders,
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; sandbox",
};

function reply(body: unknown, status = 200) {
  return Response.json(body, { status, headers });
}
function serviceHeaders() {
  return {
    apikey: serviceKey,
    Authorization: 'Bearer ' + serviceKey,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}
async function queryDB(path: string, options: RequestInit = {}) {
  return fetch(baseURL + '/rest/v1/' + path, {
    ...options,
    headers: { ...serviceHeaders(), ...(options.headers || {}) },
    signal: AbortSignal.timeout(7500),
  });
}

Deno.serve(async (request: Request) => {
  // Browser CORS preflight has no API key; never count it as a report.
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  const url = new URL(request.url);
  if (request.method !== 'GET' && request.method !== 'POST') {
    return reply({ error: 'Method not allowed.' }, 405);
  }
  if (request.headers.get('apikey') !== publishableKey) {
    return reply({ error: 'Unauthorized.' }, 401);
  }
  const identity = connectingIP(request);
  try {
    if (request.method === 'GET') {
      if ([...url.searchParams.keys()].some((key) => key !== 'routeId')) {
        return reply({ error: 'Invalid request parameters.' }, 400);
      }
      const routeId = Number(url.searchParams.get('routeId'));
      if (!validRoutes.has(routeId)) return reply({ error: 'Invalid route.' }, 400);
      if (!(await rateLimit('community-read:' + identity, 100))) {
        return reply({ error: 'Please wait before refreshing.' }, 429);
      }
      const since = new Date(Date.now() - 15 * 60_000).toISOString();
      const params = new URLSearchParams({
        route_id: 'eq.' + routeId,
        created_at: 'gte.' + since,
        select: 'vehicle_id,occupancy,created_at',
        order: 'created_at.desc',
        limit: '150',
      });
      const response = await queryDB('shuttle_crowd_reports?' + params);
      if (!response.ok) return reply({ error: 'Community reports unavailable.' }, 503);
      const rows = (await response.json()) as Array<{
        vehicle_id: number;
        occupancy: string;
        created_at: string;
      }>;
      // Only share aggregate data, never individual reporter information.
      const byBus = new Map<number, { count: number; recent: string; votes: Map<string, number>; newest: string }>();
      for (const row of rows) {
        if (!Number.isSafeInteger(row.vehicle_id) || !occupancies.has(row.occupancy)) continue;
        const previous = byBus.get(row.vehicle_id) || {
          count: 0,
          recent: row.occupancy,
          votes: new Map<string, number>(),
          newest: row.created_at,
        };
        previous.count++;
        previous.votes.set(row.occupancy, (previous.votes.get(row.occupancy) || 0) + 1);
        byBus.set(row.vehicle_id, previous);
      }
      const reports = Array.from(byBus, ([vehicleId, summary]) => {
        const occupancy = [...summary.votes.entries()].sort(
          (a, b) => b[1] - a[1] || Number(a[0] !== summary.recent) - Number(b[0] !== summary.recent),
        )[0][0];
        return { vehicleId, occupancy, reports: summary.count, reportedAt: summary.newest };
      });
      return reply({ routeId, reports, windowMinutes: 15 });
    }

    if ([...url.searchParams.keys()].length) return reply({ error: 'Invalid parameters.' }, 400);
    if (Number(request.headers.get('content-length') || 0) > 4096) {
      return reply({ error: 'Message is too long.' }, 413);
    }
    const raw = await request.text();
    if (raw.length > 4096) return reply({ error: 'Message is too long.' }, 413);
    let data: Record<string, unknown>;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw Error();
      data = parsed as Record<string, unknown>;
    } catch {
      return reply({ error: 'Invalid request.' }, 400);
    }
    if (data.type === 'crowd') {
      const routeId = data.routeId;
      const vehicleId = data.vehicleId;
      const occupancy = data.occupancy;
      if (!validRoutes.has(routeId as number) || !Number.isSafeInteger(vehicleId) ||
          Number(vehicleId) <= 0 || Number(vehicleId) >= 1_000_000_000 ||
          typeof occupancy !== 'string' || !occupancies.has(occupancy)) {
        return reply({ error: 'Choose a valid bus and crowd level.' }, 400);
      }
      if (!(await rateLimit('crowd-ip:' + identity, 6)) ||
          !(await rateLimit('crowd-vehicle:' + identity + ':' + routeId + ':' + vehicleId, 1))) {
        return reply({ error: 'Please wait a minute before reporting again.' }, 429);
      }
      const response = await queryDB('shuttle_crowd_reports', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ route_id: routeId, vehicle_id: vehicleId, occupancy }),
      });
      return response.ok
        ? reply({ ok: true }, 201)
        : reply({ error: 'Could not save the report. Please retry.' }, 503);
    }
    if (data.type === 'feedback') {
      const category = data.category;
      const message = typeof data.message === 'string' ? data.message.trim() : '';
      const email = typeof data.email === 'string' ? data.email.trim() : '';
      if (typeof category !== 'string' || !categories.has(category) ||
          message.length < 10 || message.length > 2000 ||
          email.length > 254 || (email && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email))) {
        return reply({ error: 'Enter a valid message and optional email.' }, 400);
      }
      if (!(await rateLimit('feedback-ip:' + identity, 1))) {
        return reply({ error: 'Please wait a minute before sending another message.' }, 429);
      }
      const response = await queryDB('developer_feedback', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ category, message, contact_email: email || null }),
      });
      return response.ok
        ? reply({ ok: true }, 201)
        : reply({ error: 'Could not send feedback. Please retry.' }, 503);
    }
    return reply({ error: 'Unknown request type.' }, 400);
  } catch {
    return reply({ error: 'Community service temporarily unavailable.' }, 503);
  }
});
