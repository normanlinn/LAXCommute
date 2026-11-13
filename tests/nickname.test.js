import { describe, expect, it } from 'vitest';
import { NICKNAME_MAX, cleanNickname, dayPart } from '../src/domain/nickname';

describe('nickname', () => {
  it('keeps a normal name and tidies spaces', () => {
    expect(cleanNickname('  Norman  ')).toBe('Norman');
    expect(cleanNickname('Zaw   Lin')).toBe('Zaw Lin');
    expect(cleanNickname('ဇော်')).toBe('ဇော်');
  });

  it('drops control and direction-override characters', () => {
    expect(cleanNickname('No\u0000r‮man​')).toBe('Norman');
    expect(cleanNickname(42)).toBe('');
  });

  it('caps the length', () => {
    expect([...cleanNickname('x'.repeat(60))]).toHaveLength(NICKNAME_MAX);
  });

  it('greets by time of day, with night shifts as evening', () => {
    expect(dayPart(7)).toBe('morning');
    expect(dayPart(13)).toBe('afternoon');
    expect(dayPart(20)).toBe('evening');
    expect(dayPart(2)).toBe('evening');
  });
});
