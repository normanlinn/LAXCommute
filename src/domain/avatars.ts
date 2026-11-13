// Avatar choices: an icon on one of Apple's system colors. Stored by id.
export const AVATARS = [
  { id: 'plane', label: 'Plane', color: '#FF9500' },
  { id: 'bus', label: 'Shuttle', color: '#34C759' },
  { id: 'palm', label: 'Palm tree', color: '#00C7BE' },
  { id: 'sun', label: 'Sun', color: '#FFCC00' },
  { id: 'moon', label: 'Moon', color: '#5856D6' },
  { id: 'coffee', label: 'Coffee', color: '#A2845E' },
  { id: 'suitcase', label: 'Suitcase', color: '#FF2D55' },
  { id: 'headphones', label: 'Headphones', color: '#AF52DE' },
  { id: 'ticket', label: 'Ticket', color: '#FF3B30' },
  { id: 'waves', label: 'Waves', color: '#32ADE6' },
  { id: 'mountains', label: 'Mountains', color: '#8E8E93' },
  { id: 'compass', label: 'Compass', color: '#007AFF' },
] as const;
export type AvatarID = (typeof AVATARS)[number]['id'];
export const DEFAULT_AVATAR: AvatarID = 'plane';
export const AVATAR_STORAGE_KEY = 'laxcommute:avatar';

export function isAvatarID(value: unknown): value is AvatarID {
  return AVATARS.some((a) => a.id === value);
}
export function avatarFor(id: unknown) {
  return AVATARS.find((a) => a.id === id) || AVATARS[0];
}
