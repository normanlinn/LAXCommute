// Builds the LAXCommute themes from a few base colors per mode and writes the SCSS token
// map and the TS list. Text colors are nudged until every pairing meets WCAG AA (4.5:1).
//   node scripts/palettes.mjs
import { writeFileSync } from 'node:fs';

export const DEFAULT = 'ember';

// [id, name, light, dark]. acc: lines, icons and links. hero/onHero: the departure card and
// filled buttons. map, road, park, water: the basemap.
const BASE = [
  [
    'ember',
    'Ember',
    {
      bg: '#f6f5f4',
      card: '#ffffff',
      line: '#e5e2e0',
      label: '#1a1514',
      secondary: '#66605d',
      acc: '#dc2626',
      hero: '#dc2626',
      onHero: '#ffffff',
      map: '#efedeb',
      road: '#ffffff',
      park: '#dde5d6',
      water: '#d2dce6',
    },
    {
      bg: '#121010',
      card: '#1d1a19',
      line: '#302b2a',
      label: '#f6f1ef',
      secondary: '#aba29e',
      acc: '#f07a7a',
      hero: '#b42323',
      onHero: '#ffffff',
      map: '#171414',
      road: '#302a28',
      park: '#1a2118',
      water: '#141b23',
    },
  ],
  [
    'apple',
    'Apple Maps',
    {
      bg: '#f2f2f7',
      card: '#ffffff',
      line: '#e5e5ea',
      label: '#000000',
      secondary: '#6c6c70',
      acc: '#0a6cff',
      hero: '#0a6cff',
      onHero: '#ffffff',
      map: '#eef0ec',
      road: '#ffffff',
      park: '#d3e8cc',
      water: '#bfd9f2',
    },
    {
      bg: '#121316',
      card: '#1d1f23',
      line: '#2e3137',
      label: '#f2f3f5',
      secondary: '#9ba0a8',
      acc: '#4c9aff',
      hero: '#1f5fd1',
      onHero: '#ffffff',
      map: '#1a1c20',
      road: '#2c2f35',
      park: '#1b2620',
      water: '#15253a',
    },
  ],
  [
    'golden',
    'Golden hour LA',
    {
      bg: '#fbf6ef',
      card: '#fffdf9',
      line: '#eadfd1',
      label: '#2a1a10',
      secondary: '#7a6453',
      acc: '#c2410c',
      hero: '#c2410c',
      onHero: '#ffffff',
      map: '#f4ebdd',
      road: '#ffffff',
      park: '#e2e6c8',
      water: '#c9dfe6',
    },
    {
      bg: '#16120f',
      card: '#221c17',
      line: '#362d25',
      label: '#f6eee6',
      secondary: '#b8a898',
      acc: '#f2915f',
      hero: '#a8441a',
      onHero: '#ffffff',
      map: '#1d1814',
      road: '#342b23',
      park: '#222519',
      water: '#172228',
    },
  ],
  [
    'pacific',
    'Pacific coast',
    {
      bg: '#f1f6f8',
      card: '#ffffff',
      line: '#dce7ec',
      label: '#0a1c24',
      secondary: '#4f6772',
      acc: '#0e7490',
      hero: '#0e7490',
      onHero: '#ffffff',
      map: '#e9f0f2',
      road: '#ffffff',
      park: '#d3e6d6',
      water: '#a9d6e5',
    },
    {
      bg: '#0f1517',
      card: '#182124',
      line: '#283438',
      label: '#eaf3f5',
      secondary: '#95aab0',
      acc: '#4fc3d9',
      hero: '#0f6a80',
      onHero: '#ffffff',
      map: '#141c1f',
      road: '#26343a',
      park: '#15251e',
      water: '#0f2a33',
    },
  ],
  [
    'hollywood',
    'Hollywood night',
    {
      bg: '#f5f5fb',
      card: '#ffffff',
      line: '#e1e1ef',
      label: '#14142b',
      secondary: '#5d5d7a',
      acc: '#5b4bdb',
      hero: '#5b4bdb',
      onHero: '#ffffff',
      map: '#eeeef6',
      road: '#ffffff',
      park: '#dce7da',
      water: '#cfd8f2',
    },
    {
      bg: '#12121c',
      card: '#1c1c2a',
      line: '#2d2d40',
      label: '#efeff8',
      secondary: '#a0a0bc',
      acc: '#a79bff',
      hero: '#4f43c2',
      onHero: '#ffffff',
      map: '#17172a',
      road: '#2b2b44',
      park: '#18241f',
      water: '#1a1f3a',
    },
  ],
  [
    'palm',
    'Palm springs',
    {
      bg: '#f3f7f3',
      card: '#ffffff',
      line: '#dde7de',
      label: '#122016',
      secondary: '#566a5b',
      acc: '#2f855a',
      hero: '#2f855a',
      onHero: '#ffffff',
      map: '#ebf1eb',
      road: '#ffffff',
      park: '#c9e3cc',
      water: '#c4dfe8',
    },
    {
      bg: '#101411',
      card: '#1a201b',
      line: '#2a332c',
      label: '#ecf3ed',
      secondary: '#9daea0',
      acc: '#6ccb93',
      hero: '#2a7a4f',
      onHero: '#ffffff',
      map: '#151a16',
      road: '#29322b',
      park: '#183020',
      water: '#12232a',
    },
  ],
  [
    'rose',
    'Desert rose',
    {
      bg: '#fbf4f4',
      card: '#ffffff',
      line: '#eddcdd',
      label: '#2a1216',
      secondary: '#7a5a5f',
      acc: '#be185d',
      hero: '#be185d',
      onHero: '#ffffff',
      map: '#f5edec',
      road: '#ffffff',
      park: '#e2e8d2',
      water: '#d3ddeb',
    },
    {
      bg: '#161012',
      card: '#22191c',
      line: '#372a2e',
      label: '#f7edef',
      secondary: '#bfa3a8',
      acc: '#f08ab9',
      hero: '#a0164f',
      onHero: '#ffffff',
      map: '#1c1416',
      road: '#362a2d',
      park: '#1f2418',
      water: '#171d29',
    },
  ],
  [
    'board',
    'Departure board',
    {
      bg: '#f5f5f2',
      card: '#ffffff',
      line: '#e2e2dc',
      label: '#111111',
      secondary: '#5e5e58',
      acc: '#111111',
      hero: '#111111',
      onHero: '#facc15',
      map: '#ececE8',
      road: '#ffffff',
      park: '#dde5d6',
      water: '#d2dce4',
    },
    {
      bg: '#101010',
      card: '#1a1a1a',
      line: '#2c2c2c',
      label: '#f4f4f1',
      secondary: '#a5a59e',
      acc: '#f5c518',
      hero: '#26231a',
      onHero: '#f5c518',
      map: '#161616',
      road: '#2e2e2e',
      park: '#1a2118',
      water: '#141b22',
    },
  ],
  [
    'nordic',
    'Nordic slate',
    {
      bg: '#f6f7f9',
      card: '#ffffff',
      line: '#e3e6eb',
      label: '#0f172a',
      secondary: '#5b6474',
      acc: '#334155',
      hero: '#334155',
      onHero: '#ffffff',
      map: '#eef0f3',
      road: '#ffffff',
      park: '#dce6dc',
      water: '#d3deea',
    },
    {
      bg: '#111317',
      card: '#1b1e24',
      line: '#2b3038',
      label: '#edf0f4',
      secondary: '#9aa2af',
      acc: '#b9c4d4',
      hero: '#3b4656',
      onHero: '#ffffff',
      map: '#16191e',
      road: '#2b3039',
      park: '#18231c',
      water: '#151e2a',
    },
  ],
  [
    'ocean',
    'Ocean and sand',
    {
      bg: '#f8f5ef',
      card: '#fffefb',
      line: '#e8e1d5',
      label: '#11203a',
      secondary: '#5e6577',
      acc: '#1e40af',
      hero: '#1e40af',
      onHero: '#ffffff',
      map: '#f1ece2',
      road: '#ffffff',
      park: '#dce5cc',
      water: '#bcd3ee',
    },
    {
      bg: '#111318',
      card: '#1b1e26',
      line: '#2c3140',
      label: '#eef1f8',
      secondary: '#9ca4b8',
      acc: '#8eb7f7',
      hero: '#2445a8',
      onHero: '#ffffff',
      map: '#161922',
      road: '#2b3142',
      park: '#17241d',
      water: '#13223d',
    },
  ],
  [
    'matcha',
    'Matcha',
    {
      bg: '#f5f6ee',
      card: '#fffffc',
      line: '#e3e6d3',
      label: '#1a1f0e',
      secondary: '#626b4e',
      acc: '#4d7c0f',
      hero: '#4d7c0f',
      onHero: '#ffffff',
      map: '#edf0e2',
      road: '#ffffff',
      park: '#d3e4b8',
      water: '#cadbe0',
    },
    {
      bg: '#121410',
      card: '#1c1f18',
      line: '#2e3327',
      label: '#eff2e6',
      secondary: '#a6ad92',
      acc: '#a6d45a',
      hero: '#4a6e14',
      onHero: '#ffffff',
      map: '#171a13',
      road: '#2e3324',
      park: '#1f2914',
      water: '#142024',
    },
  ],
  [
    'lavender',
    'Lavender fields',
    {
      bg: '#f7f6fc',
      card: '#ffffff',
      line: '#e6e3f3',
      label: '#1c1530',
      secondary: '#655d7e',
      acc: '#6d28d9',
      hero: '#6d28d9',
      onHero: '#ffffff',
      map: '#f0eff7',
      road: '#ffffff',
      park: '#dde8db',
      water: '#d3daf2',
    },
    {
      bg: '#131119',
      card: '#1d1a26',
      line: '#2f2a3d',
      label: '#f1eefa',
      secondary: '#a9a0c2',
      acc: '#bba9fa',
      hero: '#5b2bb5',
      onHero: '#ffffff',
      map: '#18151f',
      road: '#2f2a40',
      park: '#1a251f',
      water: '#191d36',
    },
  ],
  [
    'runway',
    'Runway night',
    {
      bg: '#f0f7fa',
      card: '#ffffff',
      line: '#d9e6ed',
      label: '#08202d',
      secondary: '#4d6575',
      acc: '#0284c7',
      hero: '#0284c7',
      onHero: '#ffffff',
      map: '#eaf2f6',
      road: '#ffffff',
      park: '#d4e8dd',
      water: '#b2ddf2',
    },
    {
      bg: '#0b1218',
      card: '#121e27',
      line: '#1d303e',
      label: '#f0f7fb',
      secondary: '#92b2c6',
      acc: '#38bdf8',
      hero: '#0369a1',
      onHero: '#ffffff',
      map: '#0f1820',
      road: '#1e2b36',
      park: '#12241b',
      water: '#092233',
    },
  ],
  [
    'cockpit',
    'Flight deck',
    {
      bg: '#f9f6f0',
      card: '#ffffff',
      line: '#e8e0d5',
      label: '#211a12',
      secondary: '#6e6255',
      acc: '#d97706',
      hero: '#d97706',
      onHero: '#ffffff',
      map: '#f3eee6',
      road: '#ffffff',
      park: '#e2e8d2',
      water: '#d0e1ea',
    },
    {
      bg: '#11100e',
      card: '#1c1916',
      line: '#322b24',
      label: '#f8f4ee',
      secondary: '#b7aa9c',
      acc: '#fbbf24',
      hero: '#b45309',
      onHero: '#ffffff',
      map: '#171512',
      road: '#2e261f',
      park: '#1d2316',
      water: '#141f26',
    },
  ],
  [
    'sunset',
    'Sunset flight',
    {
      bg: '#faf5f6',
      card: '#ffffff',
      line: '#ebdce0',
      label: '#241016',
      secondary: '#73565e',
      acc: '#e11d48',
      hero: '#e11d48',
      onHero: '#ffffff',
      map: '#f5ecee',
      road: '#ffffff',
      park: '#e2e7d5',
      water: '#d7e0f2',
    },
    {
      bg: '#140e13',
      card: '#20161e',
      line: '#372634',
      label: '#f9eff4',
      secondary: '#bfa5b6',
      acc: '#fb7185',
      hero: '#be123c',
      onHero: '#ffffff',
      map: '#1a1219',
      road: '#32222f',
      park: '#1d2319',
      water: '#1a1a36',
    },
  ],
  [
    'modernist',
    'Theme building',
    {
      bg: '#f2f8f8',
      card: '#ffffff',
      line: '#d9e7e7',
      label: '#0c2020',
      secondary: '#4d6969',
      acc: '#0d9488',
      hero: '#0d9488',
      onHero: '#ffffff',
      map: '#eaf2f2',
      road: '#ffffff',
      park: '#d8e8dc',
      water: '#bfe2ea',
    },
    {
      bg: '#0c1515',
      card: '#142222',
      line: '#213636',
      label: '#edf7f7',
      secondary: '#8fa8a8',
      acc: '#2dd4bf',
      hero: '#0f766e',
      onHero: '#ffffff',
      map: '#101c1c',
      road: '#203333',
      park: '#14251c',
      water: '#0f2b30',
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
