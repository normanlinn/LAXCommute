import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { config } from '../config';
import { ARRIVAL_TTL_MS } from '../domain/arrivals';
import { getRoute, getLive } from '../services/shuttle';

export function useRoute(routeID: number) {
  return useQuery({
    queryKey: ['route', routeID],
    queryFn: ({ signal }) => getRoute(routeID, signal),
    staleTime: 5 * 60_000,
    gcTime: 60 * 60_000,
    retry: 2,
  });
}
export function useLive(routeID: number, stopID?: number, enabled = true) {
  return useQuery({
    queryKey: ['live', routeID, stopID || 0],
    queryFn: ({ signal }) => getLive(routeID, stopID, signal),
    enabled,
    staleTime: 15_000,
    gcTime: 2 * 60_000,
    refetchInterval: config.refreshInterval,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}
// One expiry transition per snapshot, instead of rerendering the map every second.
export function useSnapshotFresh(timestamp?: string | null) {
  const [expired, setExpired] = useState(true);
  useEffect(() => {
    const remaining = Date.parse(timestamp || '') + ARRIVAL_TTL_MS - Date.now();
    setExpired(!Number.isFinite(remaining) || remaining <= 0);
    if (!(remaining > 0)) return;
    const timer = setTimeout(() => setExpired(true), remaining);
    return () => clearTimeout(timer);
  }, [timestamp]);
  return Boolean(timestamp) && !expired;
}
export function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    addEventListener('online', update);
    addEventListener('offline', update);
    return () => {
      removeEventListener('online', update);
      removeEventListener('offline', update);
    };
  }, []);
  return online;
}
