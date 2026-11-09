import { expect, it } from 'vitest';
import { hasPrivateCredential } from '../scripts/check-public-secrets.mjs';
const jwt = (role) =>
  `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.testsignature`;
it('blocks privileged JWTs and private keys without rejecting public app keys', () => {
  expect(hasPrivateCredential(jwt('service_role'))).toBe(true);
  expect(hasPrivateCredential(jwt('anon'))).toBe(false);
  expect(hasPrivateCredential('sb_publishable_public-app-key')).toBe(false);
  expect(hasPrivateCredential('sb_secret_ABCDEFGHIJKLMNOPQRST')).toBe(true);
  expect(hasPrivateCredential('-----BEGIN PRIVATE KEY-----')).toBe(true);
  expect(hasPrivateCredential('github_pat_ABCDEFGHIJKLMNOPQRSTUVWXYZ')).toBe(true);
});
