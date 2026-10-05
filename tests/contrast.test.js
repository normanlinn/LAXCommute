import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/styles.css', 'utf8');
function luminance(hex) {
  const normalized = hex.length === 4 ? '#' + [...hex.slice(1)].map((c) => c + c).join('') : hex;
  const channels = [1, 3, 5].map((start) => {
    const value = parseInt(normalized.slice(start, start + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
function contrast(a, b) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
}
describe('dark text contrast', () => {
  it('keeps every dark ink color readable on the app’s dark surfaces', () => {
    const darkPalette = css.match(/\[data-theme='lax-dark'\] \{([\s\S]*?)\n}/)[1];
    const ink = [...darkPalette.matchAll(/--ink-[\da-f]+:\s*(#[\da-f]{6});/g)];
    const surfaces = [...darkPalette.matchAll(/--surface-[\da-f]+:\s*(#[\da-f]{6});/g)];
    expect(ink.length).toBeGreaterThan(30);
    expect(surfaces.length).toBeGreaterThan(20);
    for (const [declaration, foreground] of ink) {
      for (const [, background] of surfaces) {
        expect(
          contrast(foreground, background),
          `${declaration} on ${background}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
  it('pairs form and tooltip text with the dark theme’s actual surface colors', () => {
    const theme = css.match(/name: 'lax-dark';[\s\S]*?\n}/)[0];
    const get = (name) => theme.match(new RegExp(`${name}:\\s*(#[\\da-f]{6});`))[1];
    expect(contrast(get('--color-base-content'), get('--color-base-100'))).toBeGreaterThanOrEqual(
      4.5,
    );
    expect(contrast('#adc8cf', get('--color-base-100'))).toBeGreaterThanOrEqual(4.5);
  });
});

it.each(['lax', 'lax-dark'])('keeps turquoise button text readable in %s', (name) => {
  const start = css.indexOf(`name: '${name}';`);
  const theme = css.slice(start, css.indexOf('\n}', start));
  const get = (token) => theme.match(new RegExp(`${token}:\\s*(#[\\da-f]{6});`))[1];
  expect(contrast(get('--color-primary'), get('--color-primary-content'))).toBeGreaterThanOrEqual(
    4.5,
  );
});
