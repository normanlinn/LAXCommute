import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getAuthClient } from '../services/auth';

type Account = {
  user: import('@supabase/supabase-js').User | null;
  ready: boolean;
  authError: string;
  recovering: boolean;
  setRecovering: (value: boolean) => void;
};
const AccountContext = createContext<Account | null>(null);
export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<import('@supabase/supabase-js').User | null>(null);
  const [ready, setReady] = useState(false);
  const [authError, setAuthError] = useState('');
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
          setReady(true);
        });
        subscription = result.data.subscription;
        const { data, error } = await client.auth.getSession();
        if (alive) {
          setUser(data.session?.user || null);
          setReady(true);
          if (error) setAuthError(error.message);
        }
      })
      .catch((error) => {
        if (alive) {
          setReady(true);
          setAuthError(error.message);
        }
      });
    return () => {
      alive = false;
      subscription?.unsubscribe();
    };
  }, []);
  const value = useMemo(
    () => ({ user, ready, authError, recovering, setRecovering }),
    [user, ready, authError, recovering],
  );
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}
export function useAccount() {
  const account = useContext(AccountContext);
  if (!account) throw new Error('AccountProvider is required');
  return account;
}
