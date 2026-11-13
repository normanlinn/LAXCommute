// Builds the 8 LAXCommute themes from their base colors, adjusting text shades until
// every text pairing meets WCAG AA (4.5:1). Writes the SCSS token map and the TS list.
//   node scripts/palettes.mjs
import { writeFileSync } from 'node:fs';

const BASE = [
  [
    'mono',
    'Electric mono',
    {
      bg: '#f4f4f4',
      card: '#ffffff',
      line: '#dcdcdc',
      fill: '#ebebeb',
      label: '#0a0a0a',
      secondary: '#636363',
      tint: '#2547ff',
      soft: '#e5e9ff',
      green: '#1f7a4d',
      orange: '#b35a00',
    },
    {
      bg: '#000000',
      card: '#121212',
      line: '#2c2c2c',
      fill: '#1e1e1e',
      label: '#fafafa',
      secondary: '#a3a3a3',
      tint: '#6b8cff',
      soft: '#1a2350',
      green: '#52d394',
      orange: '#ffb547',
    },
  ],
  [
    'cobalt',
    'Cobalt and sand',
    {
      bg: '#f6f2ea',
      card: '#fffdf8',
      line: '#e2d9c8',
      fill: '#ede6d8',
      label: '#141a2a',
      secondary: '#62677a',
      tint: '#1f4fd8',
      soft: '#e3e9fb',
      green: '#1f7a4d',
      orange: '#b35a00',
    },
    {
      bg: '#0b0f17',
      card: '#141a26',
      line: '#263046',
      fill: '#1d2534',
      label: '#f3f1ec',
      secondary: '#9aa2b6',
      tint: '#7aa2ff',
      soft: '#1c2a4d',
      green: '#52d394',
      orange: '#ffb547',
    },
  ],
  [
    'forest',
    'Forest canopy',
    {
      bg: '#f3f5ef',
      card: '#fdfefb',
      line: '#d9e0d2',
      fill: '#e6ebdf',
      label: '#122018',
      secondary: '#5c6b60',
      tint: '#1e6b45',
      soft: '#dff0e5',
      green: '#1e6b45',
      orange: '#a85600',
    },
    {
      bg: '#08100c',
      card: '#111c16',
      line: '#22332a',
      fill: '#1a2820',
      label: '#eef5ef',
      secondary: '#93a698',
      tint: '#5fd49a',
      soft: '#173a28',
      green: '#5fd49a',
      orange: '#ffb547',
    },
  ],
  [
    'berry',
    'Berry crush',
    {
      bg: '#fbf6f4',
      card: '#ffffff',
      line: '#ecdcd9',
      fill: '#f3e7e4',
      label: '#25141b',
      secondary: '#76616a',
      tint: '#b0255f',
      soft: '#fbe3ec',
      green: '#2a7d4f',
      orange: '#a85600',
    },
    {
      bg: '#120a0e',
      card: '#1e1218',
      line: '#3a2430',
      fill: '#2a1a22',
      label: '#fbf0f3',
      secondary: '#b59ca6',
      tint: '#ff6fa3',
      soft: '#401a2b',
      green: '#5fd39b',
      orange: '#ffb35c',
    },
  ],
  [
    'harbor',
    'Harbor teal',
    {
      bg: '#f0f5f6',
      card: '#ffffff',
      line: '#d3e0e3',
      fill: '#e1ebed',
      label: '#0d1e22',
      secondary: '#576b70',
      tint: '#0b7285',
      soft: '#dcf0f3',
      green: '#1f7a4d',
      orange: '#d9480f',
    },
    {
      bg: '#061014',
      card: '#0e1b20',
      line: '#1f3238',
      fill: '#172a30',
      label: '#ecf6f8',
      secondary: '#8ea7ad',
      tint: '#3bc9db',
      soft: '#103a43',
      green: '#52d394',
      orange: '#ff922b',
    },
  ],
  [
    'slate',
    'Slate and tangerine',
    {
      bg: '#f1f3f5',
      card: '#ffffff',
      line: '#d7dce1',
      fill: '#e5e8ec',
      label: '#14181d',
      secondary: '#5f6873',
      tint: '#c4410a',
      soft: '#fde7da',
      green: '#2a7d4f',
      orange: '#c4410a',
    },
    {
      bg: '#0d1013',
      card: '#171b20',
      line: '#2b3138',
      fill: '#21262c',
      label: '#f2f4f6',
      secondary: '#9aa3ad',
      tint: '#ff922b',
      soft: '#3d2410',
      green: '#52d394',
      orange: '#ff922b',
    },
  ],
  [
    'desert',
    'Desert night',
    {
      bg: '#f8f1ea',
      card: '#fffaf5',
      line: '#e9d8c8',
      fill: '#f0e3d5',
      label: '#2b1d14',
      secondary: '#7a6656',
      tint: '#9c4221',
      soft: '#f6e1d5',
      green: '#2a7d4f',
      orange: '#9c4221',
    },
    {
      bg: '#120d0a',
      card: '#1e1712',
      line: '#3a2c22',
      fill: '#2a2019',
      label: '#f8efe6',
      secondary: '#b5a291',
      tint: '#ff8a5b',
      soft: '#41241a',
      green: '#5fd39b',
      orange: '#ffb35c',
    },
  ],
  [
    'royal',
    'Royal navy and gold',
    {
      bg: '#f3f4f8',
      card: '#ffffff',
      line: '#d8dbe6',
      fill: '#e7e9f1',
      label: '#0f1630',
      secondary: '#5d6480',
      tint: '#1c3d8f',
      soft: '#e2e8f8',
      green: '#1f7a4d',
      orange: '#9a6a00',
    },
    {
      bg: '#080b18',
      card: '#111629',
      line: '#242c48',
      fill: '#1a2138',
      label: '#f1f2f8',
      secondary: '#979db8',
      tint: '#ffcc4d',
      soft: '#3a3013',
      green: '#52d394',
      orange: '#ffcc4d',
    },
  ],
];

const hex = (c) =>
  '#' +
  c
    .map((v) =>
      Math.round(Math.max(0, Math.min(255, v)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('');
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
function lum(h) {
  const [r, g, b] = rgb(h).map((v) => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
// Step a color toward black (light themes) or white (dark themes) until it passes.
function readable(color, surfaces, dark, min = 4.5) {
  let c = rgb(color);
  for (let i = 0; i < 40 && surfaces.some((s) => contrast(hex(c), s) < min); i++)
    c = c.map((v) => (dark ? v + (255 - v) * 0.08 : v * 0.92));
  return hex(c);
}
function build(base, dark) {
  const surfaces = [base.card, base.bg];
  const t = { ...base };
  t.secondary = readable(base.secondary, surfaces, dark);
  t.green = readable(base.green, surfaces, dark);
  t['tint-text'] = readable(base.tint, [...surfaces, base.soft], dark);
  // Filled buttons: white or near-black label, whichever reads; darken the fill if neither does.
  let fill = base.tint;
  const label = () =>
    contrast('#ffffff', fill) >= contrast('#0b0b0b', fill) ? '#ffffff' : '#0b0b0b';
  for (let i = 0; i < 40 && contrast(label(), fill) < 4.5; i++)
    fill = hex(rgb(fill).map((v) => v * 0.92));
  t['tint-fill'] = fill;
  t['on-tint'] = label();
  t.red = dark ? '#ff453a' : '#d70015';
  return t;
}
const themes = BASE.map(([id, name, light, dark]) => ({
  id,
  name,
  light: build(light, false),
  dark: build(dark, true),
}));

const ORDER = [
  'bg',
  'card',
  'fill',
  'line',
  'label',
  'secondary',
  'tint',
  'tint-fill',
  'tint-text',
  'on-tint',
  'soft',
  'green',
  'orange',
  'red',
];
// Keys are quoted so Sass never reads names like green or red as colors.
const map = (t) => ORDER.map((k) => `      '${k}': ${t[k]},`).join('\n');
writeFileSync(
  'src/styles/_palettes.scss',
  `// Generated by scripts/palettes.mjs. Edit the base colors there, not here.
// Every text pairing in each theme meets WCAG AA (4.5:1).
$palettes: (
${themes.map((t) => `  '${t.id}': (\n    'light': (\n${map(t.light)}\n    ),\n    'dark': (\n${map(t.dark)}\n    ),\n  ),`).join('\n')}
);
`,
);
writeFileSync(
  'src/theme/palettes.ts',
  `// Generated by scripts/palettes.mjs. Swatches and browser-bar colors for each theme.
export const PALETTES = ${JSON.stringify(
    themes.map((t) => ({
      id: t.id,
      name: t.name,
      light: { bg: t.light.bg, card: t.light.card, tint: t.light.tint },
      dark: { bg: t.dark.bg, card: t.dark.card, tint: t.dark.tint },
    })),
    null,
    2,
  )} as const;
export type PaletteID = (typeof PALETTES)[number]['id'];
export const DEFAULT_PALETTE: PaletteID = 'mono';
export const PALETTE_STORAGE_KEY = 'laxcommute:palette';
export function isPaletteID(value: unknown): value is PaletteID {
  return PALETTES.some((p) => p.id === value);
}
`,
);
for (const t of themes)
  console.log(
    t.id,
    'light tint-text',
    t.light['tint-text'],
    'fill',
    t.light['tint-fill'],
    t.light['on-tint'],
    '| dark tint-text',
    t.dark['tint-text'],
    'fill',
    t.dark['tint-fill'],
    t.dark['on-tint'],
  );
