import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import App from '../App.vue';
import { LocalPlannerRepository } from '../../adapters/local-planner.repository';

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() { return this.data.size; }
  clear() { this.data.clear(); }
  getItem(key: string) { return this.data.get(key) ?? null; }
  key(index: number) { return [...this.data.keys()][index] ?? null; }
  removeItem(key: string) { this.data.delete(key); }
  setItem(key: string, value: string) { this.data.set(key, value); }
}

function render() {
  let printCount = 0;
  const wrapper = mount(App, { props: {
    repository: new LocalPlannerRepository(new MemoryStorage()),
    printPort: { print: () => { printCount += 1; } },
  } });
  return { wrapper, getPrintCount: () => printCount };
}

describe('Luggage planner App', () => {
  it('renders sample luggage and catches invalid dimensions', async () => {
    const { wrapper } = render();
    expect(wrapper.text()).toContain('行李箱空间规划师');
    expect(wrapper.text()).toContain('轻薄外套');
    await wrapper.get('[aria-label="行李箱长度"]').setValue('0');
    expect(wrapper.text()).toContain('行李箱长度必须大于 0');
  });

  it('adds and deletes an item', async () => {
    const { wrapper } = render();
    await wrapper.get('[aria-label="物品名称"]').setValue('新物品');
    await wrapper.get('[data-testid="item-editor"]').trigger('submit');
    expect(wrapper.text()).toContain('新物品');
    await wrapper.get('[aria-label="删除 新物品"]').trigger('click');
    expect(wrapper.text()).not.toContain('新物品');
  });

  it('selects a plan and highlights the same item in both projections', async () => {
    const { wrapper } = render();
    await wrapper.get('[data-plan="shopping"]').trigger('click');
    expect(wrapper.get('[data-plan="shopping"]').classes()).toContain('active');
    const jacket = wrapper.findAll('[data-item-id="jacket"]');
    expect(jacket.length).toBe(2);
    await jacket[0].trigger('click');
    expect(wrapper.findAll('[data-item-id="jacket"].selected')).toHaveLength(2);
  });

  it('delegates printing through the print port', async () => {
    const { wrapper, getPrintCount } = render();
    await wrapper.get('[data-testid="print-button"]').trigger('click');
    expect(getPrintCount()).toBe(1);
  });

  it('freezes result regions until recalculation after deleting a packed item', async () => {
    const { wrapper, getPrintCount } = render();
    expect(wrapper.text()).toContain('3.3');
    await wrapper.get('[aria-label="删除 轻薄外套"]').trigger('click');
    expect(wrapper.find('.item-list').text()).not.toContain('轻薄外套');
    expect(wrapper.findAll('[data-item-id="jacket"]')).toHaveLength(2);
    expect(wrapper.find('.print-sheet').text()).toContain('轻薄外套');
    expect(wrapper.text()).toContain('3.3');
    expect(wrapper.text()).toContain('方案待更新');
    expect(wrapper.get('[data-testid="stale-tag"]').text()).toContain('待更新');
    expect(wrapper.get('[data-testid="print-button"]').attributes('disabled')).toBeDefined();
    await wrapper.get('[data-testid="print-button"]').trigger('click');
    expect(getPrintCount()).toBe(0);
    await wrapper.get('[data-plan="minimal"]').trigger('click');
    expect(wrapper.findAll('[data-item-id="jacket"]')).toHaveLength(2);
    await wrapper.get('[data-testid="regenerate-button"]').trigger('click');
    expect(wrapper.findAll('[data-item-id="jacket"]')).toHaveLength(0);
    expect(wrapper.find('.print-sheet').text()).not.toContain('轻薄外套');
    expect(wrapper.text()).not.toContain('方案待更新');
    expect(wrapper.text()).toContain('规划已同步');
    expect(wrapper.get('[data-testid="print-button"]').attributes('disabled')).toBeUndefined();
  });

  it('keeps risks on the calculated basis when the weight limit changes', async () => {
    const { wrapper } = render();
    expect(wrapper.text()).not.toContain('接近承重上限');
    await wrapper.get('input[type="range"]').setValue('3.5');
    expect(wrapper.text()).not.toContain('接近承重上限');
    await wrapper.get('[data-testid="regenerate-button"]').trigger('click');
    expect(wrapper.text()).toContain('接近承重上限');
  });

  it('clears the highlight when the selected item is deleted and plans recalculated', async () => {
    const { wrapper } = render();
    await wrapper.findAll('[data-item-id="jacket"]')[0].trigger('click');
    expect(wrapper.findAll('[data-item-id="jacket"].selected')).toHaveLength(2);
    await wrapper.get('[aria-label="删除 轻薄外套"]').trigger('click');
    await wrapper.get('[data-testid="regenerate-button"]').trigger('click');
    expect(wrapper.findAll('.projection button.selected')).toHaveLength(0);
  });

  it('never marks invalid input as synced and keeps previous results', async () => {
    const { wrapper } = render();
    await wrapper.get('[aria-label="行李箱长度"]').setValue('0');
    expect(wrapper.text()).toContain('行李箱长度必须大于 0');
    expect(wrapper.text()).toContain('方案待更新');
    expect(wrapper.text()).not.toContain('规划已同步');
    expect(wrapper.get('[data-testid="regenerate-button"]').attributes('disabled')).toBeDefined();
    expect(wrapper.findAll('[data-item-id="jacket"]')).toHaveLength(2);
  });

  it('clears all results consistently after emptying the inventory and recalculating', async () => {
    const { wrapper } = render();
    for (const name of ['轻薄外套', '运动鞋', '微单相机', '洗漱包', '旅行读物', '伴手礼预留盒']) {
      await wrapper.get(`[aria-label="删除 ${name}"]`).trigger('click');
    }
    await wrapper.get('[data-testid="regenerate-button"]').trigger('click');
    expect(wrapper.findAll('.projection button')).toHaveLength(0);
    expect(wrapper.text()).toContain('规划已同步');
    expect(wrapper.text()).toContain('装载状态良好');
  });

  it('reloads persisted inputs as one consistent calculation', async () => {
    const storage = new MemoryStorage();
    const first = mount(App, { props: { repository: new LocalPlannerRepository(storage), printPort: { print() {} } } });
    await first.get('[aria-label="删除 轻薄外套"]').trigger('click');
    const second = mount(App, { props: { repository: new LocalPlannerRepository(storage), printPort: { print() {} } } });
    expect(second.find('.item-list').text()).not.toContain('轻薄外套');
    expect(second.findAll('[data-item-id="jacket"]')).toHaveLength(0);
    expect(second.find('.print-sheet').text()).not.toContain('轻薄外套');
    expect(second.text()).toContain('规划已同步');
  });
});
