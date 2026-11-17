import { useState } from 'react';
import type { Point } from '../types';

export type Fix = Point & { accuracy?: number; at?: number };

/**
 * One-shot device location for finding the nearest stop. Errors are rider-facing messages
 * (translated by the caller); the location stays on the device.
 */
export function useCurrentLocation() {
  const [location, setLocation] = useState<Fix | null>(null);
  const [error, setError] = useState('');
  const [locating, setLocating] = useState(false);

  function locate(onFix: (fix: Fix) => void) {
    setError('');
    if (!navigator.geolocation) {
      setError('This browser does not support location. Choose your boarding stop manually.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const fix = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy,
          at: Date.now(),
        };
        setLocation(fix);
        setLocating(false);
        onFix(fix);
      },
      (reason) => {
        setLocating(false);
        setError(
          reason.code === 1 // PERMISSION_DENIED
            ? 'Location access was declined. You can choose any boarding stop manually.'
            : 'Your location could not be found. Try again or choose a stop manually.',
        );
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  }

  return { location, error, setError, locating, locate };
}
