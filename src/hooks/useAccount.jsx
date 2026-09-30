import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getAuthClient } from '../services/auth';

const AccountContext = createContext(null);
export function AccountProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [authError, setAuthError] = useState('');
  const [recovering, setRecovering] = useState(false);
  useEffect(() => {
    let alive = true,
      subscription;
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
  return useContext(AccountContext);
}
