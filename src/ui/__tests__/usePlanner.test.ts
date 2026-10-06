import { describe, expect, it } from 'vitest';
import { createSampleSnapshot } from '../../core/sample-data';
import { usePlanner } from '../usePlanner';
import type { StoredState } from '../../ports/planner-repository.port';
import type { PlannerRepository } from '../../ports/planner-repository.port';

class MemoryRepository implements PlannerRepository {
  saved?: StoredState;
  constructor(private state: StoredState = { ...createSampleSnapshot(), result: null }) {}
  load() { return { value: structuredClone(this.state) }; }
  save(state: StoredState) { this.state = structuredClone(state); this.saved = structuredClone(state); }
}

function createPlanner() {
  let printed = 0;
  const repository = new MemoryRepository();
  const planner = usePlanner({ repository, printPort: { print() { printed += 1; } } });
  return { repository, planner, printCount: () => printed };
}

describe('usePlanner', () => {
  it('adds, updates and removes items while marking results stale', () => {
    const { planner } = createPlanner();
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
    const { repository, planner } = createPlanner();
    planner.updateSuitcase({ maxWeight: 12 });
    expect(planner.isStale.value).toBe(true);
    planner.regenerate();
    planner.selectPlan('shopping');
    expect(planner.isStale.value).toBe(false);
    expect(planner.plans.value.shopping.name).toBe('购物版');
    expect(repository.saved?.selectedPlan).toBe('shopping');
  });

  it('keeps the last result frozen while edits are pending', () => {
    const { planner } = createPlanner();
    const oldWeight = planner.currentPlan.value.totalWeight;
    expect(planner.resultItems.value.map((item) => item.id)).toContain('jacket');

    planner.removeItem('jacket');
    expect(planner.isStale.value).toBe(true);
    // 已装重量、摆放色块、物品依据全部仍是上次计算
    expect(planner.currentPlan.value.totalWeight).toBe(oldWeight);
    expect(planner.currentPlan.value.placements.some((p) => p.itemId === 'jacket')).toBe(true);
    expect(planner.resultItems.value.map((item) => item.id)).toContain('jacket');

    planner.regenerate();
    expect(planner.isStale.value).toBe(false);
    expect(planner.currentPlan.value.totalWeight).toBeCloseTo(oldWeight - 0.65, 5);
    expect(planner.currentPlan.value.placements.some((p) => p.itemId === 'jacket')).toBe(false);
    expect(planner.resultItems.value.map((item) => item.id)).not.toContain('jacket');
  });

  it('evaluates risks against the last result inputs until recalculated', () => {
    const { planner } = createPlanner();
    const oldWeight = planner.currentPlan.value.totalWeight;
    planner.updateSuitcase({ maxWeight: Math.ceil(oldWeight * 10) / 10 });
    expect(planner.isStale.value).toBe(true);
    expect(planner.risks.value.some((risk) => risk.id === 'near-weight')).toBe(false);

    planner.regenerate();
    expect(planner.isStale.value).toBe(false);
    expect(planner.risks.value.some((risk) => risk.id === 'near-weight')).toBe(true);
  });

  it('refuses to recalculate over invalid inputs and preserves the old result', () => {
    const { planner } = createPlanner();
    const oldPlan = planner.currentPlan.value;
    planner.updateSuitcase({ length: 0 });
    expect(planner.inputErrors.value.length).toBeGreaterThan(0);

    planner.regenerate();
    expect(planner.isStale.value).toBe(true);
    expect(planner.currentPlan.value).toBe(oldPlan);
    expect(planner.resultSuitcase.value.length).toBe(52);
  });

  it('blocks printing while stale and allows it after recalculation', () => {
    const { planner, printCount } = createPlanner();
    planner.removeItem('jacket');
    expect(planner.canPrint.value).toBe(false);
    planner.print();
    expect(printCount()).toBe(0);

    planner.regenerate();
    expect(planner.canPrint.value).toBe(true);
    planner.print();
    expect(printCount()).toBe(1);
  });

  it('persists the frozen result so a page refresh cannot mix the two calculations', () => {
    const { repository } = createPlanner();
    const plannerOnPage = usePlanner({ repository, printPort: { print() {} } });
    plannerOnPage.removeItem('jacket');
    plannerOnPage.updateSuitcase({ maxWeight: 6 });
    expect(plannerOnPage.isStale.value).toBe(true);

    const refreshed = usePlanner({ repository, printPort: { print() {} } });
    expect(refreshed.isStale.value).toBe(true);
    // 展示依据是上次结果：外套还在、承重仍是 10
    expect(refreshed.resultItems.value.map((item) => item.id)).toContain('jacket');
    expect(refreshed.resultSuitcase.value.maxWeight).toBe(10);
    expect(refreshed.state.items.map((item) => item.id)).not.toContain('jacket');
    expect(refreshed.state.suitcase.maxWeight).toBe(6);
    expect(refreshed.canPrint.value).toBe(false);

    refreshed.regenerate();
    expect(refreshed.isStale.value).toBe(false);
    expect(refreshed.resultItems.value.map((item) => item.id)).not.toContain('jacket');
  });
});
