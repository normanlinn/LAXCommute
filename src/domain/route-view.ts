import type { Point, Stop, RoutePath } from '../types';

export const ROUTE_VIEW_WIDTH = 600;
export const ROUTE_VIEW_HEIGHT = 420;
export function validRoutePoint(point: Point) {
  return (
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lon) &&
    Math.abs(point.lat) <= 90 &&
    Math.abs(point.lon) <= 180
  );
}
// Use actual feed geometry. Never invent a bus route or advance a bus along it.
export function createRouteProjection(stops: Stop[], paths: RoutePath[]) {
  const points = [...stops, ...paths.flatMap((path) => path.coordinates)].filter(validRoutePoint);
  if (!points.length) return null;
  const latitude = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
  const longitudeScale = Math.cos((latitude * Math.PI) / 180);
  const xs = points.map((p) => p.lon * longitudeScale);
  const ys = points.map((p) => -p.lat);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs);
  const minY = Math.min(...ys),
    maxY = Math.max(...ys);
  const scale = Math.min(480 / Math.max(maxX - minX, 0.001), 300 / Math.max(maxY - minY, 0.001));
  return (p: Point) => ({
    x: ROUTE_VIEW_WIDTH / 2 + (p.lon * longitudeScale - (minX + maxX) / 2) * scale,
    y: ROUTE_VIEW_HEIGHT / 2 + (-p.lat - (minY + maxY) / 2) * scale,
  });
}
export function routePathData(points: Point[], project: (p: Point) => { x: number; y: number }) {
  // Break at invalid coordinates rather than joining across missing geometry.
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
