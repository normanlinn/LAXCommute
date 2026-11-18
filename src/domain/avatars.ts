// Avatar choices: the LA collection. Each icon sits on one of three shades of the active
// theme (fill, light, deep), so avatars change with the theme and light or dark mode.
// Stored by id.
export const AVATARS = [
  { id: 'plane', label: 'Plane', tone: 'fill' },
  { id: 'palm', label: 'Palm tree', tone: 'light' },
  { id: 'sunset', label: 'Sunset', tone: 'deep' },
  { id: 'star', label: 'Star', tone: 'fill' },
  { id: 'waves', label: 'Waves', tone: 'light' },
  { id: 'film', label: 'Film', tone: 'deep' },
  { id: 'car', label: 'Car', tone: 'fill' },
  { id: 'bus', label: 'Shuttle', tone: 'light' },
  { id: 'skyline', label: 'Skyline', tone: 'deep' },
  { id: 'music', label: 'Music', tone: 'fill' },
  { id: 'coffee', label: 'Coffee', tone: 'light' },
  { id: 'mountains', label: 'Mountains', tone: 'deep' },
] as const;
export type AvatarID = (typeof AVATARS)[number]['id'];
export const DEFAULT_AVATAR: AvatarID = 'plane';
export const AVATAR_STORAGE_KEY = 'laxcommute:avatar';

// Avatars saved before the LA collection map to their closest new icon.
const RENAMED: Record<string, AvatarID> = {
  sun: 'sunset',
  moon: 'star',
  suitcase: 'skyline',
  headphones: 'music',
  ticket: 'film',
  compass: 'car',
};

export function isAvatarID(value: unknown): value is AvatarID {
  return AVATARS.some((a) => a.id === value);
}
/** A saved value as a current avatar id, or null if it is not one. */
export function toAvatarID(value: unknown): AvatarID | null {
  if (isAvatarID(value)) return value;
  return typeof value === 'string' && Object.hasOwn(RENAMED, value) ? RENAMED[value] : null;
}
export function avatarFor(id: unknown) {
  return AVATARS.find((a) => a.id === toAvatarID(id)) || AVATARS[0];
}
