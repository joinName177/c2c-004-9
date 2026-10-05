import type { PackingSnapshot } from '../core/models';

export interface LoadResult<T> { value: T; warning?: string }
export interface PlannerRepository {
  load(): LoadResult<PackingSnapshot>;
  save(snapshot: PackingSnapshot): void;
}
