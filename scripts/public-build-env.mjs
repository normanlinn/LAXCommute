import { loadEnv } from 'vite';
import { pathToFileURL } from 'node:url';

// Vite ships VITE_* values to the browser. A private Supabase key must stop the build.
export function validatePublicBuildEnv(env) {
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
  let role;
  try {
    role = JSON.parse(Buffer.from(key.split('.')[1] || '', 'base64url').toString()).role;
  } catch {
    // Modern publishable keys aren't JWTs.
  }
  if (key.startsWith('sb_secret_') || role === 'service_role')
    throw new Error('Use a public Supabase publishable/anon key in the browser build.');
  if (Object.keys(env).some((name) => /^VITE_.*(?:SERVICE_ROLE|SECRET|PASSWORD)/i.test(name)))
    throw new Error('Remove private credentials from VITE_* build variables.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  validatePublicBuildEnv(loadEnv('production', process.cwd(), 'VITE_'));
