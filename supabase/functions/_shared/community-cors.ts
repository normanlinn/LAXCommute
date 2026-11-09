/**
 * Only the production app may make cross-origin browser requests.
 * No cookies/credential sharing: the client sends only a public apikey header.
 */
export const communityCorsHeaders = {
  'Access-Control-Allow-Origin': 'https://employeeshuttlelax.com',
  Vary: 'Origin',
  'Access-Control-Allow-Headers': 'apikey, authorization, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '3600',
} as const;
export function allowedCommunityOrigin(request: Request) {
  const origin = request.headers.get('Origin');
  return !origin || origin === communityCorsHeaders['Access-Control-Allow-Origin'];
}
