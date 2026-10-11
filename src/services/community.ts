import { config } from '../config';
export type CrowdLevel = 'empty' | 'seats' | 'standing' | 'full';
export interface CrowdSummary {
  vehicleId: number;
  occupancy: CrowdLevel;
  reports: number;
  reportedAt: string;
}
const endpoint = config.supabaseUrl + '/functions/v1/community';
async function community(path: string, options: RequestInit = {}) {
  const response = await fetch(endpoint + path, {
    ...options,
    headers: { apikey: config.supabaseKey, 'Content-Type': 'application/json', ...options.headers },
    cache: 'no-store',
    signal: AbortSignal.timeout(12000),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof json.error === 'string' ? json.error : 'Request failed.');
  return json;
}
export async function getCrowdReports(routeId: number): Promise<CrowdSummary[]> {
  const result = await community('?routeId=' + routeId);
  return Array.isArray(result.reports) ? result.reports : [];
}
export async function sendCrowdReport(routeId: number, vehicleId: number, occupancy: CrowdLevel) {
  await community('', { method: 'POST', body: JSON.stringify({ type: 'crowd', routeId, vehicleId, occupancy }) });
}
export async function sendDeveloperFeedback(category: string, message: string, email: string) {
  await community('', { method: 'POST', body: JSON.stringify({ type: 'feedback', category, message, email }) });
}
