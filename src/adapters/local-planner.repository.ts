import { createSampleSnapshot } from '../core/sample-data';
import { computeResult } from '../core/plan-service';
import { validateSuitcase } from '../core/packing-engine';
import type { CalcResult, PackingSnapshot } from '../core/models';
import type { LoadResult, PlannerRepository, StoredState } from '../ports/planner-repository.port';

const KEY = 'c2c-004.planner';

function isSnapshot(value: unknown): value is PackingSnapshot {
  const candidate = value as PackingSnapshot | null;
  return !!candidate
    && typeof candidate.suitcase === 'object'
    && Array.isArray(candidate.items)
    && (candidate.selectedPlan === 'minimal' || candidate.selectedPlan === 'comfort' || candidate.selectedPlan === 'shopping');
}

function isCalcResult(value: unknown): value is CalcResult {
  const candidate = value as CalcResult | null;
  return !!candidate
    && typeof candidate.suitcase === 'object'
    && Array.isArray(candidate.items)
    && typeof candidate.plans === 'object'
    && !!candidate.plans.minimal?.plan
    && Array.isArray(candidate.plans.minimal.risks);
}

function migrate(raw: unknown): StoredState | null {
  if (!isSnapshot(raw)) return null;
  const snapshot: PackingSnapshot = raw;
  const result = 'result' in raw && isCalcResult((raw as Partial<StoredState>).result)
    ? (raw as StoredState).result
    : validateSuitcase(snapshot.suitcase).length === 0
      ? computeResult(snapshot.suitcase, snapshot.items)
      : null;
  return { ...snapshot, result };
}

export class LocalPlannerRepository implements PlannerRepository {
  constructor(private readonly storage: Storage) {}

  load(): LoadResult<StoredState> {
    const raw = this.storage.getItem(KEY);
    if (!raw) return { value: { ...createSampleSnapshot(), result: null } };
    try {
      const state = migrate(JSON.parse(raw));
      if (state) return { value: state };
      return { value: { ...createSampleSnapshot(), result: null }, warning: '本地数据无法读取，已恢复示例。' };
    } catch {
      return { value: { ...createSampleSnapshot(), result: null }, warning: '本地数据无法读取，已恢复示例。' };
    }
  }

  save(state: StoredState): void {
    this.storage.setItem(KEY, JSON.stringify(state));
  }
}
