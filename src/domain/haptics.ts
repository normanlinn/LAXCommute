/**
 * Short, optional vibration feedback. Android browsers support it; iOS Safari
 * ignores navigator.vibrate, so taps there simply stay silent.
 */
const PATTERNS = {
  tap: 8,
  select: [6, 30, 6],
  alert: [180, 90, 180, 90, 260],
} satisfies Record<string, number | number[]>;

export type HapticKind = keyof typeof PATTERNS;

export function haptic(kind: HapticKind = 'tap') {
  try {
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return false;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches && kind !== 'alert') {
      return false;
    }
    return navigator.vibrate(PATTERNS[kind]);
  } catch {
    return false;
  }
}
