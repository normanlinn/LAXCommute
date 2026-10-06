import type { Point, Stop, RoutePath } from '../types';

export const ROUTE_VIEW_WIDTH = 600;
export const ROUTE_VIEW_HEIGHT = 420;
export function validRoutePoint(point: Point) {
  return (
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lon) &&
    Math.abs(point.lat) <= 85.05112878 &&
    Math.abs(point.lon) <= 180
  );
}
function mercator(point: Point) {
  const radians = (point.lat * Math.PI) / 180;
  return {
    x: (point.lon + 180) / 360,
    y: (1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2,
  };
}
export interface BackgroundTile {
  key: string;
  x: number;
  y: number;
  size: number;
  zoom: number;
  column: number;
  row: number;
}
// The background and every overlay share Web Mercator coordinates.
export function createRouteProjection(stops: Stop[], paths: RoutePath[]) {
  const points = [...stops, ...paths.flatMap((path) => path.coordinates)]
    .filter(validRoutePoint)
    .map(mercator);
  if (!points.length) return null;
  const xs = points.map((p) => p.x),
    ys = points.map((p) => p.y);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs),
    minY = Math.min(...ys),
    maxY = Math.max(...ys);
  const scale = Math.min(
    480 / Math.max(maxX - minX, 0.000003),
    300 / Math.max(maxY - minY, 0.000003),
  );
  const originX = (minX + maxX) / 2 - ROUTE_VIEW_WIDTH / 2 / scale;
  const originY = (minY + maxY) / 2 - ROUTE_VIEW_HEIGHT / 2 / scale;
  const project = (point: Point) => {
    const p = mercator(point);
    return { x: (p.x - originX) * scale, y: (p.y - originY) * scale };
  };
  const zoom = Math.max(0, Math.min(16, Math.floor(Math.log2(scale / 256))));
  const count = 2 ** zoom,
    size = scale / count;
  const tiles: BackgroundTile[] = [];
  for (
    let column = Math.floor(originX * count);
    column < Math.ceil((originX + ROUTE_VIEW_WIDTH / scale) * count);
    column++
  ) {
    for (
      let row = Math.floor(originY * count);
      row < Math.ceil((originY + ROUTE_VIEW_HEIGHT / scale) * count);
      row++
    ) {
      if (row < 0 || row >= count) continue;
      tiles.push({
        key: `${zoom}:${column}:${row}`,
        zoom,
        column: ((column % count) + count) % count,
        row,
        x: (column / count - originX) * scale,
        y: (row / count - originY) * scale,
        size,
      });
    }
  }
  return Object.assign(project, { tiles });
}
export function routePathData(points: Point[], project: (p: Point) => { x: number; y: number }) {
  let connected = false;
  return points
    .map((point) => {
      if (!validRoutePoint(point)) {
        connected = false;
        return '';
      }
      const { x, y } = project(point);
      const command = `${connected ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`;
      connected = true;
      return command;
    })
    .join(' ');
}
