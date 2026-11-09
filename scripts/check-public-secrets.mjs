import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export function hasPrivateCredential(text) {
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text)) return true;
  if (/\bsb_secret_[A-Za-z0-9_-]{16,}\b/.test(text)) return true;
  if (/\b(?:ghp_|github_pat_)[A-Za-z0-9_]{20,}\b/.test(text)) return true;
  for (const token of text.matchAll(/eyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g)) {
    try {
      if (JSON.parse(Buffer.from(token[1], 'base64url').toString()).role === 'service_role')
        return true;
    } catch {
      /* Ignore non-JWT text. */
    }
  }
  return false;
}
async function scan(directory) {
  for (const file of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, file.name);
    if (file.isDirectory()) await scan(path);
    else if (
      /\.(?:js|json|html|css|map|txt)$/.test(file.name) &&
      hasPrivateCredential(await readFile(path, 'utf8'))
    ) {
      // Report the filename only: never echo a detected credential into build logs.
      throw new Error(`Private credential detected in public build: ${path}`);
    }
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await scan('dist/client');
  console.log('Public build credential check passed.');
}
