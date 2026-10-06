import { computed, reactive, ref } from 'vue';
import { createSampleSnapshot } from '../core/sample-data';
import { computeResult } from '../core/plan-service';
import { validateSuitcase } from '../core/packing-engine';
import type { CalcResult, PackingItem, PackingPlan, PlanMode, Risk, Suitcase } from '../core/models';
import type { PlannerRepository } from '../ports/planner-repository.port';
import type { PrintPort } from '../ports/print.port';

export interface PlannerDependencies { repository: PlannerRepository; printPort: PrintPort }

const PLAN_MODES: PlanMode[] = ['minimal', 'comfort', 'shopping'];
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const emptyPlan = (mode: PlanMode): PackingPlan => ({
  id: mode,
  name: mode === 'minimal' ? '精简版' : mode === 'comfort' ? '舒适版' : '购物版',
  placements: [],
  unplaced: [],
  totalWeight: 0,
  usedVolume: 0,
  capacityRatio: 0,
});

const emptyResult = (): CalcResult => ({
  suitcase: { length: 0, width: 0, height: 0, maxWeight: 0 },
  items: [],
  plans: {
    minimal: { plan: emptyPlan('minimal'), risks: [] },
    comfort: { plan: emptyPlan('comfort'), risks: [] },
    shopping: { plan: emptyPlan('shopping'), risks: [] },
  },
});

export function usePlanner({ repository, printPort }: PlannerDependencies) {
  const loaded = repository.load();
  const state = reactive(loaded.value);
  if (!state.result) {
    state.result = validateSuitcase(state.suitcase).length === 0
      ? computeResult(clone(state.suitcase), clone(state.items))
      : emptyResult();
    repository.save(clone(state));
  } else {
    // 断开结果与编辑输入的引用，后续编辑不得回写旧结果
    state.result = clone(state.result);
  }
  const notice = ref(loaded.warning ?? '');
  const inputErrors = computed(() => validateSuitcase(state.suitcase));

  const sameInputs = (result: CalcResult | null) => !!result
    && JSON.stringify({ suitcase: result.suitcase, items: result.items })
      === JSON.stringify({ suitcase: state.suitcase, items: state.items });

  const isStale = computed(() => inputErrors.value.length > 0 || !sameInputs(state.result));
  const selectedMode = computed<PlanMode>(() => PLAN_MODES.includes(state.selectedPlan) ? state.selectedPlan : 'minimal');
  const currentOutcome = computed(() => state.result!.plans[selectedMode.value]);
  const currentPlan = computed<PackingPlan>(() => currentOutcome.value.plan);
  const risks = computed<Risk[]>(() => currentOutcome.value.risks);
  const plans = computed(() => ({
    minimal: state.result!.plans.minimal.plan,
    comfort: state.result!.plans.comfort.plan,
    shopping: state.result!.plans.shopping.plan,
  }));
  const resultSuitcase = computed(() => state.result!.suitcase);
  const resultItems = computed(() => state.result!.items);
  const canPrint = computed(() => !isStale.value);

  const persist = () => repository.save(clone(state));
  const markEdited = () => { persist(); };

  function addItem(item: PackingItem) { state.items.push(item); markEdited(); }
  function updateItem(id: string, patch: Partial<PackingItem>) {
    const index = state.items.findIndex((item) => item.id === id);
    if (index >= 0) state.items[index] = { ...state.items[index], ...patch } as PackingItem;
    markEdited();
  }
  function removeItem(id: string) { state.items = state.items.filter((item) => item.id !== id); markEdited(); }
  function updateSuitcase(patch: Partial<Suitcase>) { Object.assign(state.suitcase, patch); markEdited(); }

  function regenerate() {
    if (inputErrors.value.length > 0) {
      notice.value = '箱体配置无效，请修正后再重新计算；当前展示的仍是上次计算结果。';
      return;
    }
    state.result = computeResult(clone(state.suitcase), clone(state.items));
    notice.value = '三套方案已重新计算';
    persist();
  }

  function selectPlan(mode: PlanMode) { state.selectedPlan = mode; persist(); }

  function resetSample() {
    const sample = createSampleSnapshot();
    state.suitcase = clone(sample.suitcase);
    state.items = clone(sample.items);
    state.selectedPlan = sample.selectedPlan;
    state.result = computeResult(clone(state.suitcase), clone(state.items));
    notice.value = '已恢复登机箱示例';
    persist();
  }

  function print() {
    if (!canPrint.value) {
      notice.value = '方案待更新，请先点击智能装箱重新计算后再打印。';
      return;
    }
    printPort.print();
  }

  return {
    state, notice, isStale, inputErrors, plans, currentPlan, currentOutcome, risks,
    resultSuitcase, resultItems, selectedMode, canPrint,
    addItem, updateItem, removeItem, updateSuitcase, regenerate, selectPlan, resetSample, print,
  };
}
