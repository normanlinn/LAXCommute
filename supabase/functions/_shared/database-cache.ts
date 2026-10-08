export function databaseCache(baseURL: string, secret: string, fetcher = globalThis.fetch) {
  const headers = { apikey: secret, Authorization: `Bearer ${secret}` };
  const endpoint = `${baseURL}/rest/v1/shuttle_feed_cache`;
  const pathFor = (key: RequestInfo | URL) =>
    decodeURIComponent(
      new URL(key instanceof Request ? key.url : String(key)).pathname.slice('/feed/'.length),
    );
  return {
    async match(key: RequestInfo | URL): Promise<Response | undefined> {
      const url = new URL(endpoint);
      url.searchParams.set('path', `eq.${pathFor(key)}`);
      url.searchParams.set('select', 'envelope');
      url.searchParams.set('limit', '1');
      try {
        const response = await fetcher(url, { headers, signal: AbortSignal.timeout(2000) });
        if (!response.ok) throw new Error();
        const rows = await response.json();
        return rows[0]?.envelope ? Response.json(rows[0].envelope) : undefined;
      } catch {
        console.warn('Shuttle cache read unavailable');
        return undefined;
      }
    },
    async claim(path: string): Promise<boolean> {
      const response = await fetcher(`${baseURL}/rest/v1/rpc/claim_shuttle_feed`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ feed_path: path }),
        signal: AbortSignal.timeout(2000),
      });
      if (!response.ok) throw new Error('Cache lease unavailable');
      return (await response.json()) === true;
    },
    async put(key: RequestInfo | URL, response: Response): Promise<void> {
      try {
        const envelope = await response.json();
        const ttl = Number(response.headers.get('Cache-Control')?.match(/max-age=(\d+)/)?.[1]);
        const result = await fetcher(endpoint, {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates,return=minimal',
          },
          body: JSON.stringify({
            path: pathFor(key),
            envelope,
            expires_at: new Date(Date.parse(envelope.fetchedAt) + ttl * 1000).toISOString(),
          }),
          signal: AbortSignal.timeout(2000),
        });
        if (!result.ok) throw new Error();
      } catch {
        console.warn('Shuttle cache write unavailable');
      }
    },
  };
}
