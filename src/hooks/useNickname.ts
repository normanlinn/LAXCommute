import { useCallback, useEffect, useState } from 'react';
import { NICKNAME_STORAGE_KEY, cleanNickname } from '../domain/nickname';
import { useAccount } from './useAccount';
import { getAuthClient } from '../services/auth';

function savedLocally() {
  try {
    return cleanNickname(localStorage.getItem(NICKNAME_STORAGE_KEY));
  } catch {
    return '';
  }
}
// Every greeting and field on screen follows the latest nickname.
const listeners = new Set<(name: string) => void>();

/**
 * The rider's nickname. Guests keep it on this device; signed-in riders also store
 * it in their account profile so the greeting follows them to other devices.
 */
export function useNickname() {
  const { user } = useAccount();
  const fromAccount = user?.user_metadata?.nickname;
  const [local, setLocal] = useState(savedLocally);
  useEffect(() => {
    listeners.add(setLocal);
    return () => {
      listeners.delete(setLocal);
    };
  }, []);
  const nickname = typeof fromAccount === 'string' ? cleanNickname(fromAccount) : local;

  const setNickname = useCallback(
    async (value: string) => {
      const name = cleanNickname(value);
      try {
        if (name) localStorage.setItem(NICKNAME_STORAGE_KEY, name);
        else localStorage.removeItem(NICKNAME_STORAGE_KEY);
      } catch {
        // The nickname still applies for this visit.
      }
      listeners.forEach((listen) => listen(name));
      if (!user) return;
      try {
        const client = await getAuthClient();
        await client.auth.updateUser({ data: { nickname: name } });
      } catch {
        // Kept on this device; the account copy updates on the next successful save.
      }
    },
    [user],
  );
  return { nickname, setNickname };
}
