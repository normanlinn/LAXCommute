import { routeSnapshots } from '../../../src/domain/route-snapshots.ts';
import { activityLabels } from '../../../src/domain/stop-reports.ts';

export function validReportStop(routeId: unknown, stopId: unknown) {
  return (
    typeof routeId === 'number' &&
    typeof stopId === 'number' &&
    routeSnapshots[routeId]?.stops.some((stop) => stop.id === stopId) === true
  );
}
export function validStopReport(data: Record<string, unknown>) {
  return (
    validReportStop(data.routeId, data.stopId) &&
    typeof data.activity === 'string' &&
    Object.hasOwn(activityLabels, data.activity) &&
    (data.activity === 'crowding'
      ? ['empty', 'seats', 'standing', 'full'].includes(String(data.occupancy))
      : data.occupancy === undefined || data.occupancy === null)
  );
}
