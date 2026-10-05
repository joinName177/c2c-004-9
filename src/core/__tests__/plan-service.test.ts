import { describe, expect, it } from 'vitest';
import { generatePlans } from '../plan-service';
import type { PackingItem, Suitcase } from '../models';

const box: Suitcase = { length: 10, width: 8, height: 6, maxWeight: 10 };
const item = (id: string, overrides: Partial<PackingItem> = {}): PackingItem => ({ id, name: id, category: '衣物', length: 4, width: 2, height: 2, weight: 1, priority: 1, mustHave: false, ...overrides });

describe('generatePlans', () => {
  it('creates three named strategies', () => {
    const plans = generatePlans(box, [item('coat')]);
    expect(Object.keys(plans)).toEqual(['minimal', 'comfort', 'shopping']);
    expect(Object.values(plans).map((plan) => plan.name)).toEqual(['精简版', '舒适版', '购物版']);
  });

  it('places must-have and high-priority items first', () => {
    const plans = generatePlans(box, [item('low'), item('must', { mustHave: true }), item('high', { priority: 3 })]);
    expect(plans.comfort.placements.map((p) => p.itemId).slice(0, 2)).toEqual(['must', 'high']);
  });

  it('shopping mode reserves more free capacity than comfort mode', () => {
    const items = Array.from({ length: 8 }, (_, index) => item(`item-${index}`, { length: 5, width: 3, height: 2 }));
    const plans = generatePlans(box, items);
    expect(plans.shopping.usedVolume).toBeLessThanOrEqual(plans.comfort.usedVolume);
    expect(plans.shopping.unplaced.length).toBeGreaterThanOrEqual(plans.comfort.unplaced.length);
  });
});
