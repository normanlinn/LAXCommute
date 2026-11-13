// A rider's chosen nickname, used only to greet them in the app.
export const NICKNAME_MAX = 24;
export const NICKNAME_STORAGE_KEY = 'laxcommute:nickname';

/** Trims, collapses spaces, drops control characters and caps the length. */
export function cleanNickname(value: unknown): string {
  if (typeof value !== 'string') return '';
  const text = value
    // Control characters, zero-width marks and text-direction overrides.
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return [...text].slice(0, NICKNAME_MAX).join('').trim();
}

export type DayPart = 'morning' | 'afternoon' | 'evening';
/** Morning until noon, afternoon until 5 PM, evening after (shift workers included). */
export function dayPart(hour: number): DayPart {
  if (hour >= 4 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  return 'evening';
}
