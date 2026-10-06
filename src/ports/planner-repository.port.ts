import type { CalcResult, PackingSnapshot } from '../core/models';

export interface StoredState extends PackingSnapshot {
  result: CalcResult | null;
}

export interface LoadResult<T> { value: T; warning?: string }
export interface PlannerRepository {
  load(): LoadResult<StoredState>;
  save(state: StoredState): void;
}
