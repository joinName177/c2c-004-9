import { describe, expect, it } from 'vitest';
import { intersects, rotationsOf } from '../geometry';
import type { PackingItem, Placement } from '../models';

const item = (length: number, width: number, height: number) => ({ length, width, height }) as PackingItem;

describe('rotationsOf', () => {
  it('returns six unique rotations for three unequal edges', () => {
    expect(rotationsOf(item(2, 3, 4))).toHaveLength(6);
  });

  it('removes duplicate rotations for a cube', () => {
    expect(rotationsOf(item(3, 3, 3))).toEqual([{ length: 3, width: 3, height: 3 }]);
  });
});

describe('intersects', () => {
  const box = (x: number, y: number, z: number): Placement => ({
    itemId: 'box', x, y, z, dimensions: { length: 2, width: 2, height: 2 },
  });

  it('allows boxes whose faces only touch', () => {
    expect(intersects(box(0, 0, 0), box(2, 0, 0))).toBe(false);
  });

  it('detects boxes with overlapping volume', () => {
    expect(intersects(box(0, 0, 0), box(1, 1, 1))).toBe(true);
  });
});
