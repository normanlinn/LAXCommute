import { backendLimiter, connectingIP } from '../_shared/request-limit.ts';
import { createDeleteAccountHandler } from '../_shared/delete-account.ts';
const url = Deno.env.get('SUPABASE_URL')!;
const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
if (!url || !secret) throw new Error('Backend environment is incomplete');
const allow = backendLimiter(url, secret);
Deno.serve(async (request) => {
  try {
    if (request.method !== 'OPTIONS' && !(await allow(`delete-ip:${connectingIP(request)}`, 30)))
      return Response.json({ error: 'Too many requests.' }, { status: 429 });
  } catch {
    return Response.json({ error: 'Backend temporarily unavailable.' }, { status: 503 });
  }
  return createDeleteAccountHandler(url, secret, fetch, (_request, userID) =>
    allow(`delete-user:${userID}`, 3),
  )(request);
});
