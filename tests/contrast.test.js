import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The iOS color system lives in one token file; DaisyUI themes live in styles.css.
const tokens = readFileSync('src/styles/_ios-tokens.scss', 'utf8');
const daisy = readFileSync('src/styles.css', 'utf8');

function luminance(hex) {
  const channels = [1, 3, 5].map((start) => {
    const value = parseInt(hex.slice(start, start + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
function contrast(a, b) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
}
function palette(selector) {
  const start = tokens.indexOf(selector);
  const block = tokens.slice(start, tokens.indexOf('}', start));
  return Object.fromEntries(
    [...block.matchAll(/--ios-([\w-]+):\s*(#[\da-f]{6});/g)].map(([, name, value]) => [
      name,
      value,
    ]),
  );
}
function daisyTheme(name) {
  const start = daisy.indexOf(`name: '${name}';`);
  const block = daisy.slice(start, daisy.indexOf('\n}', start));
  return (token) => block.match(new RegExp(`${token}:\\s*(#[\\da-f]{6});`))[1];
}

describe.each([
  ['light', "[data-theme='lax']"],
  ['dark', "[data-theme='lax-dark']"],
])('iOS %s palette', (_mode, selector) => {
  const c = palette(selector);

  it('keeps body and secondary text readable on cards and the page (WCAG AA)', () => {
    for (const surface of [c.card, c.bg]) {
      expect(contrast(c.label, surface)).toBeGreaterThanOrEqual(7);
      expect(contrast(c.secondary, surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(c['tint-text'], surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(c.green, surface)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps white labels readable on filled buttons', () => {
    expect(contrast(c['on-tint'], c['tint-fill'])).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps the system-blue tint visible as a control color (3:1 for UI)', () => {
    expect(contrast(c.tint, c.card)).toBeGreaterThanOrEqual(3);
    expect(contrast(c['tint-fill'], c.card)).toBeGreaterThanOrEqual(3);
  });
});

it.each(['lax', 'lax-dark'])('keeps DaisyUI action colors readable in %s', (name) => {
  const get = daisyTheme(name);
  for (const role of ['primary', 'success', 'warning', 'error']) {
    expect(
      contrast(get(`--color-${role}`), get(`--color-${role}-content`)),
      role,
    ).toBeGreaterThanOrEqual(4.5);
  }
  expect(contrast(get('--color-base-content'), get('--color-base-100'))).toBeGreaterThanOrEqual(7);
});

it('routes every partial through the shared iOS tokens instead of one-off colors', () => {
  const partials = [
    ...readFileSync('src/styles/main.scss', 'utf8').matchAll(/@use '([^']+)'/g),
  ].map(([, name]) => readFileSync(`src/styles/_${name}.scss`, 'utf8'));
  const css = partials.join('\n');
  // The old Midnight Blue, teal and graphite surfaces must not come back.
  for (const legacy of ['#172233', '#0b111b', '#18bdc7', '#83bdff', '#111416', '#16212b']) {
    expect(css.toLowerCase()).not.toContain(legacy);
  }
  expect((css.match(/var\(--ios-/g) || []).length).toBeGreaterThan(250);
});
