/** Materialize versioned share-card and PWA icons before Vite scans publicDir.
 * PNGs are stored as base64 text in Git because the deployment connection
 * cannot upload binary blobs directly. Generated assets are static at runtime.
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets = JSON.parse(readFileSync(join(projectRoot, 'scripts/brand-v5-assets.json'), 'utf8'));
const permitted = new Set([
  'public/social-preview-v5.png',
  'public/icons/commute-v5-512.png',
  'public/icons/commute-v5-192.png',
  'public/icons/apple-touch-v5.png',
  'public/icons/favicon-v5.png',
  'public/icons/maskable-v5-512.png',
]);

for (const [publicPath, encoded] of Object.entries(assets)) {
  if (!permitted.has(publicPath)) throw new Error('Unexpected LAXCommute brand file: ' + publicPath);
  const output = join(projectRoot, publicPath);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, Buffer.from(encoded, 'base64'));
}
