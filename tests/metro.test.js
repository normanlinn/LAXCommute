import { describe, expect, it } from 'vitest';
import { METRO_POSITION_TTL_MS, metroBoard, parseMetroMessage } from '../src/domain/metro';

const NOW = Date.parse('2026-11-12T23:30:00Z');
const message = ({ id, route, direction, stop, status = 'IN_TRANSIT_TO', at = NOW }) =>
  JSON.stringify({
    id,
    route_code: route,
    vehicle: {
      trip: { routeId: route, directionId: direction },
      currentStatus: status,
      stopId: stop,
      timestamp: String(Math.floor(at / 1000)),
    },
  });
const LAX = '80702'; // LAX/Metro Transit Center
const row = (board, line, headsign) =>
  board.find((r) => r.lineName === line && r.headsign === headsign);

describe('Metro trains near LAX', () => {
  it('reads stream messages and folds platform IDs into their station', () => {
    expect(
      parseMetroMessage(message({ id: 'a', route: '807', direction: 1, stop: '80702S' })),
    ).toMatchObject({
      id: 'a',
      routeID: '807',
      direction: 1,
      stopID: '80702',
      stopped: false,
    });
    expect(parseMetroMessage('not json')).toBeNull();
    expect(parseMetroMessage(JSON.stringify({ id: 'x', vehicle: {} }))).toBeNull();
  });

  it('counts stops to the station from reported positions only', () => {
    const trains = [
      // K Line toward Redondo Beach: Downtown Inglewood is 2 stops before LAX/MTC.
      parseMetroMessage(
        message({ id: 'k1', route: '807', direction: 1, stop: '80704', status: 'STOPPED_AT' }),
      ),
      // K Line toward Expo/Crenshaw: already past LAX, so it must not be counted.
      parseMetroMessage(message({ id: 'k2', route: '807', direction: 0, stop: '80703' })),
      // C Line toward Norwalk: boarding at LAX/MTC.
      parseMetroMessage(
        message({ id: 'c1', route: '803', direction: 1, stop: LAX, status: 'STOPPED_AT' }),
      ),
    ];
    const board = metroBoard(trains, LAX, NOW);
    expect(row(board, 'K Line', 'Redondo Beach').approaching[0]).toMatchObject({
      stopsAway: 2,
      nowAt: 'Downtown Inglewood',
      stopped: true,
    });
    expect(row(board, 'K Line', 'Expo/Crenshaw').approaching).toEqual([]);
    expect(row(board, 'C Line', 'Norwalk').approaching[0]).toMatchObject({
      stopsAway: 0,
      atPlatform: true,
    });
    // The C Line ends at LAX/MTC, so that direction does not board here.
    expect(row(board, 'C Line', 'LAX/Metro Transit Center').boards).toBe(false);
  });

  it('drops positions that are too old to trust', () => {
    const old = parseMetroMessage(
      message({
        id: 'k1',
        route: '807',
        direction: 1,
        stop: '80704',
        at: NOW - METRO_POSITION_TTL_MS - 1000,
      }),
    );
    expect(row(metroBoard([old], LAX, NOW), 'K Line', 'Redondo Beach').approaching).toEqual([]);
  });
});
