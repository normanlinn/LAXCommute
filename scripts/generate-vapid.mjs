// Creates the VAPID key pair that lets the Worker send "bus is close" pushes.
// Run once, then store both values as Worker secrets (never commit them).
const { webcrypto } = await import('node:crypto');
const pair = await webcrypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
  'sign',
  'verify',
]);
const b64 = (bytes) => Buffer.from(bytes).toString('base64url');
const publicKey = b64(new Uint8Array(await webcrypto.subtle.exportKey('raw', pair.publicKey)));
const { d } = await webcrypto.subtle.exportKey('jwk', pair.privateKey);
console.log(`VAPID_PUBLIC_KEY=${publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${d}`);
console.log('\nStore them on the Worker (paste each value when asked):');
console.log('  npx wrangler secret put VAPID_PUBLIC_KEY');
console.log('  npx wrangler secret put VAPID_PRIVATE_KEY');
