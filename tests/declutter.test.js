import { describe, expect, it } from 'vitest';
import { declutterOffsets } from '../src/domain/declutter';

const placed = (points, offsets) =>
  points.map((p, i) => ({ x: p.x + offsets[i].x, y: p.y + offsets[i].y }));
const minGap = (points) => {
  let gap = Infinity;
  for (let i = 0; i < points.length; i++)
    for (let j = i + 1; j < points.length; j++)
      gap = Math.min(gap, Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y));
  return gap;
};

describe('bus marker declutter', () => {
  it('leaves well-separated buses where their GPS puts them', () => {
    const offsets = declutterOffsets([
      { x: 0, y: 0 },
      { x: 200, y: 0 },
    ]);
    expect(offsets).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ]);
  });

  it('fans out stacked buses so their icons no longer overlap', () => {
    const points = [
      { x: 100, y: 100 },
      { x: 104, y: 98 },
      { x: 101, y: 103 },
    ];
    expect(minGap(placed(points, declutterOffsets(points, null, 50)))).toBeGreaterThanOrEqual(49);
  });

  it('nudges a lone bus off the boarding stop pin', () => {
    const stop = { x: 50, y: 50 };
    const [offset] = declutterOffsets([{ x: 50, y: 50 }], stop, 50);
    expect(Math.hypot(offset.x, offset.y)).toBeCloseTo(40);
    // Moves up and away from the label side, not down into the arrival card.
    expect(offset.y).toBeLessThan(0);
  });

  it('ignores invalid positions', () => {
    expect(declutterOffsets([{ x: NaN, y: 0 }])).toEqual([{ x: 0, y: 0 }]);
  });
});
