import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'laxcommute:sample-buses';
// Every mounted user of the hook follows the latest choice.
const listeners = new Set<(on: boolean) => void>();

function initial() {
  try {
    // ?sample=1 turns it on for a shared demo link; ?sample=0 turns it off.
    const fromURL = new URLSearchParams(location.search).get('sample');
    if (fromURL === '1' || fromURL === '0') localStorage.setItem(STORAGE_KEY, fromURL);
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/** Opt-in sample buses for seeing how the app works. Off unless the rider turns it on. */
export function useSampleMode() {
  const [sample, setLocal] = useState(initial);
  useEffect(() => {
    listeners.add(setLocal);
    return () => {
      listeners.delete(setLocal);
    };
  }, []);
  const setSample = useCallback((on: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, on ? '1' : '0');
    } catch {
      // Applies for this visit only.
    }
    listeners.forEach((listen) => listen(on));
  }, []);
  return { sample, setSample };
}
