import { packItems } from './packing-engine';
import { detectRisks } from './risk-engine';
import type { CalcResult, PackingItem, PackingPlan, PlanMode, Suitcase } from './models';

const PLAN_MODES: PlanMode[] = ['minimal', 'comfort', 'shopping'];

export function generatePlans(suitcase: Suitcase, items: PackingItem[]): Record<PlanMode, PackingPlan> {
  return {
    minimal: packItems(suitcase, items, 'minimal'),
    comfort: packItems(suitcase, items, 'comfort'),
    shopping: packItems(suitcase, items, 'shopping'),
  };
}

export function computeResult(suitcase: Suitcase, items: PackingItem[]): CalcResult {
  const plans = {} as CalcResult['plans'];
  for (const mode of PLAN_MODES) {
    const plan = packItems(suitcase, items, mode);
    plans[mode] = { plan, risks: detectRisks(plan, suitcase, items) };
  }
  return { suitcase, items, plans };
}
