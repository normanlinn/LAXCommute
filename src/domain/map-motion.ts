import type { Point, RoutePath } from '../types';

/** Draw only between *reported* GPS fixes. Never predict a bus's future location. */
const rad = Math.PI / 180;
export function segmentMeters(a: Point, b: Point) {
  const scale = Math.cos(((a.lat + b.lat) / 2) * rad);
  return Math.hypot((a.lon - b.lon) * 111320 * scale, (a.lat - b.lat) * 110540);
}
type Hit = { segment: number; fraction: number; distance: number; point: Point };
function closest(point: Point, shape: Point[]): Hit | null {
  let best: Hit | null = null;
  for (let i = 0; i < shape.length - 1; i++) {
    const a = shape[i], b = shape[i + 1];
    if (![a.lat, a.lon, b.lat, b.lon].every(Number.isFinite)) continue;
    const mx = 111320 * Math.cos(point.lat * rad);
    const my = 110540;
    const dx = (b.lon - a.lon) * mx;
    const dy = (b.lat - a.lat) * my;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared < 0.01) continue;
    const fraction = Math.max(0, Math.min(1,
      ((point.lon - a.lon) * mx * dx + (point.lat - a.lat) * my * dy) / lengthSquared,
    ));
    const projected = {
      lat: a.lat + (b.lat - a.lat) * fraction,
      lon: a.lon + (b.lon - a.lon) * fraction,
    };
    const distance = segmentMeters(point, projected);
    if (!best || distance < best.distance) {
      best = { segment: i, fraction, distance, point: projected };
    }
  }
  return best;
}
function compact(points: Point[]) {
  return points.filter((p, i) => !i || segmentMeters(p, points[i - 1]) > 0.3);
}

/**
 * Finds the short section of an actual LAX route between two GPS observations.
 * Null means insufficient confidence: the marker should snap to the fresh GPS,
 * rather than animate an invented route or cut straight across city blocks.
 */
export function routeMotionPath(from: Point, to: Point, paths: RoutePath[]): Point[] | null {
  const direct = segmentMeters(from, to);
  if (!Number.isFinite(direct) || direct < 3 || direct > 950) return null;
  let best: { score: number; points: Point[] } | null = null;
  for (const path of paths) {
    const shape = path.coordinates;
    if (shape.length < 2 || shape.length > 5000) continue;
    const start = closest(from, shape);
    const end = closest(to, shape);
    if (!start || !end || start.distance > 65 || end.distance > 65) continue;
    const points: Point[] = [from, start.point];
    if (start.segment < end.segment) {
      for (let i = start.segment + 1; i <= end.segment; i++) points.push(shape[i]);
    } else if (start.segment > end.segment) {
      for (let i = start.segment; i > end.segment; i--) points.push(shape[i]);
    }
    points.push(end.point, to);
    const cleaned = compact(points);
    const total = cleaned.slice(1).reduce((sum, p, i) => sum + segmentMeters(cleaned[i], p), 0);
    if (!Number.isFinite(total) || total > 1250 || total > Math.max(180, direct * 2.8)) continue;
    const score = start.distance + end.distance + total * 0.08;
    if (!best || score < best.score) best = { score, points: cleaned };
  }
  return best?.points ?? null;
}
/** Distance-based interpolation: buses follow bends instead of crossing streets. */
export function positionOnMotionPath(path: Point[], fraction: number): Point {
  if (!path.length) return { lat: 0, lon: 0 };
  if (path.length === 1 || fraction <= 0) return path[0];
  if (fraction >= 1) return path[path.length - 1];
  const distances = path.slice(1).map((p, i) => segmentMeters(path[i], p));
  const total = distances.reduce((sum, n) => sum + n, 0);
  if (total === 0) return path[path.length - 1];
  let remaining = total * Math.max(0, Math.min(1, fraction));
  for (let i = 0; i < distances.length; i++) {
    if (remaining <= distances[i] || i === distances.length - 1) {
      const t = distances[i] ? remaining / distances[i] : 1;
      return {
        lat: path[i].lat + (path[i + 1].lat - path[i].lat) * t,
        lon: path[i].lon + (path[i + 1].lon - path[i].lon) * t,
      };
    }
    remaining -= distances[i];
  }
  return path[path.length - 1];
}
