import type { Commute } from '../types';
import { useEffect, useRef, useState } from 'react';
import { normalizeCommute, ROUTES, TERMINALS } from '../domain/commute';
import { loadAccountCommute, saveAccountCommute } from '../services/commute';
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
  const saveNoticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const operation = useRef(0);
  const activeIdentity = useRef(identity);
  activeIdentity.current = identity;
  useEffect(() => () => clearTimeout(saveNoticeTimer.current), []);
  const settings =
    state.identity === identity
      ? state
      : readCommuteSettings(identity, user?.user_metadata?.commute);
  useEffect(() => {
    if (!ready) return;
    clearTimeout(saveNoticeTimer.current);
    setState(readCommuteSettings(identity, user?.user_metadata?.commute));
    setSaveState('');
    const version = ++operation.current;
    let alive = true;
    if (user) {
      loadAccountCommute(identity)
        .then((profile) => {
          if (!alive || version !== operation.current || activeIdentity.current !== identity)
            return;
          if (profile) setState((previous) => ({ ...previous, identity, profile, hasSaved: true }));
        })
        .catch(() => {
          if (alive && version === operation.current && activeIdentity.current === identity)
            setSaveState(
              'Could not load account settings. Your saved device settings are still available.',
            );
        });
    }
    return () => {
      alive = false;
    };
  }, [identity, ready, user?.user_metadata?.commute]);
  async function save(value: Commute, remember = true) {
    const next = normalizeCommute(value);
    const version = ++operation.current;
    clearTimeout(saveNoticeTimer.current);
    setSaveState('Saving…');
    if (user) {
      try {
        await saveAccountCommute(identity, next);
      } catch (error) {
        if (activeIdentity.current === identity && version === operation.current)
          setSaveState('Could not save to your account. Please try again.');
        throw error;
      }
    }
    if (activeIdentity.current !== identity || version !== operation.current) return;
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
    if (persisted || user) saveNoticeTimer.current = setTimeout(() => setSaveState(''), 5_000);
  }
  return {
    profile: settings.profile,
    hasSaved: settings.hasSaved,
    remember: settings.remember,
    save,
    saveState,
  };
}
