import { describe, expect, it } from 'vitest';
import {
  communityCorsHeaders,
  allowedCommunityOrigin,
} from '../supabase/functions/_shared/community-cors';

describe('cross-origin community requests', () => {
  it('allows unauthenticated preflights but no browser credentials', () => {
    expect(communityCorsHeaders['Access-Control-Allow-Origin']).toBe(
      'https://employeeshuttlelax.com',
    );
    expect(communityCorsHeaders['Access-Control-Allow-Methods']).toContain('OPTIONS');
    for (const header of ['apikey', 'content-type']) {
      expect(communityCorsHeaders['Access-Control-Allow-Headers']).toContain(header);
    }
    expect('Access-Control-Allow-Credentials' in communityCorsHeaders).toBe(false);
  });
  it('rejects unrelated browser origins without treating CORS as authentication', () => {
    expect(
      allowedCommunityOrigin(
        new Request('https://api.test', { headers: { Origin: 'https://evil.test' } }),
      ),
    ).toBe(false);
    expect(
      allowedCommunityOrigin(new Request('https://api.test', { headers: { Origin: 'null' } })),
    ).toBe(false);
    expect(
      allowedCommunityOrigin(
        new Request('https://api.test', { headers: { Origin: 'https://employeeshuttlelax.com' } }),
      ),
    ).toBe(true);
    expect(allowedCommunityOrigin(new Request('https://api.test'))).toBe(true);
  });
});
