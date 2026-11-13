import { useEffect, useRef } from 'react';
import { useAccount } from './useAccount';
import { THEME_CHOICE_ENABLED, useTheme } from '../theme/ThemeProvider';
import { isPaletteID } from '../theme/palettes';
import { getAuthClient } from '../services/auth';

/**
 * Keeps a signed-in rider's theme on their account: adopt it when they sign in,
 * then save later changes back. Guests keep the theme on this device only.
 */
export function usePaletteSync() {
  const { user } = useAccount();
  const { palette, setPalette } = useTheme();
  const adoptedFor = useRef<string | null>(null);
  const saved = user?.user_metadata?.palette;

  useEffect(() => {
    if (!THEME_CHOICE_ENABLED) return;
    if (!user) {
      adoptedFor.current = null;
      return;
    }
    if (adoptedFor.current !== user.id) {
      // First run for this account: take its theme instead of overwriting it.
      adoptedFor.current = user.id;
      if (isPaletteID(saved) && saved !== palette) setPalette(saved);
      return;
    }
    if (saved === palette) return;
    getAuthClient()
      .then((client) => client.auth.updateUser({ data: { palette } }))
      .catch(() => undefined);
    // Re-run when the account or the chosen palette changes.
  }, [user?.id, palette]);
}
