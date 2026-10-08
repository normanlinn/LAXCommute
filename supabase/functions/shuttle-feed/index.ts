import { backendLimiter, connectingIP } from '../_shared/request-limit.ts';
import { databaseCache } from '../_shared/database-cache.ts';
import { createEdgeHandler } from '../_shared/edge-handler.ts';
const baseURL = Deno.env.get('SUPABASE_URL')!;
const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
if (!baseURL || !secret) throw new Error('Backend environment is incomplete');
const cache = databaseCache(baseURL, secret);
const allow = backendLimiter(baseURL, secret);
Deno.serve(
  createEdgeHandler(
    'sb_publishable_AkClR2bp72pGci-NAX1DBQ_8INzT0v1',
    {
      cache,
      claim: cache.claim,
    },
    (request) => allow(`feed:${connectingIP(request)}`, 1200),
  ),
);
