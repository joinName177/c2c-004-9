import { packItems } from './packing-engine';
import type { PackingItem, PackingPlan, PlanMode, Suitcase } from './models';

export function generatePlans(suitcase: Suitcase, items: PackingItem[]): Record<PlanMode, PackingPlan> {
  return {
    minimal: packItems(suitcase, items, 'minimal'),
    comfort: packItems(suitcase, items, 'comfort'),
    shopping: packItems(suitcase, items, 'shopping'),
  };
}
