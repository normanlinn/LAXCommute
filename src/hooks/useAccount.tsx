import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getAuthClient } from '../services/auth';
import { authErrorMessage, clearAuthReturn, readAuthReturn } from '../domain/auth';

type Account = {
  user: import('@supabase/supabase-js').User | null;
  ready: boolean;
  authError: string;
  authReturn: boolean;
  authMessage: string;
  clearAuthError: () => void;
  recovering: boolean;
  setRecovering: (value: boolean) => void;
};
const AccountContext = createContext<Account | null>(null);
export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<import('@supabase/supabase-js').User | null>(null);
  const [ready, setReady] = useState(false);
  const [callback] = useState(() => readAuthReturn(location.href));
  const [authError, setAuthError] = useState(callback.error);
  const [authMessage, setAuthMessage] = useState('');
  const [recovering, setRecovering] = useState(false);
  useEffect(() => {
    let alive = true;
    let subscription: import('@supabase/supabase-js').Subscription | undefined;
    getAuthClient()
      .then(async (client) => {
        if (!alive) return;
        const result = client.auth.onAuthStateChange((event, session) => {
          if (!alive) return;
          setUser(session?.user || null);
          if (event === 'PASSWORD_RECOVERY') setRecovering(true);
          if (event === 'SIGNED_OUT') {
            setRecovering(false);
            setAuthMessage('');
          }
        });
        subscription = result.data.subscription;
        // getSession() does not report errors from the SDK's initial URL exchange.
        const initialization = await client.auth.initialize();
        const unconsumedCode = callback.hasCode && new URL(location.href).searchParams.has('code');
        const { data, error } = await client.auth.getSession();
        if (alive) {
          setUser(data.session?.user || null);
          setReady(true);
          if (callback.error || initialization.error || error || unconsumedCode) {
            setAuthError(
              callback.error ||
                authErrorMessage(initialization.error || error || { code: 'bad_code_verifier' }),
            );
          } else if (callback.hasGrant && data.session) {
            if (callback.recovery) setRecovering(true);
            else setAuthMessage('Your email is confirmed. You’re signed in.');
          }
          if (callback.active) clearAuthReturn();
        }
      })
      .catch((error) => {
        if (alive) {
          setReady(true);
          setAuthError(authErrorMessage(error));
          if (callback.active) clearAuthReturn();
        }
      });
    return () => {
      alive = false;
      subscription?.unsubscribe();
    };
  }, [callback]);
  const value = useMemo(
    () => ({
      user,
      ready,
      authError,
      authReturn: callback.active,
      authMessage,
      clearAuthError: () => setAuthError(''),
      recovering,
      setRecovering,
    }),
    [user, ready, authError, callback.active, authMessage, recovering],
  );
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}
export function useAccount() {
  const account = useContext(AccountContext);
  if (!account) throw new Error('AccountProvider is required');
  return account;
}
