import { expect, it } from 'vitest';
import { validatePublicBuildEnv } from '../scripts/public-build-env.mjs';

const legacyKey = (role) =>
  `header.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.signature`;
it.each(['sb_secret_test', legacyKey('service_role')])('blocks private Supabase keys', (key) => {
  expect(() => validatePublicBuildEnv({ VITE_SUPABASE_PUBLISHABLE_KEY: key })).toThrow();
});
it('blocks other private VITE variables without including their values in the error', () => {
  expect(() => validatePublicBuildEnv({ VITE_SMTP_PASSWORD: 'private-value' })).toThrow(
    'Remove private credentials',
  );
});
it.each(['sb_publishable_test', legacyKey('anon'), ''])(
  'allows public browser configuration',
  (key) => {
    expect(() => validatePublicBuildEnv({ VITE_SUPABASE_PUBLISHABLE_KEY: key })).not.toThrow();
  },
);
