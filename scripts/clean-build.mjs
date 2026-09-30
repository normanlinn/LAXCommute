import { rm } from 'node:fs/promises';
// Clear only this project's generated build output, so old chunks aren't precached.
await rm(new URL('../dist/', import.meta.url), { recursive: true, force: true });
