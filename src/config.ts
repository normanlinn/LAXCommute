import { safeAttribution } from './domain/attribution';
export const config = Object.freeze({
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || 'https://yzdoarjleozzblvsjbhx.supabase.co',
  supabaseKey:
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    'sb_publishable_AkClR2bp72pGci-NAX1DBQ_8INzT0v1',
  appleMapsToken: import.meta.env.VITE_APPLE_MAPS_TOKEN || '',
  mapProvider: import.meta.env.VITE_MAP_PROVIDER === 'apple' ? 'apple' : 'openstreetmap',
  mapStyleUrl:
    import.meta.env.VITE_MAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/positron',
  mapDarkStyleUrl:
    import.meta.env.VITE_MAP_DARK_STYLE_URL || 'https://tiles.openfreemap.org/styles/dark',
  mapTileUrl: import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  mapAttribution: safeAttribution(
    import.meta.env.VITE_MAP_ATTRIBUTION ||
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  ),
  refreshInterval: Math.max(30_000, Number(import.meta.env.VITE_REFRESH_INTERVAL_MS) || 60_000),
});
