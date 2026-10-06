import { beforeEach, describe, expect, it } from 'vitest';
import { LocalPlannerRepository } from '../local-planner.repository';
import { createSampleSnapshot } from '../../core/sample-data';
import { computeResult } from '../../core/plan-service';
import type { StoredState } from '../../ports/planner-repository.port';

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() { return this.data.size; }
  clear() { this.data.clear(); }
  getItem(key: string) { return this.data.get(key) ?? null; }
  key(index: number) { return [...this.data.keys()][index] ?? null; }
  removeItem(key: string) { this.data.delete(key); }
  setItem(key: string, value: string) { this.data.set(key, value); }
}

describe('LocalPlannerRepository', () => {
  const storage = new MemoryStorage();
  beforeEach(() => storage.clear());

  it('round trips a planning snapshot together with its computed result', () => {
    const repo = new LocalPlannerRepository(storage);
    const sample = createSampleSnapshot();
    const state: StoredState = {
      ...sample,
      suitcase: { ...sample.suitcase, length: 61 },
      result: computeResult({ ...sample.suitcase, length: 61 }, sample.items),
    };
    repo.save(state);
    const loaded = repo.load().value;
    expect(loaded.suitcase.length).toBe(61);
    expect(loaded.result?.suitcase.length).toBe(61);
    expect(loaded.result?.plans.comfort.plan.placements.length).toBeGreaterThan(0);
  });

  it('returns sample data with no result when storage is empty', () => {
    const result = new LocalPlannerRepository(storage).load();
    expect(result.value.items.length).toBeGreaterThan(0);
    expect(result.value.result).toBeNull();
    expect(result.warning).toBeUndefined();
  });

  it('returns sample data and a warning for malformed JSON', () => {
    storage.setItem('c2c-004.planner', '{bad');
    const result = new LocalPlannerRepository(storage).load();
    expect(result.value.items.length).toBeGreaterThan(0);
    expect(result.value.result).toBeNull();
    expect(result.warning).toContain('已恢复示例');
  });

  it('migrates legacy snapshots by recomputing a result for valid inputs', () => {
    const sample = createSampleSnapshot();
    storage.setItem('c2c-004.planner', JSON.stringify(sample));
    const result = new LocalPlannerRepository(storage).load();
    expect(result.value.result?.suitcase.maxWeight).toBe(sample.suitcase.maxWeight);
    expect(result.value.result?.plans.comfort.risks.length).toBeGreaterThan(0);
  });

  it('keeps a null result when migrating a legacy snapshot with invalid inputs', () => {
    const sample = createSampleSnapshot();
    storage.setItem('c2c-004.planner', JSON.stringify({ ...sample, suitcase: { ...sample.suitcase, length: 0 } }));
    const result = new LocalPlannerRepository(storage).load();
    expect(result.value.suitcase.length).toBe(0);
    expect(result.value.result).toBeNull();
  });
});
