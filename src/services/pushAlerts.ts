// Server-side "bus is close" alerts via Web Push, so they arrive with the app closed.
// Every step is optional: on any failure the in-app timer in useBusAlert still runs.

let keyRequest: Promise<string | null> | null = null;
function publicKey() {
  keyRequest ??= fetch('/api/alerts/key', { headers: { Accept: 'application/json' } })
    .then((r) => (r.ok ? r.json() : null))
    .then((body) => (typeof body?.publicKey === 'string' ? body.publicKey : null))
    .catch(() => {
      keyRequest = null;
      return null;
    });
  return keyRequest;
}
function keyBytes(value: string) {
  const padded = value
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

export function pushSupported() {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof window !== 'undefined' &&
    'PushManager' in window &&
    typeof Notification !== 'undefined'
  );
}

/** Registers a server alert and returns its id, or null when push is unavailable. */
export async function startPushAlert(alert: {
  routeID: number;
  stopID: number;
  vehicleID: number;
  title: string;
  body: string;
}) {
  if (!pushSupported() || Notification.permission !== 'granted') return null;
  try {
    const key = await publicKey();
    const registration = await navigator.serviceWorker.getRegistration();
    if (!key || !registration?.pushManager) return null;
    const subscription =
      (await registration.pushManager.getSubscription()) ||
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes(key),
      }));
    const response = await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ subscription: subscription.toJSON(), ...alert }),
    });
    if (!response.ok) return null;
    const { id } = await response.json();
    return typeof id === 'string' ? id : null;
  } catch {
    return null;
  }
}

export function cancelPushAlert(id: string | null | undefined) {
  if (!id) return;
  // keepalive lets the cancel finish even if the page is closing.
  void fetch(`/api/alerts/${encodeURIComponent(id)}`, { method: 'DELETE', keepalive: true }).catch(
    () => undefined,
  );
}
