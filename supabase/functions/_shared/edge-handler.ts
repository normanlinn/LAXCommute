import { handleAPI } from './handler.ts';
import type { FeedOptions } from './feed.ts';
export function createEdgeHandler(
  appKey: string,
  options: FeedOptions,
  allow?: (request: Request) => Promise<boolean>,
) {
  return async (request: Request) => {
    const origin = request.headers.get('Origin');
    if (origin && origin !== 'https://employeeshuttlelax.com')
      return new Response('Origin not allowed', { status: 403 });
    const cors: Record<string, string> = origin
      ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' }
      : {};
    if (request.method === 'OPTIONS')
      return new Response(null, {
        status: 204,
        headers: {
          ...cors,
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'apikey, content-type',
        },
      });
    // Public shuttle data uses explicit application-key authentication for guest access.
    if (!appKey || request.headers.get('apikey') !== appKey)
      return Response.json(
        { error: 'Invalid application key.' },
        { status: 401, headers: { ...cors, 'Cache-Control': 'no-store' } },
      );
    if (allow) {
      try {
        if (!(await allow(request)))
          return Response.json(
            { error: 'Too many requests.' },
            { status: 429, headers: { ...cors, 'Retry-After': '60' } },
          );
      } catch {
        return Response.json(
          { error: 'Backend temporarily unavailable.' },
          { status: 503, headers: cors },
        );
      }
    }
    const url = new URL(request.url);
    const offset = url.pathname.indexOf('/shuttle-feed');
    if (offset < 0) return new Response('Not found', { status: 404 });
    url.pathname = url.pathname.slice(offset + '/shuttle-feed'.length);
    const result = await handleAPI(new Request(url, { method: request.method }), options);
    for (const [name, value] of Object.entries(cors)) result.headers.set(name, value);
    return result;
  };
}
