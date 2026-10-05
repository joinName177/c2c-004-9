import type { Dimensions, PackingItem, Placement } from './models';

export function rotationsOf(item: Pick<PackingItem, 'length' | 'width' | 'height'>): Dimensions[] {
  const [a, b, c] = [item.length, item.width, item.height];
  const candidates: Dimensions[] = [
    { length: a, width: b, height: c }, { length: a, width: c, height: b },
    { length: b, width: a, height: c }, { length: b, width: c, height: a },
    { length: c, width: a, height: b }, { length: c, width: b, height: a },
  ];
  return candidates.filter((value, index) => candidates.findIndex((candidate) =>
    candidate.length === value.length && candidate.width === value.width && candidate.height === value.height,
  ) === index);
}

export function intersects(a: Placement, b: Placement): boolean {
  return a.x < b.x + b.dimensions.length && a.x + a.dimensions.length > b.x
    && a.y < b.y + b.dimensions.width && a.y + a.dimensions.width > b.y
    && a.z < b.z + b.dimensions.height && a.z + a.dimensions.height > b.z;
}
