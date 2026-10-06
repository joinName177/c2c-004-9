import { computed, reactive, ref } from 'vue';
import { createSampleSnapshot } from '../core/sample-data';
import { generatePlans } from '../core/plan-service';
import { detectRisks } from '../core/risk-engine';
import { validateSuitcase } from '../core/packing-engine';
import type { PackingItem, PackingSnapshot, PlanMode, Suitcase } from '../core/models';
import type { PlannerRepository } from '../ports/planner-repository.port';
import type { PrintPort } from '../ports/print.port';

export interface PlannerDependencies { repository: PlannerRepository; printPort: PrintPort }

/** 结果展示依据：上次成功计算时冻结的箱体与物品，与编辑中的输入严格隔离。 */
export interface ResultBasis { suitcase: Suitcase; items: PackingItem[] }

function freeze(source: PackingSnapshot): ResultBasis {
  return JSON.parse(JSON.stringify({ suitcase: source.suitcase, items: source.items })) as ResultBasis;
}

export function usePlanner({ repository, printPort }: PlannerDependencies) {
  const loaded = repository.load();
  const state = reactive<PackingSnapshot>(loaded.value);
  const notice = ref(loaded.warning ?? '');
  const isStale = ref(false);
  const basis = ref<ResultBasis>(freeze(state));
  const plans = ref(generatePlans(basis.value.suitcase, basis.value.items));
  const currentPlan = computed(() => plans.value[state.selectedPlan]);
  const risks = computed(() => detectRisks(currentPlan.value, basis.value.suitcase, basis.value.items));

  const save = () => repository.save(JSON.parse(JSON.stringify(state)) as PackingSnapshot);
  const markStale = () => { isStale.value = true; save(); };

  function addItem(item: PackingItem) { state.items.push(item); markStale(); }
  function updateItem(id: string, patch: Partial<PackingItem>) {
    const index = state.items.findIndex((item) => item.id === id);
    if (index >= 0) state.items[index] = { ...state.items[index], ...patch } as PackingItem;
    markStale();
  }
  function removeItem(id: string) { state.items = state.items.filter((item) => item.id !== id); markStale(); }
  function updateSuitcase(patch: Partial<Suitcase>) { Object.assign(state.suitcase, patch); markStale(); }

  function regenerate() {
    if (validateSuitcase(state.suitcase).length > 0) {
      isStale.value = true;
      notice.value = '行李箱尺寸或承重无效，已保留上次计算结果';
      return false;
    }
    const nextBasis = freeze(state);
    basis.value = nextBasis;
    plans.value = generatePlans(nextBasis.suitcase, nextBasis.items);
    isStale.value = false;
    notice.value = '三套方案已重新计算';
    save();
    return true;
  }

  function selectPlan(mode: PlanMode) { state.selectedPlan = mode; save(); }
  function resetSample() {
    const sample = createSampleSnapshot();
    Object.assign(state, sample);
    basis.value = freeze(state);
    plans.value = generatePlans(basis.value.suitcase, basis.value.items);
    isStale.value = false;
    notice.value = '已恢复登机箱示例';
    save();
  }
  function print() {
    if (isStale.value) { notice.value = '方案待更新，请重新计算后再打印'; return; }
    printPort.print();
  }

  return { state, notice, isStale, basis, plans, currentPlan, risks, addItem, updateItem, removeItem, updateSuitcase, regenerate, selectPlan, resetSample, print };
}
