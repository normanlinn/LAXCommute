import { useEffect, useState } from 'react';
import metro from '../data/metro-lines.json';
import { METRO_POSITION_TTL_MS, parseMetroMessage, type MetroTrain } from '../domain/metro';

// LA Metro's public, keyless GTFS-realtime stream (a pass-through of Swiftly data).
const STREAM = `wss://api.metro.net/ws/LACMTA_Rail/vehicle_positions/${metro.lines
  .map((l) => l.id)
  .join(',')}`;
// Messages arrive every few seconds per train; repaint at most this often.
const PAINT_MS = 1_000;

export type MetroStatus = 'connecting' | 'live' | 'unavailable';

/**
 * Live Metro Rail positions for the lines serving LAX. Connects only while
 * `enabled` and the page is visible, and reconnects with backoff after drops.
 */
export function useMetroTrains(enabled: boolean) {
  const [trains, setTrains] = useState<MetroTrain[]>([]);
  const [status, setStatus] = useState<MetroStatus>('connecting');
  const [lastMessage, setLastMessage] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled || typeof WebSocket === 'undefined') return;
    const latest = new Map<string, MetroTrain>();
    let socket: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    let dirty = false;
    let heardAt = 0;

    const connect = () => {
      if (document.hidden || socket) return;
      setStatus((s) => (s === 'live' ? s : 'connecting'));
      socket = new WebSocket(STREAM);
      socket.onmessage = (event) => {
        const train = parseMetroMessage(event.data);
        if (!train) return;
        attempts = 0;
        heardAt = Date.now();
        latest.set(train.id, train);
        dirty = true;
      };
      socket.onclose = () => {
        socket = null;
        if (document.hidden) return;
        attempts += 1;
        if (attempts >= 3) setStatus('unavailable');
        retry = setTimeout(connect, Math.min(30_000, 1_000 * 2 ** attempts));
      };
    };
    const disconnect = () => {
      clearTimeout(retry);
      const open = socket;
      socket = null;
      if (!open) return;
      // A deliberate close (hidden page, unmount) must not schedule a reconnect.
      open.onclose = null;
      open.close();
    };
    const paint = setInterval(() => {
      const now = Date.now();
      for (const [id, train] of latest)
        if (now - train.updatedAt > METRO_POSITION_TTL_MS) {
          latest.delete(id);
          dirty = true;
        }
      if (heardAt) {
        setStatus('live');
        setLastMessage(heardAt);
      }
      if (!dirty) return;
      dirty = false;
      setTrains([...latest.values()]);
    }, PAINT_MS);
    const onVisibility = () => (document.hidden ? disconnect() : connect());

    connect();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(paint);
      document.removeEventListener('visibilitychange', onVisibility);
      disconnect();
    };
  }, [enabled]);

  return { trains, status, lastMessage };
}
