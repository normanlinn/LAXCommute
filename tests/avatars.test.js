import { describe, expect, it } from 'vitest';
import { AVATARS, DEFAULT_AVATAR, avatarFor, isAvatarID, toAvatarID } from '../src/domain/avatars';

describe('avatars', () => {
  it('offers the twelve-icon LA collection in three theme shades', () => {
    expect(AVATARS).toHaveLength(12);
    expect(new Set(AVATARS.map((a) => a.id)).size).toBe(12);
    expect(new Set(AVATARS.map((a) => a.tone))).toEqual(new Set(['fill', 'light', 'deep']));
  });

  it('accepts only known ids and falls back to the default', () => {
    expect(isAvatarID('sunset')).toBe(true);
    expect(isAvatarID('<script>')).toBe(false);
    expect(isAvatarID(undefined)).toBe(false);
    expect(avatarFor('nope').id).toBe(DEFAULT_AVATAR);
    expect(avatarFor('film').label).toBe('Film');
  });

  it('keeps avatars saved before the LA collection', () => {
    expect(toAvatarID('moon')).toBe('star');
    expect(toAvatarID('compass')).toBe('car');
    expect(toAvatarID('palm')).toBe('palm');
    expect(toAvatarID('toString')).toBeNull();
    expect(avatarFor('ticket').id).toBe('film');
  });
});
