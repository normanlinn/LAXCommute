import type { Commute } from '../types';
import { normalizeCommute } from '../domain/commute';
import { getAuthClient } from './auth';

export async function loadAccountCommute(userID: string): Promise<Commute | null> {
  const client = await getAuthClient();
  const { data, error } = await client
    .from('commute_profiles')
    .select('*')
    .eq('user_id', userID)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return normalizeCommute({
    lot: data.lot,
    terminal: data.terminal,
    terminalStopID: data.terminal_stop_id,
    terminalStopName: data.terminal_stop_name,
    parkingStopID: data.parking_stop_id,
    parkingStopName: data.parking_stop_name,
    walkingMinutes: data.walking_minutes,
    bufferMinutes: data.buffer_minutes,
  });
}

export async function saveAccountCommute(userID: string, value: Commute) {
  const client = await getAuthClient();
  const next = normalizeCommute(value);
  const { error } = await client.from('commute_profiles').upsert(
    {
      user_id: userID,
      lot: next.lot,
      terminal: next.terminal,
      terminal_stop_id: next.terminalStopID,
      terminal_stop_name: next.terminalStopName,
      parking_stop_id: next.parkingStopID,
      parking_stop_name: next.parkingStopName,
      walking_minutes: next.walkingMinutes,
      buffer_minutes: next.bufferMinutes,
    },
    { onConflict: 'user_id' },
  );
  if (error) throw error;
}
