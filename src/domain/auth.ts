import { errorMessage } from './errors';

export function authErrorMessage(reason: unknown): string {
  const error = reason as {
    code?: string;
    status?: number;
    message?: string;
    details?: { code?: string };
  } | null;
  const code = error?.code || error?.details?.code;
  const message = errorMessage(reason, 'Could not complete this request. Please try again.');
  if (code === 'email_not_confirmed' || /email not confirmed/i.test(message))
    return 'Confirm your email before signing in. You can resend the confirmation below.';
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(message))
    return 'The email or password is incorrect. Try again or use Forgot password.';
  if (code === 'otp_expired')
    return 'This email link or code has expired or was already used. Request a new one below.';
  if (
    ['flow_state_not_found', 'flow_state_expired', 'bad_code_verifier', 'bad_oauth_state'].includes(
      code || '',
    ) ||
    /code verifier|pkce/i.test(message)
  )
    return 'Open the latest email link in the browser where you requested it, or enter the email code here. For an expired link, request a new one.';
  if (code === 'email_address_not_authorized' || /email address not authorized/i.test(message))
    return 'Account emails are not available for this address yet. Please contact the app maintainer, or continue as a guest.';
  if (
    code === 'over_email_send_rate_limit' ||
    code === 'over_request_rate_limit' ||
    error?.status === 429
  )
    return 'Too many attempts. Wait a few minutes before requesting another email or trying again.';
  if (code === 'email_provider_disabled' || code === 'signup_disabled')
    return 'Account creation is temporarily unavailable. You can still use the tracker as a guest.';
  if (code === 'unexpected_failure' && /email|smtp/i.test(message))
    return 'The confirmation email could not be sent. Please try later or contact the app maintainer.';
  if (/fetch|network|abort|timed out|timeout/i.test(message))
    return 'The account server could not be reached. Check your connection and try again. The tracker is available as a guest.';
  return message;
}

export function readAuthReturn(href: string) {
  const url = new URL(href);
  const hash = new URLSearchParams(url.hash.slice(1));
  const get = (key: string) => url.searchParams.get(key) || hash.get(key);
  const error = get('error_code') || get('error') || get('error_description');
  return {
    active:
      /^\/auth\/(confirm|recovery)\/?$/.test(url.pathname) ||
      Boolean(get('code') || get('access_token') || error),
    recovery: url.pathname.replace(/\/$/, '') === '/auth/recovery' || get('type') === 'recovery',
    hasCode: Boolean(get('code')),
    hasGrant: Boolean(get('code') || get('access_token')),
    error: error
      ? authErrorMessage({
          code: get('error_code') || undefined,
          message:
            get('error_description') ||
            'The email link could not be verified. Request a new one below.',
        })
      : '',
  };
}

export function authReturnUrl(type: 'confirm' | 'recovery', origin = location.origin) {
  return new URL(`/auth/${type}`, origin).href;
}

// Remove consumed grants and errors while preserving unrelated navigation parameters.
export function clearAuthReturn() {
  const url = new URL(location.href);
  const keys = [
    'code',
    'sb_flow_id',
    'access_token',
    'refresh_token',
    'expires_at',
    'expires_in',
    'token_type',
    'type',
    'error',
    'error_code',
    'error_description',
  ];
  const hash = new URLSearchParams(url.hash.slice(1));
  const authHash = keys.some((key) => hash.has(key));
  for (const key of keys) {
    url.searchParams.delete(key);
    if (authHash) hash.delete(key);
  }
  if (authHash) url.hash = hash.toString();
  history.replaceState(history.state, '', `${url.pathname}${url.search}${url.hash}`);
}
