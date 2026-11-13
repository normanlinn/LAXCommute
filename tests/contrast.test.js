import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Theme colors are generated into _palettes.scss; DaisyUI base themes live in styles.css.
const palettesScss = readFileSync('src/styles/_palettes.scss', 'utf8');
const daisy = readFileSync('src/styles.css', 'utf8');
const { PALETTES } = await import('../src/theme/palettes.ts');

// Parse the generated SCSS map into { id: { light: {...}, dark: {...} } }.
const themes = {};
for (const [, id, body] of palettesScss.matchAll(/  '(\w+)': \(\n([\s\S]*?)\n  \),/g)) {
  themes[id] = {};
  for (const [, mode, tokens] of body.matchAll(/'(light|dark)': \(\n([\s\S]*?)\n    \)/g))
    themes[id][mode] = Object.fromEntries(
      [...tokens.matchAll(/'([\w-]+)': (#[\da-f]{6})/g)].map(([, k, v]) => [k, v]),
    );
}

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
function daisyTheme(name) {
  const start = daisy.indexOf(`name: '${name}';`);
  const block = daisy.slice(start, daisy.indexOf('\n}', start));
  return (token) => block.match(new RegExp(`${token}:\\s*(#[\\da-f]{6});`))[1];
}

const cases = Object.entries(themes).flatMap(([id, modes]) =>
  Object.entries(modes).map(([mode, colors]) => [id, mode, colors]),
);

it('defines all eight themes in light and dark', () => {
  expect(cases).toHaveLength(16);
});

describe.each(cases)('%s theme, %s mode', (_id, _mode, c) => {
  it('keeps body, secondary, link and status text readable (WCAG AA)', () => {
    for (const surface of [c.card, c.bg]) {
      expect(contrast(c.label, surface)).toBeGreaterThanOrEqual(7);
      expect(contrast(c.secondary, surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(c['tint-text'], surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(c.green, surface)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps labels readable on filled buttons', () => {
    expect(contrast(c['on-tint'], c['tint-fill'])).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps the accent visible as a control color (3:1 for UI)', () => {
    expect(contrast(c.tint, c.card)).toBeGreaterThanOrEqual(3);
  });
});

it('shows each theme picker swatch in its real colors', () => {
  expect(PALETTES.map((p) => p.id).sort()).toEqual(Object.keys(themes).sort());
  for (const p of PALETTES)
    for (const mode of ['light', 'dark']) {
      expect(p[mode].bg).toBe(themes[p.id][mode].bg);
      expect(p[mode].tint).toBe(themes[p.id][mode].tint);
    }
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
