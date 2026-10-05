import { rotationsOf } from './geometry';
import type { PackingItem, PackingPlan, Risk, Suitcase } from './models';

export function detectRisks(plan: PackingPlan, suitcase: Suitcase, items: PackingItem[]): Risk[] {
  const risks: Risk[] = [];
  const byId = new Map(items.map((item) => [item.id, item]));

  if (plan.totalWeight > suitcase.maxWeight) risks.push({ id: 'overweight', severity: 'critical', title: '行李超重', message: `超出承重 ${(plan.totalWeight - suitcase.maxWeight).toFixed(1)} kg，请移除重物。` });
  else if (plan.totalWeight / suitcase.maxWeight > 0.9) risks.push({ id: 'near-weight', severity: 'warning', title: '接近承重上限', message: '建议预留至少 10% 承重余量。' });
  if (plan.capacityRatio > 0.9) risks.push({ id: 'high-volume', severity: 'warning', title: '空间接近满载', message: '空间利用率超过 90%，返程新增物品可能无法装入。' });

  for (const { item } of plan.unplaced) {
    const oversized = rotationsOf(item).every((d) => d.length > suitcase.length || d.width > suitcase.width || d.height > suitcase.height);
    if (oversized) risks.push({ id: `oversized-${item.id}`, severity: 'critical', title: `${item.name} 尺寸越界`, message: '任意旋转方向都无法放入当前行李箱。', itemId: item.id });
    if (item.mustHave) risks.push({ id: `missing-${item.id}`, severity: 'critical', title: `必需品未装入：${item.name}`, message: '请调整清单或改用更大行李箱。', itemId: item.id });
  }

  for (const placement of plan.placements) {
    const item = byId.get(placement.itemId);
    if (!item) continue;
    if (item.weight >= suitcase.maxWeight * 0.25 && placement.z > suitcase.height * 0.5) {
      risks.push({ id: `high-${item.id}`, severity: 'warning', title: `${item.name} 重心偏高`, message: '将重物移到箱体底部，降低翻倒和挤压风险。', itemId: item.id });
    }
    if (item.fragile) {
      const hasLoadAbove = plan.placements.some((other) => other.itemId !== item.id
        && other.z >= placement.z + placement.dimensions.height
        && other.x < placement.x + placement.dimensions.length && other.x + other.dimensions.length > placement.x
        && other.y < placement.y + placement.dimensions.width && other.y + other.dimensions.width > placement.y);
      if (hasLoadAbove) risks.push({ id: `fragile-${item.id}`, severity: 'warning', title: `${item.name} 受到上方挤压`, message: '请移到上层或增加缓冲保护。', itemId: item.id });
    }
  }

  if (!risks.length) risks.push({ id: 'all-clear', severity: 'info', title: '装载状态良好', message: '重量、空间和摆放风险均在合理范围内。' });
  return risks;
}
