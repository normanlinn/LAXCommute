export const feedCaching = ['routes', 'live'].map((kind) => ({
  urlPattern:
    kind === 'routes'
      ? ({ url, sameOrigin }) => sameOrigin && /^\/api\/routes\/[0-9]+$/.test(url.pathname)
      : ({ url, sameOrigin }) => sameOrigin && /^\/api\/live\/[0-9]+$/.test(url.pathname),
  handler: 'NetworkFirst',
  options: {
    cacheName: `laxcommute-${kind}-v1`,
    networkTimeoutSeconds: 8,
    cacheableResponse: { statuses: [200] },
    expiration: {
      maxEntries: kind === 'routes' ? 3 : 24,
      maxAgeSeconds: kind === 'routes' ? 30 * 86400 : 86400,
    },
    plugins: [
      {
        cacheWillUpdate: async ({ response }) => {
          if (response.status !== 200) return null;
          const data = await response.clone().json();
          return data.warnings?.length || data.warning ? null : response;
        },
        fetchDidSucceed: async ({ response }) => {
          if (response.status >= 500) throw new Error('Shuttle source unavailable');
          return response;
        },
        cachedResponseWillBeUsed: async ({ cachedResponse }) => {
          if (!cachedResponse) return null;
          const headers = new Headers(cachedResponse.headers);
          headers.set('X-LAXCommute-Cached', '1');
          return new Response(cachedResponse.body, {
            status: cachedResponse.status,
            headers,
          });
        },
      },
    ],
  },
}));
