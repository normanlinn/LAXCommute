import { describe, expect, it } from 'vitest';
import { AVATARS, DEFAULT_AVATAR, avatarFor, isAvatarID } from '../src/domain/avatars';

describe('avatars', () => {
  it('offers twelve distinct avatars, each with its own color', () => {
    expect(AVATARS).toHaveLength(12);
    expect(new Set(AVATARS.map((a) => a.id)).size).toBe(12);
    expect(new Set(AVATARS.map((a) => a.color)).size).toBe(12);
  });

  it('accepts only known ids and falls back to the default', () => {
    expect(isAvatarID('moon')).toBe(true);
    expect(isAvatarID('<script>')).toBe(false);
    expect(isAvatarID(undefined)).toBe(false);
    expect(avatarFor('nope').id).toBe(DEFAULT_AVATAR);
    expect(avatarFor('moon').label).toBe('Moon');
  });
});
