export function backendLimiter(baseURL: string, secret: string, fetcher = globalThis.fetch) {
  return async (identity: string, limit: number): Promise<boolean> => {
    const digest = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(`${secret}:${identity}`),
    );
    const bucket_key = Array.from(new Uint8Array(digest), (x) =>
      x.toString(16).padStart(2, '0'),
    ).join('');
    const response = await fetcher(`${baseURL}/rest/v1/rpc/consume_backend_request`, {
      method: 'POST',
      headers: {
        apikey: secret,
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bucket_key, request_limit: limit }),
      signal: AbortSignal.timeout(2000),
    });
    if (!response.ok) throw new Error('Request limiter unavailable');
    if (Math.random() < 0.02) {
      const cutoff = new Date(Date.now() - 15 * 60000).toISOString();
      try {
        await fetcher(
          `${baseURL}/rest/v1/backend_request_limits?window_start=lt.${encodeURIComponent(cutoff)}`,
          {
            method: 'DELETE',
            headers: { apikey: secret, Authorization: `Bearer ${secret}` },
            signal: AbortSignal.timeout(2000),
          },
        );
      } catch {
        /* Later requests retry cache cleanup. */
      }
    }
    return (await response.json()) === true;
  };
}
// Supabase's gateway forwards the connecting IP; the app's original client is limited at Cloudflare.
export const connectingIP = (request: Request) =>
  (request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown').slice(0, 128);
