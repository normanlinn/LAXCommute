import { config } from '../config';
let clientPromise: Promise<import('@supabase/supabase-js').SupabaseClient> | undefined;
export function getAuthClient() {
  clientPromise ||= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(config.supabaseUrl, config.supabaseKey, {
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
