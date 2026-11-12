import metro from '../data/metro-lines.json';

export type MetroData = typeof metro;
export type MetroStation = MetroData['stations'][number];

/** One live train position from LA Metro's GTFS-realtime vehicle stream. */
export interface MetroTrain {
  id: string;
  routeID: string;
  direction: number;
  stopID: string;
  stopped: boolean;
  updatedAt: number;
}

// Positions older than this are no longer a reliable picture of the line.
export const METRO_POSITION_TTL_MS = 3 * 60_000;

// Platform and entrance IDs (80702S, 80702A) belong to the same station.
const stationOf = (stopID: string) => stopID.match(/^\d+/)?.[0] || stopID;

/** Reads one stream message; null when it is not a usable train position. */
export function parseMetroMessage(raw: unknown): MetroTrain | null {
  let message: Record<string, any>;
  try {
    message = typeof raw === 'string' ? JSON.parse(raw) : (raw as Record<string, any>);
  } catch {
    return null;
  }
  const vehicle = message?.vehicle;
  const routeID = String(message?.route_code ?? vehicle?.trip?.routeId ?? '');
  const direction = Number(vehicle?.trip?.directionId);
  const stopID = vehicle?.stopId ? stationOf(String(vehicle.stopId)) : '';
  const updatedAt = Number(vehicle?.timestamp) * 1000;
  if (!message?.id || !routeID || !stopID || ![0, 1].includes(direction)) return null;
  if (!Number.isFinite(updatedAt)) return null;
  return {
    id: String(message.id),
    routeID,
    direction,
    stopID,
    stopped: vehicle?.currentStatus === 'STOPPED_AT',
    updatedAt,
  };
}

export interface MetroApproach {
  trainID: string;
  /** 0 means the train is at the platform or arriving next. */
  stopsAway: number;
  atPlatform: boolean;
  /** Station the train is stopped at, or the one it just left. */
  nowAt: string;
  stopped: boolean;
}
export interface MetroDirectionBoard {
  lineID: string;
  lineName: string;
  color: string;
  textColor: string;
  direction: number;
  headsign: string;
  /** Closest trains still heading toward the station, nearest first. */
  approaching: MetroApproach[];
  /** False when this station is the last stop in this direction. */
  boards: boolean;
}

/**
 * Where each line's trains are relative to one station, counted in stops.
 * Uses only reported positions; it never estimates minutes.
 */
export function metroBoard(
  trains: Iterable<MetroTrain>,
  stationID: string,
  now = Date.now(),
  data: MetroData = metro,
): MetroDirectionBoard[] {
  const fresh = [...trains].filter((t) => now - t.updatedAt <= METRO_POSITION_TTL_MS);
  return data.lines.flatMap((line) =>
    line.directions.flatMap((dir) => {
      const order = dir.stations.map((s) => s.id);
      const target = order.indexOf(stationID);
      if (target < 0) return [];
      const approaching = fresh
        .filter((t) => t.routeID === line.id && t.direction === dir.direction)
        .flatMap((t) => {
          const at = order.indexOf(t.stopID);
          if (at < 0 || at > target) return [];
          const atPlatform = at === target && t.stopped;
          return [
            {
              trainID: t.id,
              stopsAway: target - at,
              atPlatform,
              nowAt: dir.stations[t.stopped ? at : Math.max(0, at - 1)].name,
              stopped: t.stopped,
            },
          ];
        })
        .sort((a, b) => a.stopsAway - b.stopsAway || Number(b.atPlatform) - Number(a.atPlatform))
        .slice(0, 2);
      return [
        {
          lineID: line.id,
          lineName: line.name,
          color: line.color,
          textColor: line.textColor,
          direction: dir.direction,
          headsign: dir.headsign,
          approaching,
          boards: target < order.length - 1,
        },
      ];
    }),
  );
}

export const metroStations: MetroStation[] = metro.stations;
