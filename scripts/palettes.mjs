// Builds the LAXCommute themes from a few base colors per mode and writes the SCSS token
// map and the TS list. Text colors are nudged until every pairing meets WCAG AA (4.5:1).
//   node scripts/palettes.mjs
import { writeFileSync } from 'node:fs';

export const DEFAULT = 'lax';

// [id, name, light, dark]. acc: lines, icons and links. hero/onHero: the departure card and
// filled buttons. map, road, park, water: the basemap.
const BASE = [
  // The default, from the ios branch: Pacific teal on LAX night-sky navy. The departure card
  // is deep teal with white text; bright aqua is kept for icons and links in dark mode.
  [
    'lax',
    'LAX Pacific',
    {
      bg: '#f4f9fa',
      card: '#ffffff',
      line: '#d5e5e9',
      label: '#0d2236',
      secondary: '#4d6774',
      acc: '#00838f',
      hero: '#007c87',
      onHero: '#ffffff',
      map: '#edf4f5',
      road: '#ffffff',
      park: '#d9ecd8',
      water: '#c8e4ec',
    },
    {
      bg: '#071722',
      card: '#0f2532',
      line: '#23404d',
      label: '#eefafc',
      secondary: '#a5c2ca',
      acc: '#4fd8e0',
      hero: '#0a8d98',
      onHero: '#ffffff',
      map: '#0b1e28',
      road: '#1c3744',
      park: '#0f281f',
      water: '#0a2532',
    },
  ],
  [
    'sunset',
    'LAX Sunset Pylons',
    {
      bg: '#fbf7f4',
      card: '#ffffff',
      line: '#e8ded8',
      label: '#1f130d',
      secondary: '#735b50',
      acc: '#d9531e',
      hero: '#d9531e',
      onHero: '#ffffff',
      map: '#f4ede7',
      road: '#ffffff',
      park: '#deebd8',
      water: '#badbf2',
    },
    {
      bg: '#120a07',
      card: '#1c120c',
      line: '#2e1e16',
      label: '#faf3ef',
      secondary: '#a89489',
      acc: '#f97316',
      hero: '#c2410c',
      onHero: '#ffffff',
      map: '#170e0a',
      road: '#291b14',
      park: '#1e281b',
      water: '#0c2033',
    },
  ],
  // Black and marquee gold.
  [
    'hollywood',
    'Hollywood Night',
    {
      bg: '#f7f5f0',
      card: '#ffffff',
      line: '#e6e0d2',
      label: '#16130c',
      secondary: '#6b6455',
      acc: '#8a6512',
      hero: '#16130c',
      onHero: '#f4c95d',
      map: '#f1eee6',
      road: '#ffffff',
      park: '#e1e6d3',
      water: '#d3dde6',
    },
    {
      bg: '#0b0a07',
      card: '#1a1710',
      line: '#2e281b',
      label: '#f7f1e1',
      secondary: '#b3a98f',
      acc: '#f4c95d',
      hero: '#2a2416',
      onHero: '#f4c95d',
      map: '#12100b',
      road: '#2a251a',
      park: '#1a1f14',
      water: '#121a22',
    },
  ],
  // Sand, ocean blue and coral.
  [
    'venice',
    'Venice Beach',
    {
      bg: '#fbf8f2',
      card: '#ffffff',
      line: '#e8e1d3',
      label: '#1b2a3a',
      secondary: '#5d6b78',
      acc: '#1e5ea8',
      hero: '#1e5ea8',
      onHero: '#ffffff',
      map: '#f4efe4',
      road: '#ffffff',
      park: '#dfe8d2',
      water: '#bcd7f0',
    },
    {
      bg: '#0b1522',
      card: '#132235',
      line: '#24364d',
      label: '#eef4fb',
      secondary: '#a4b3c4',
      acc: '#6aa8f0',
      hero: '#2b6fbf',
      onHero: '#ffffff',
      map: '#0e1a28',
      road: '#1f3047',
      park: '#13261e',
      water: '#0c2238',
    },
  ],
  // LA's purple spring jacarandas.
  [
    'jacaranda',
    'Jacaranda',
    {
      bg: '#f8f6fc',
      card: '#ffffff',
      line: '#e4ddf2',
      label: '#211a33',
      secondary: '#625a75',
      acc: '#5b3fa3',
      hero: '#6a4bb8',
      onHero: '#ffffff',
      map: '#f1eef6',
      road: '#ffffff',
      park: '#dceadb',
      water: '#d0dcf0',
    },
    {
      bg: '#110d1c',
      card: '#1c1630',
      line: '#2e2548',
      label: '#f3effc',
      secondary: '#b0a6c9',
      acc: '#b9a2f2',
      hero: '#5a3fa3',
      onHero: '#ffffff',
      map: '#141022',
      road: '#2a2340',
      park: '#16241c',
      water: '#121a33',
    },
  ],
  // Night sky over the observatory, with star gold.
  [
    'griffith',
    'Griffith Observatory',
    {
      bg: '#f3f4f8',
      card: '#ffffff',
      line: '#dde0ec',
      label: '#151a2e',
      secondary: '#5b6177',
      acc: '#2f3f8f',
      hero: '#1d2650',
      onHero: '#e8ecff',
      map: '#eef0f5',
      road: '#ffffff',
      park: '#dbe6d8',
      water: '#cad7ec',
    },
    {
      bg: '#080b18',
      card: '#11162b',
      line: '#222a45',
      label: '#eef0fb',
      secondary: '#a3aac6',
      acc: '#ffd27a',
      hero: '#2b3a8c',
      onHero: '#ffffff',
      map: '#0b0f1f',
      road: '#1d2440',
      park: '#121f1b',
      water: '#0c1530',
    },
  ],
];

const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex = (c) =>
  '#' +
  c
    .map((v) =>
      Math.round(Math.max(0, Math.min(255, v)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('');
const mix = (a, b, share) => hex(rgb(a).map((v, i) => v + (rgb(b)[i] - v) * share));
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
// Step a color toward black (light themes) or white (dark themes) until it reads on every surface.
function readable(color, surfaces, dark) {
  let c = color;
  for (let i = 0; i < 40 && surfaces.some((s) => contrast(c, s) < 4.5); i++)
    c = mix(c, dark ? '#ffffff' : '#000000', 0.08);
  return c;
}

function build(b, dark) {
  const fill = mix(b.card, b.label, dark ? 0.07 : 0.05);
  const soft = mix(b.card, b.acc, dark ? 0.2 : 0.1);
  const surfaces = [b.card, b.bg, fill];
  let hero = b.hero;
  for (let i = 0; i < 40 && contrast(b.onHero, hero) < 4.5; i++) hero = mix(hero, '#000000', 0.08);
  return {
    bg: b.bg,
    card: b.card,
    fill,
    line: b.line,
    label: b.label,
    secondary: readable(b.secondary, surfaces, dark),
    tint: b.acc,
    'tint-fill': hero,
    'tint-text': readable(b.acc, [...surfaces, soft], dark),
    'on-tint': b.onHero,
    soft,
    green: readable(dark ? '#4ade80' : '#1e7b3c', surfaces, dark),
    orange: readable(dark ? '#ffb547' : '#a55400', surfaces, dark),
    red: dark ? '#ff6b61' : '#c8102e',
    'map-land': b.map,
    'map-road': b.road,
    'map-casing': mix(b.map, b.label, 0.08),
    'map-park': b.park,
    'map-water': b.water,
    'map-building': mix(b.map, b.label, 0.05),
  };
}

const themes = BASE.map(([id, name, light, dark]) => ({
  id,
  name,
  light: build(light, false),
  dark: build(dark, true),
}));

// Keys are quoted so Sass never reads names like green or red as colors.
const scss = (t) =>
  Object.entries(t)
    .map(([k, v]) => `      '${k}': ${v.toLowerCase()},`)
    .join('\n');
writeFileSync(
  'src/styles/_palettes.scss',
  `// Generated by scripts/palettes.mjs. Edit the base colors there, not here.
// Every text pairing in each theme meets WCAG AA (4.5:1).
$palettes: (
${themes.map((t) => `  '${t.id}': (\n    'light': (\n${scss(t.light)}\n    ),\n    'dark': (\n${scss(t.dark)}\n    ),\n  ),`).join('\n')}
);
`,
);
const swatch = (t) => ({ bg: t.bg, card: t.card, tint: t.tint, hero: t['tint-fill'] });
writeFileSync(
  'src/theme/palettes.ts',
  `// Generated by scripts/palettes.mjs. Swatches and browser-bar colors for each theme.
export const PALETTES = ${JSON.stringify(
    themes.map((t) => ({ id: t.id, name: t.name, light: swatch(t.light), dark: swatch(t.dark) })),
    null,
    2,
  )} as const;
export type PaletteID = (typeof PALETTES)[number]['id'];
export const DEFAULT_PALETTE: PaletteID = '${DEFAULT}';
export const PALETTE_STORAGE_KEY = 'laxcommute:palette';
export function isPaletteID(value: unknown): value is PaletteID {
  return PALETTES.some((p) => p.id === value);
}
`,
);
console.log(themes.map((t) => t.id).join(', '));
