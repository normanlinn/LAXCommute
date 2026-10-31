/** Screen-space offsets only: the marker's real GPS coordinate never changes. */
export interface Pixel {
  x: number;
  y: number;
}

/**
 * Fans out bus markers whose icons would overlap at the current zoom, and nudges
 * a lone bus off the boarding-stop pin so both stay readable and tappable.
 * Returns one {x, y} offset in pixels per input point, in the same order.
 */
export function declutterOffsets(points: Pixel[], anchor?: Pixel | null, gap = 50): Pixel[] {
  const offsets = points.map(() => ({ x: 0, y: 0 }));
  const groups: { members: number[]; x: number; y: number }[] = [];
  points.forEach((point, index) => {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return;
    const group = groups.find((g) => Math.hypot(g.x - point.x, g.y - point.y) < gap);
    if (!group) {
      groups.push({ members: [index], x: point.x, y: point.y });
      return;
    }
    group.members.push(index);
    group.x = group.members.reduce((sum, i) => sum + points[i].x, 0) / group.members.length;
    group.y = group.members.reduce((sum, i) => sum + points[i].y, 0) / group.members.length;
  });
  for (const group of groups) {
    const count = group.members.length;
    if (count === 1) {
      const index = group.members[0];
      const point = points[index];
      if (!anchor) continue;
      const dx = point.x - anchor.x;
      const dy = point.y - anchor.y;
      const distance = Math.hypot(dx, dy);
      const clearance = gap * 0.8;
      if (distance >= clearance) continue;
      // Directly on the stop: lift the bus up-right, away from the "Board here" label.
      const ux = distance > 0.5 ? dx / distance : Math.SQRT1_2;
      const uy = distance > 0.5 ? dy / distance : -Math.SQRT1_2;
      offsets[index] = { x: ux * (clearance - distance), y: uy * (clearance - distance) };
      continue;
    }
    // Spread evenly on a ring sized so neighbours just touch.
    const radius = Math.max(gap * 0.55, gap / (2 * Math.sin(Math.PI / count)));
    group.members.forEach((index, order) => {
      const angle = -Math.PI / 2 + (order * 2 * Math.PI) / count;
      offsets[index] = {
        x: group.x + Math.cos(angle) * radius - points[index].x,
        y: group.y + Math.sin(angle) * radius - points[index].y,
      };
    });
  }
  return offsets;
}
