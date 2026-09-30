import { useEffect, useState } from 'react';
import { normalizeCommute } from '../domain/commute';
import { getAuthClient } from '../services/auth';
import { useAccount } from './useAccount';

export function readLocalCommute(id = 'guest') {
  try {
    return normalizeCommute(JSON.parse(localStorage.getItem(`laxcommute:profile:${id}`)));
  } catch {
    return normalizeCommute(null);
  }
}
export function useCommute() {
  const { user, ready } = useAccount();
  const identity = user?.id || 'guest';
  const [state, setState] = useState(() => ({ identity: 'guest', profile: readLocalCommute() }));
  const [saveState, setSaveState] = useState('');
  const profile =
    state.identity === identity
      ? state.profile
      : normalizeCommute(user?.user_metadata?.commute || readLocalCommute(identity));
  useEffect(() => {
    if (!ready) return;
    const saved = normalizeCommute(user?.user_metadata?.commute || readLocalCommute(identity));
    setState({ identity, profile: saved });
    setSaveState('');
  }, [identity, ready, user?.user_metadata?.commute]);
  async function save(value) {
    const next = normalizeCommute(value);
    setSaveState('Saving…');
    if (user) {
      const client = await getAuthClient();
      const { error } = await client.auth.updateUser({ data: { commute: next } });
      if (error) {
        setSaveState(error.message);
        throw error;
      }
    }
    try {
      localStorage.setItem(`laxcommute:profile:${identity}`, JSON.stringify(next));
    } catch {
      /* Cloud saves still work if browser storage is unavailable. */
    }
    setState({ identity, profile: next });
    setSaveState(user ? 'Saved to your account.' : 'Saved on this device.');
  }
  return { profile, save, saveState };
}
