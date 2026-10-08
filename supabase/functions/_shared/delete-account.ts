export function createDeleteAccountHandler(
  baseURL: string,
  secret: string,
  fetcher = globalThis.fetch,
  allow?: (request: Request, userID: string) => Promise<boolean>,
) {
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get('Origin');
    if (origin && origin !== 'https://employeeshuttlelax.com')
      return new Response('Origin not allowed', { status: 403 });
    const headers = {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...(origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}),
    };
    if (request.method === 'OPTIONS')
      return new Response(null, {
        status: 204,
        headers: {
          ...headers,
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
        },
      });
    if (request.method !== 'POST')
      return Response.json({ error: 'Method not allowed.' }, { status: 405, headers });
    const token = request.headers.get('Authorization');
    if (!token?.startsWith('Bearer ') || token.length > 8192)
      return Response.json({ error: 'Sign in to delete your account.' }, { status: 401, headers });
    try {
      const verified = await fetcher(`${baseURL}/auth/v1/user`, {
        headers: { apikey: secret, Authorization: token },
        signal: AbortSignal.timeout(5000),
      });
      if (!verified.ok)
        return Response.json(
          { error: 'Sign in again to delete your account.' },
          { status: 401, headers },
        );
      const user = await verified.json();
      if (!/^[0-9a-f-]{36}$/i.test(user.id || '')) throw new Error();
      if (allow && !(await allow(request, user.id)))
        return Response.json(
          { error: 'Too many attempts. Please wait a minute.' },
          { status: 429, headers: { ...headers, 'Retry-After': '60' } },
        );
      const signedIn = Date.parse(user.last_sign_in_at || '');
      if (!Number.isFinite(signedIn) || Date.now() - signedIn > 10 * 60000)
        return Response.json(
          {
            error: 'Please sign out and sign in again, then delete your account within 10 minutes.',
          },
          { status: 403, headers },
        );
      // Revoke refresh sessions before deleting the authenticated user. Never accept a body user ID.
      const revoked = await fetcher(`${baseURL}/auth/v1/logout?scope=global`, {
        method: 'POST',
        headers: { apikey: secret, Authorization: token },
        signal: AbortSignal.timeout(5000),
      });
      if (!revoked.ok) throw new Error();
      const deleted = await fetcher(`${baseURL}/auth/v1/admin/users/${user.id}`, {
        method: 'DELETE',
        headers: { apikey: secret, Authorization: `Bearer ${secret}` },
        signal: AbortSignal.timeout(5000),
      });
      if (!deleted.ok) throw new Error();
      return Response.json({ deleted: true }, { headers });
    } catch {
      return Response.json(
        { error: 'Could not delete your account. Please sign in and try again.' },
        { status: 502, headers },
      );
    }
  };
}
