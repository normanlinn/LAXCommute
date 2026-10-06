import type { Commute } from '../types';
import { useEffect, useState } from 'react';
import { normalizeCommute, ROUTES, TERMINALS } from '../domain/commute';
import { getAuthClient } from '../services/auth';
import { useAccount } from './useAccount';

function storedCommute(storage: Storage, key: string) {
  try {
    const value = JSON.parse(storage.getItem(key) || 'null');
    if (
      !value ||
      !ROUTES.some((route) => route.lot === value.lot) ||
      !TERMINALS.includes(value.terminal)
    )
      return null;
    return normalizeCommute(value);
  } catch {
    return null;
  }
}
export function readCommuteSettings(identity = 'guest', accountCommute?: unknown) {
  let local: Commute | null = null;
  let session: Commute | null = null;
  try {
    local = storedCommute(localStorage, `laxcommute:profile:${identity}`);
  } catch {
    /* Unavailable storage. */
  }
  try {
    session = storedCommute(sessionStorage, `laxcommute:session-profile:${identity}`);
  } catch {
    /* Unavailable storage. */
  }
  return {
    identity,
    profile: normalizeCommute(accountCommute || session || local),
    hasSaved: Boolean(accountCommute || session || local),
    remember: Boolean(local) || !session,
  };
}
export function readLocalCommute(identity = 'guest') {
  return readCommuteSettings(identity).profile;
}
export function useCommute() {
  const { user, ready } = useAccount();
  const identity = user?.id || 'guest';
  const [state, setState] = useState(() => readCommuteSettings());
  const [saveState, setSaveState] = useState('');
  const settings =
    state.identity === identity
      ? state
      : readCommuteSettings(identity, user?.user_metadata?.commute);
  useEffect(() => {
    if (!ready) return;
    setState(readCommuteSettings(identity, user?.user_metadata?.commute));
    setSaveState('');
  }, [identity, ready, user?.user_metadata?.commute]);
  async function save(value: Commute, remember = true) {
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
    let persisted = false;
    try {
      if (remember) {
        localStorage.setItem(`laxcommute:profile:${identity}`, JSON.stringify(next));
        sessionStorage.removeItem(`laxcommute:session-profile:${identity}`);
      } else {
        // An explicit opt-out also removes a previously remembered profile.
        localStorage.removeItem(`laxcommute:profile:${identity}`);
        sessionStorage.setItem(`laxcommute:session-profile:${identity}`, JSON.stringify(next));
      }
      persisted = true;
    } catch {
      /* Keep current settings in memory and report the actual save outcome. */
    }
    setState({ identity, profile: next, hasSaved: true, remember: remember && persisted });
    setSaveState(
      user
        ? 'Saved to your account.'
        : !persisted
          ? 'Saved for this visit. Browser storage is unavailable.'
          : remember
            ? 'Saved on this device.'
            : 'Saved for this browser session only.',
    );
  }
  return {
    profile: settings.profile,
    hasSaved: settings.hasSaved,
    remember: settings.remember,
    save,
    saveState,
  };
}
