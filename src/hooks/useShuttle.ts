import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { config } from '../config';
import { ARRIVAL_TTL_MS } from '../domain/arrivals';
import { getRoute, getLive, getFallbackRoute } from '../services/shuttle';
import { sampleLive } from '../domain/sample';
import type { Stop } from '../types';

export function useRoute(routeID: number) {
  return useQuery({
    // Let the service worker serve a cached response when the device is offline.
    networkMode: 'always',
    queryKey: ['route', routeID],
    queryFn: async ({ signal }) => {
      try {
        return await getRoute(routeID, signal);
      } catch (error) {
        if (signal.aborted) throw error;
        const fallback = getFallbackRoute(routeID);
        if (!fallback) throw error;
        return fallback;
      }
    },
    initialData: () => getFallbackRoute(routeID),
    initialDataUpdatedAt: 0,
    staleTime: 5 * 60_000,
    gcTime: 60 * 60_000,
    retry: false,
  });
}
/**
 * Live buses and arrivals for a stop. With `sample` on, made-up buses replace the feed
 * entirely (no network request), refreshing often so they visibly move.
 */
export function useLive(routeID: number, stop?: Stop, enabled = true, sample = false) {
  const stopID = stop?.id;
  return useQuery({
    // Let the service worker serve a cached response when the device is offline.
    networkMode: 'always',
    queryKey: ['live', sample ? 'sample' : 'feed', routeID, stopID || 0],
    queryFn: ({ signal }) =>
      sample
        ? sampleLive(routeID, stop, getFallbackRoute(routeID)?.paths || [])
        : getLive(routeID, stopID, signal),
    enabled,
    staleTime: sample ? 0 : 15_000,
    gcTime: 2 * 60_000,
    refetchInterval: sample ? 5_000 : config.refreshInterval,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: false,
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
