import { config } from '../config';
import { authFetch } from './authFetch';
let clientPromise: Promise<import('@supabase/supabase-js').SupabaseClient> | undefined;
export function getAuthClient() {
  clientPromise ||= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(config.supabaseUrl, config.supabaseKey, {
      global: { fetch: authFetch },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    }),
  );
  return clientPromise;
}
