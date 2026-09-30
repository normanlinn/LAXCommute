export const config = Object.freeze({
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || 'https://yzdoarjleozzblvsjbhx.supabase.co',
  supabaseKey:
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    'sb_publishable_AkClR2bp72pGci-NAX1DBQ_8INzT0v1',
  appleMapsToken: import.meta.env.VITE_APPLE_MAPS_TOKEN || '',
  refreshInterval: Math.max(30_000, Number(import.meta.env.VITE_REFRESH_INTERVAL_MS) || 60_000),
});
