export const REPORT_WINDOW_MS = 15 * 60_000;
export const activityLabels = {
  arrived: 'Bus arrived',
  departed: 'Just departed',
  crowding: 'Crowd report',
} as const;
export type StopActivity = keyof typeof activityLabels;
export interface StopReport {
  activity: StopActivity;
  occupancy: 'empty' | 'seats' | 'standing' | 'full' | null;
  reportedAt: string;
}
export function recentStopReports(reports: StopReport[], now: number) {
  return reports.filter((report) => {
    const age = now - Date.parse(report.reportedAt);
    return Object.hasOwn(activityLabels, report.activity) && age >= 0 && age < REPORT_WINDOW_MS;
  });
}
