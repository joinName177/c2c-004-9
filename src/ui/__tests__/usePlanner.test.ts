import { describe, expect, it } from 'vitest';
import { createSampleSnapshot } from '../../core/sample-data';
import { usePlanner } from '../usePlanner';
import type { PackingSnapshot } from '../../core/models';
import type { PlannerRepository } from '../../ports/planner-repository.port';

class MemoryRepository implements PlannerRepository {
  saved?: PackingSnapshot;
  constructor(private snapshot = createSampleSnapshot()) {}
  load() { return { value: structuredClone(this.snapshot) }; }
  save(snapshot: PackingSnapshot) { this.saved = structuredClone(snapshot); }
}

describe('usePlanner', () => {
  it('adds, updates and removes items while marking results stale', () => {
    const repository = new MemoryRepository();
    const planner = usePlanner({ repository, printPort: { print() {} } });
    const initial = planner.state.items.length;
    planner.addItem({ id: 'new', name: '帽子', category: '衣物', length: 12, width: 12, height: 5, weight: 0.2, priority: 2, mustHave: false });
    expect(planner.state.items).toHaveLength(initial + 1);
    expect(planner.isStale.value).toBe(true);
    planner.updateItem('new', { name: '遮阳帽' });
    expect(planner.state.items.find((item) => item.id === 'new')?.name).toBe('遮阳帽');
    planner.removeItem('new');
    expect(planner.state.items).toHaveLength(initial);
  });

  it('regenerates plans and persists the selected mode', () => {
    const repository = new MemoryRepository();
    const planner = usePlanner({ repository, printPort: { print() {} } });
    planner.updateSuitcase({ maxWeight: 12 });
    expect(planner.isStale.value).toBe(true);
    planner.regenerate();
    planner.selectPlan('shopping');
    expect(planner.isStale.value).toBe(false);
    expect(planner.plans.value.shopping.name).toBe('购物版');
    expect(repository.saved?.selectedPlan).toBe('shopping');
  });

  it('keeps result basis frozen until a successful recalculation', () => {
    const planner = usePlanner({ repository: new MemoryRepository(), printPort: { print() {} } });
    const weightBefore = planner.currentPlan.value.totalWeight;
    planner.removeItem('jacket');
    expect(planner.isStale.value).toBe(true);
    expect(planner.basis.value.items.some((item) => item.id === 'jacket')).toBe(true);
    expect(planner.currentPlan.value.placements.some((placement) => placement.itemId === 'jacket')).toBe(true);
    expect(planner.currentPlan.value.totalWeight).toBe(weightBefore);
    expect(planner.regenerate()).toBe(true);
    expect(planner.basis.value.items.some((item) => item.id === 'jacket')).toBe(false);
    expect(planner.currentPlan.value.placements.some((placement) => placement.itemId === 'jacket')).toBe(false);
    expect(planner.currentPlan.value.totalWeight).toBeLessThan(weightBefore);
  });

  it('judges risks with the suitcase captured at calculation time', () => {
    const planner = usePlanner({ repository: new MemoryRepository(), printPort: { print() {} } });
    planner.updateSuitcase({ maxWeight: 3.5 });
    expect(planner.risks.value.some((risk) => risk.id === 'near-weight')).toBe(false);
    planner.regenerate();
    expect(planner.risks.value.some((risk) => risk.id === 'near-weight')).toBe(true);
  });

  it('keeps previous results and stays stale when input is invalid', () => {
    const planner = usePlanner({ repository: new MemoryRepository(), printPort: { print() {} } });
    const previousPlans = planner.plans.value;
    const previousBasis = planner.basis.value;
    planner.updateSuitcase({ length: 0 });
    expect(planner.regenerate()).toBe(false);
    expect(planner.isStale.value).toBe(true);
    expect(planner.plans.value).toBe(previousPlans);
    expect(planner.basis.value).toBe(previousBasis);
    expect(planner.notice.value).toContain('保留');
  });

  it('replaces all three plans and their basis atomically on recalculation', () => {
    const planner = usePlanner({ repository: new MemoryRepository(), printPort: { print() {} } });
    planner.updateSuitcase({ maxWeight: 12 });
    planner.regenerate();
    for (const mode of ['minimal', 'comfort', 'shopping'] as const) {
      expect(planner.plans.value[mode].placements.every((placement) => planner.basis.value.items.some((item) => item.id === placement.itemId))).toBe(true);
    }
    planner.selectPlan('shopping');
    expect(planner.risks.value.every((risk) => risk.itemId === undefined || planner.basis.value.items.some((item) => item.id === risk.itemId))).toBe(true);
  });

  it('blocks printing while results are stale', () => {
    let printed = 0;
    const planner = usePlanner({ repository: new MemoryRepository(), printPort: { print() { printed += 1; } } });
    planner.print();
    expect(printed).toBe(1);
    planner.removeItem('jacket');
    planner.print();
    expect(printed).toBe(1);
    expect(planner.notice.value).toContain('待更新');
    planner.regenerate();
    planner.print();
    expect(printed).toBe(2);
  });
});
