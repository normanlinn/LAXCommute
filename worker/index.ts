import { handleAPI as handleFeedAPI } from '../supabase/functions/_shared/handler.ts';
import { supabaseSnapshot } from './supabase';
import type { FeedOptions } from './feed';
import { handleAlerts, type AlertEnv } from './alerts';
export { BusAlert } from './alerts';
export async function handleAPI(request: Request, options?: FeedOptions) {
  return handleFeedAPI(request, options, options ? undefined : supabaseSnapshot);
}
const app = {
  async fetch(
    request: Request,
    env: AlertEnv & {
      ACCOUNT_RATE_LIMITER?: { limit: (input: { key: string }) => Promise<{ success: boolean }> };
      API_RATE_LIMITER?: { limit: (input: { key: string }) => Promise<{ success: boolean }> };
      ALERT_RATE_LIMITER?: { limit: (input: { key: string }) => Promise<{ success: boolean }> };
    },
  ) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return new Response('Not found', { status: 404 });
    const origin = request.headers.get('Origin');
    if (
      origin &&
      origin !== 'https://employeeshuttlelax.com' &&
      !(['127.0.0.1', 'localhost'].includes(url.hostname) && origin === url.origin)
    )
      return Response.json({ error: 'Origin not allowed.' }, { status: 403 });
    const ip = request.headers.get('CF-Connecting-IP');
    if (ip && env.API_RATE_LIMITER && !(await env.API_RATE_LIMITER.limit({ key: ip })).success)
      return Response.json(
        { error: 'Too many requests. Please wait a minute.' },
        { status: 429, headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' } },
      );
    if (
      url.pathname === '/api/alerts' &&
      request.method === 'POST' &&
      ip &&
      env.ALERT_RATE_LIMITER &&
      !(await env.ALERT_RATE_LIMITER.limit({ key: ip })).success
    )
      return Response.json(
        { error: 'Too many alert requests. Please wait a minute.' },
        { status: 429, headers: { 'Retry-After': '60' } },
      );
    const alerts = await handleAlerts(request, env);
    if (alerts) return alerts;
    if (url.pathname === '/api/account') {
      if (
        ip &&
        env.ACCOUNT_RATE_LIMITER &&
        !(await env.ACCOUNT_RATE_LIMITER.limit({ key: ip })).success
      )
        return Response.json(
          { error: 'Too many attempts. Please wait a minute.' },
          { status: 429, headers: { 'Retry-After': '60' } },
        );
      if (request.method !== 'DELETE')
        return Response.json({ error: 'Method not allowed.' }, { status: 405 });
      const auth = request.headers.get('Authorization');
      if (!auth?.startsWith('Bearer ') || auth.length > 8192)
        return Response.json({ error: 'Sign in to delete your account.' }, { status: 401 });
      try {
        const result = await fetch(
          'https://yzdoarjleozzblvsjbhx.supabase.co/functions/v1/delete-account',
          {
            method: 'POST',
            headers: {
              Authorization: auth,
              apikey: 'sb_publishable_AkClR2bp72pGci-NAX1DBQ_8INzT0v1',
            },
            signal: AbortSignal.timeout(18000),
          },
        );
        return new Response(result.body, {
          status: result.status,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff',
          },
        });
      } catch {
        return Response.json(
          { error: 'Account service unavailable. Please try again.' },
          { status: 502, headers: { 'Cache-Control': 'no-store' } },
        );
      }
    }
    return handleAPI(request);
  },
};
export default {
  async fetch(request: Request, env: Parameters<typeof app.fetch>[1]) {
    const response = await app.fetch(request, env);
    const headers = new Headers(response.headers);
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'DENY');
    headers.set('Referrer-Policy', 'no-referrer');
    headers.set('Strict-Transport-Security', 'max-age=31536000');
    headers.set('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; sandbox");
    if (!headers.has('Cache-Control')) headers.set('Cache-Control', 'no-store');
    return new Response(response.body, { status: response.status, headers });
  },
};
