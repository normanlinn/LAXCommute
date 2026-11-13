import { useCallback, useEffect, useState } from 'react';
import { AVATAR_STORAGE_KEY, DEFAULT_AVATAR, isAvatarID, type AvatarID } from '../domain/avatars';
import { useAccount } from './useAccount';
import { getAuthClient } from '../services/auth';

function savedLocally(): AvatarID {
  try {
    const value = localStorage.getItem(AVATAR_STORAGE_KEY);
    return isAvatarID(value) ? value : DEFAULT_AVATAR;
  } catch {
    return DEFAULT_AVATAR;
  }
}
// Every mounted avatar (header, Account tab) follows the latest choice.
const listeners = new Set<(id: AvatarID) => void>();

/**
 * The rider's avatar. Guests keep it on this device; signed-in riders also store
 * it in their account profile so it follows them to other devices.
 */
export function useAvatar() {
  const { user } = useAccount();
  const fromAccount = user?.user_metadata?.avatar;
  const [local, setLocal] = useState<AvatarID>(savedLocally);
  useEffect(() => {
    listeners.add(setLocal);
    return () => {
      listeners.delete(setLocal);
    };
  }, []);
  const avatar: AvatarID = isAvatarID(fromAccount) ? fromAccount : local;

  const setAvatar = useCallback(
    async (id: AvatarID) => {
      try {
        localStorage.setItem(AVATAR_STORAGE_KEY, id);
      } catch {
        // The choice still applies for this visit.
      }
      listeners.forEach((listen) => listen(id));
      if (!user) return;
      try {
        const client = await getAuthClient();
        await client.auth.updateUser({ data: { avatar: id } });
      } catch {
        // Kept on this device; the account copy updates on the next successful save.
      }
    },
    [user],
  );
  return { avatar, setAvatar };
}
