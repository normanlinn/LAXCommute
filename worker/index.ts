import { FeedError, ROUTE_IDS, routeDetails, liveSnapshot } from './feed';

export async function handleAPI(request: Request, options?: import('./feed').FeedOptions) {
  const url = new URL(request.url);
  const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
  if (request.method !== 'GET')
    return Response.json(
      { error: 'Method not allowed.' },
      { status: 405, headers: { ...headers, Allow: 'GET' } },
    );
  if (url.pathname === '/api/health')
    return Response.json({ status: 'ok', app: 'LAXCommute' }, { headers });
  const match = url.pathname.match(/^\/api\/(routes|live)\/(\d+)$/);
  if (!match) return Response.json({ error: 'Not found.' }, { status: 404, headers });
  const routeID = Number(match[2]);
  if (!ROUTE_IDS.has(routeID))
    return Response.json({ error: 'Unknown shuttle route.' }, { status: 400, headers });
  if (
    [...url.searchParams.keys()].some((key) => key !== 'stopId' || match[1] !== 'live') ||
    url.searchParams.getAll('stopId').length > 1
  )
    return Response.json({ error: 'Invalid request parameters.' }, { status: 400, headers });
  const rawStop = url.searchParams.get('stopId') ?? '0';
  if (!/^\d{1,12}$/.test(rawStop))
    return Response.json({ error: 'Invalid boarding stop.' }, { status: 400, headers });
  try {
    const body =
      match[1] === 'routes'
        ? await routeDetails(routeID, options)
        : await liveSnapshot(routeID, Number(rawStop), options);
    return Response.json(body, { headers });
  } catch (error) {
    const status = error instanceof FeedError ? error.status : 502;
    return Response.json(
      {
        error:
          error instanceof FeedError ? error.message : 'Shuttle data is temporarily unavailable.',
      },
      { status, headers: { ...headers, 'Retry-After': '30' } },
    );
  }
}

export default {
  async fetch(request: Request) {
    if (new URL(request.url).pathname.startsWith('/api/')) return handleAPI(request);
    // Cloudflare serves the static React assets before invoking this Worker.
    return new Response('Not found', { status: 404 });
  },
};
