/**
 * Browser-readable community API (API key and server-side abuse limits remain required).
 * No cookies/credential sharing: the client sends only a public apikey header.
 */
export const communityCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'apikey, authorization, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '3600',
} as const;
