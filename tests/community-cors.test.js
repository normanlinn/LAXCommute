import { describe, expect, it } from 'vitest';
import { communityCorsHeaders } from '../supabase/functions/_shared/community-cors';

describe('cross-origin community requests', () => {
  it('allows unauthenticated preflights but no browser credentials', () => {
    expect(communityCorsHeaders['Access-Control-Allow-Origin']).toBe('*');
    expect(communityCorsHeaders['Access-Control-Allow-Methods']).toContain('OPTIONS');
    for (const header of ['apikey', 'content-type']) {
      expect(communityCorsHeaders['Access-Control-Allow-Headers']).toContain(header);
    }
    expect('Access-Control-Allow-Credentials' in communityCorsHeaders).toBe(false);
  });
});
